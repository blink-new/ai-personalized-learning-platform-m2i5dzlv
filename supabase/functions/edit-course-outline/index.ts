import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface EditRequest {
  session_id: string;
  user_message: string;
  current_outline: any;
  clerk_user_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { session_id, user_message, current_outline, clerk_user_id }: EditRequest = await req.json();

    // Validate required fields
    if (!session_id || !user_message || !current_outline || !clerk_user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the session to understand the context
    const { data: session, error: sessionError } = await supabaseClient
      .from('course_generation_sessions')
      .select('*')
      .eq('id', session_id)
      .eq('clerk_user_id', clerk_user_id)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Session not found or unauthorized' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get conversation history
    const { data: conversations } = await supabaseClient
      .from('course_conversations')
      .select('*')
      .eq('session_id', session_id)
      .order('created_at', { ascending: true });

    // Build conversation context
    let conversationContext = '';
    if (conversations && conversations.length > 0) {
      conversationContext = conversations.map(conv => 
        `${conv.message_type === 'user' ? 'User' : 'Assistant'}: ${conv.content}`
      ).join('\n\n');
    }

    // Create the edit prompt
    const editPrompt = `You are helping a user refine their course outline. Here's the context:

ORIGINAL COURSE REQUEST:
- Topic: ${session.topic}
- Context: ${session.context}
- Knowledge Level: ${session.knowledge_level}
- Learning Goals: ${session.learning_goals}
- Preferred Duration: ${session.preferred_duration}

CURRENT COURSE OUTLINE:
${JSON.stringify(current_outline, null, 2)}

CONVERSATION HISTORY:
${conversationContext}

USER'S NEW REQUEST:
${user_message}

Please update the course outline based on the user's request. Maintain the same JSON structure as the current outline, but modify the content according to their feedback. If they want to add modules, remove modules, change the focus, or adjust the difficulty, please make those changes while keeping the overall structure coherent.

Return the updated outline as a JSON object with the same structure as the current outline.`;

    // Call OpenRouter API with Mistral Small 3.2 24B
    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENROUTER_API_KEY')}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://ulearn.ai',
        'X-Title': 'ULearn AI Platform',
      },
      body: JSON.stringify({
        model: 'mistralai/mistral-small-3.2-24b-instruct:free',
        messages: [
          {
            role: 'system',
            content: 'You are an expert educational course designer. Help users refine their course outlines based on their feedback. Always respond with valid JSON in the same format as the input outline.'
          },
          {
            role: 'user',
            content: editPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!openRouterResponse.ok) {
      throw new Error(`OpenRouter API error: ${openRouterResponse.statusText}`);
    }

    const aiResponse = await openRouterResponse.json();
    let updatedOutline;
    
    try {
      updatedOutline = JSON.parse(aiResponse.choices[0].message.content);
    } catch (parseError) {
      // If JSON parsing fails, try to extract JSON from the response
      const content = aiResponse.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        updatedOutline = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse AI response as JSON');
      }
    }

    // Save the conversation
    await supabaseClient
      .from('course_conversations')
      .insert([
        {
          session_id,
          message_type: 'user',
          content: user_message
        },
        {
          session_id,
          message_type: 'assistant',
          content: `I've updated your course outline based on your feedback. Here are the key changes I made:\n\n${JSON.stringify(updatedOutline, null, 2)}`
        }
      ]);

    // Update the session with the new outline
    await supabaseClient
      .from('course_generation_sessions')
      .update({
        current_outline: updatedOutline,
        updated_at: new Date().toISOString()
      })
      .eq('id', session_id);

    return new Response(
      JSON.stringify({
        success: true,
        updated_outline: updatedOutline
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error editing course outline:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});