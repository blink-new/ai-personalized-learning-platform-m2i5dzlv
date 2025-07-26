import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CourseRequest {
  topic: string;
  context: string;
  knowledge_level: 'beginner' | 'intermediate' | 'advanced';
  learning_style: string;
  interests: string[];
  personality_traits: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get user from JWT
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { topic, context, knowledge_level, learning_style, interests, personality_traits }: CourseRequest = await req.json();

    // Validate required fields
    if (!topic || !context || !knowledge_level) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: topic, context, knowledge_level' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create personalized prompt based on user profile
    const personalizedPrompt = `
Create a comprehensive course on "${topic}" with the following specifications:

Context: ${context}
Knowledge Level: ${knowledge_level}
Learning Style: ${learning_style}
Interests: ${interests.join(', ')}
Personality Traits: ${personality_traits.join(', ')}

Please generate a structured course with:
1. Course title and description
2. Learning objectives (3-5 objectives)
3. Course outline with 5-8 modules
4. Detailed content for each module including:
   - Module title and description
   - Key concepts to cover
   - Practical exercises or examples
   - Assessment questions

Tailor the content to match the user's ${knowledge_level} level and ${learning_style} learning style.
Make it engaging and relevant to their interests: ${interests.join(', ')}.

Return the response as a JSON object with this structure:
{
  "title": "Course Title",
  "description": "Course description",
  "objectives": ["objective1", "objective2", ...],
  "modules": [
    {
      "title": "Module Title",
      "description": "Module description",
      "content": "Detailed module content",
      "exercises": ["exercise1", "exercise2", ...],
      "assessment": ["question1", "question2", ...]
    }
  ]
}
`;

    // Call OpenRouter API
    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENROUTER_API_KEY')}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://ulearn.ai',
        'X-Title': 'ULearn AI Platform',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          {
            role: 'system',
            content: 'You are an expert educational content creator. Generate comprehensive, engaging courses tailored to individual learning styles and knowledge levels. Always respond with valid JSON.'
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
    const courseContent = JSON.parse(aiResponse.choices[0].message.content);

    // Save course to database
    const { data: course, error: courseError } = await supabaseClient
      .from('courses')
      .insert({
        user_id: user.id,
        title: courseContent.title,
        description: courseContent.description,
        topic,
        context,
        knowledge_level,
        objectives: courseContent.objectives,
        total_modules: courseContent.modules.length,
        status: 'active',
        ai_generated: true,
        metadata: {
          learning_style,
          interests,
          personality_traits,
          generation_timestamp: new Date().toISOString(),
        }
      })
      .select()
      .single();

    if (courseError) {
      throw new Error(`Database error: ${courseError.message}`);
    }

    // Save course modules
    const moduleInserts = courseContent.modules.map((module: any, index: number) => ({
      course_id: course.id,
      title: module.title,
      description: module.description,
      content: module.content,
      order_index: index + 1,
      exercises: module.exercises || [],
      assessment_questions: module.assessment || [],
    }));

    const { error: modulesError } = await supabaseClient
      .from('course_modules')
      .insert(moduleInserts);

    if (modulesError) {
      throw new Error(`Modules error: ${modulesError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        course: {
          ...course,
          modules: courseContent.modules,
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error generating course:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});