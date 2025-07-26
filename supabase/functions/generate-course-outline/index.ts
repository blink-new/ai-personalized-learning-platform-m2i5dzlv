import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface OutlineRequest {
  topic: string;
  context: string;
  knowledge_level: string;
  learning_goals: string;
  preferred_duration: string;
  clerk_user_id: string;
}

const OUTLINE_SYSTEM_PROMPT = `Research & Adaptive Course Overview Generation
Your task is to conduct in-depth, accurate research on a specified topic and propose a structured, learner-centered self-teaching course. The research and proposal must strictly adhere to the following guidelines:

Variables (retain as placeholders):
(1) Topic/Subject: {TOPIC}
(2) Context & Background: {CONTEXT}
(3) Current Knowledge Level of User: {KNOWLEDGE_LEVEL}
(4) User's Learning Goals: {LEARNING_GOALS}
(5) Preferred Duration: {PREFERRED_DURATION}

Possible options: 1) 1–2 hours, 2) 3–5 hours, 3) 6–10 hours, 4) 10+ hours

Instructions
Research Approach

Search for comprehensive, up-to-date, and accurate information on {TOPIC}, prioritizing academically reputable, trusted, and authoritative sources that fit {CONTEXT}.

Favor primary sources, recent peer-reviewed studies, and educational websites.

Document all sources clearly for fact verification.

User Adaptation

Adapt the depth, detail, and terminology of all course content to suit {KNOWLEDGE_LEVEL}.

Focus material and module selection to support {LEARNING_GOALS}.

Use {PREFERRED_DURATION} as a constraint to determine the scope and depth of coverage, ensuring the content fits the allotted timeframe while maximizing relevance.

Course Overview/Proposal (Step 1)

Design a proposed overview of the self-teaching course, outlining its structure before generating the full content.

The overview/proposal must include:

Working course title and high-level description.

A modular breakdown (e.g., sections, lessons, or topics/modules to be covered).

For each module: a brief summary, rationale for inclusion, and how it helps fulfill {LEARNING_GOALS}.

Clear alignment of depth/detail to fit {PREFERRED_DURATION}.

Clear statement that this is a review phase for the user to request changes before course creation.

Present the proposed structure as a list or table for easy review.

Transparency & Trust

Clearly cite all key sources found in the overview.

Note any significant gaps, open questions, or areas where source confidence is limited.

IMPORTANT: Return your response as a JSON object with this exact structure:
{
  "title": "Course Title",
  "description": "High-level course description",
  "duration": "Expected duration",
  "modules": [
    {
      "title": "Module Title",
      "description": "Module description",
      "rationale": "Why this module is included and how it helps fulfill learning goals",
      "topics": ["Topic 1", "Topic 2", "Topic 3"]
    }
  ],
  "sources": ["Source 1", "Source 2", "Source 3"],
  "notes": "Any gaps, limitations, or areas of uncertainty",
  "review_message": "Clear statement that this is a review phase for the user to request changes before course creation"
}`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key for full access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { topic, context, knowledge_level, learning_goals, preferred_duration, clerk_user_id }: OutlineRequest = await req.json();

    // Validate required fields
    if (!topic || !context || !knowledge_level || !learning_goals || !preferred_duration || !clerk_user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create personalized prompt
    const personalizedPrompt = OUTLINE_SYSTEM_PROMPT
      .replace(/{TOPIC}/g, topic)
      .replace(/{CONTEXT}/g, context)
      .replace(/{KNOWLEDGE_LEVEL}/g, knowledge_level)
      .replace(/{LEARNING_GOALS}/g, learning_goals)
      .replace(/{PREFERRED_DURATION}/g, preferred_duration);

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
            content: 'You are an expert educational researcher and course designer. Generate comprehensive, well-researched course outlines. Always respond with valid JSON in the exact format requested.'
          },
          {
            role: 'user',
            content: personalizedPrompt
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
    let courseOutline;
    
    try {
      courseOutline = JSON.parse(aiResponse.choices[0].message.content);
    } catch (parseError) {
      // If JSON parsing fails, try to extract JSON from the response
      const content = aiResponse.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        courseOutline = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse AI response as JSON');
      }
    }

    // Create course generation session
    const { data: session, error: sessionError } = await supabaseClient
      .from('course_generation_sessions')
      .insert({
        clerk_user_id,
        topic,
        context,
        knowledge_level,
        learning_goals,
        preferred_duration,
        current_outline: courseOutline,
        status: 'outline_review'
      })
      .select()
      .single();

    if (sessionError) {
      throw new Error(`Database error: ${sessionError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        session_id: session.id,
        outline: courseOutline
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error generating course outline:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});