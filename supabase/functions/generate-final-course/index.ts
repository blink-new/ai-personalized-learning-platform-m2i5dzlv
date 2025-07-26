import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface FinalCourseRequest {
  session_id: string;
  approved_outline: any;
  clerk_user_id: string;
}

const FINAL_COURSE_SYSTEM_PROMPT = `Full Self-Teaching Course Generation
Your task is to generate a fully detailed self-teaching course based on the approved course proposal and the following user requirements and constraints.

Variables (retain placeholders):
(1) Topic/Subject: {TOPIC}
(2) Context & Background: {CONTEXT}
(3) Current Knowledge Level of User: {KNOWLEDGE_LEVEL}
(4) User's Learning Goals: {LEARNING_GOALS}
(5) Preferred Duration: {PREFERRED_DURATION}
(6) Approved Course Outline: {COURSE_OUTLINE}

Instructions
Strict Adherence to Proposal

Use the provided {COURSE_OUTLINE} as the structure for the course.

Maintain the agreed number of modules, order, and depth as specified in the outline.

Only make minor adjustments (e.g., sequencing, examples) if absolutely necessary for logical flow; otherwise, request clarification.

Content Creation

For each module and lesson, generate:

A clear, descriptive title.

Concise learning objectives/outcomes aligned with {LEARNING_GOALS} and {KNOWLEDGE_LEVEL}.

Detailed explanations, structured logically and written accessibly for the user's background.

Diverse instructional methods and learning styles (e.g., concise readings, hands-on or practical tasks, relevant multimedia suggestions, interactive exercises, discussion prompts, or quizzes), as appropriate per section.

Real-world examples, analogies, or case studies where relevant.

At least one suggested assessment or self-evaluation activity per lesson/module.

End-of-lesson summary or key takeaway points.

Adjust the quantity and depth of content to fit {PREFERRED_DURATION}, balancing comprehensiveness with efficiency.

Give actionable study and progression advice (e.g., recommended pace, optional deeper learning).

References and Transparency

Cite all sources clearly at the end of each lesson and in a consolidated reference list at the end of the course.

Only use reputable, authoritative, and/or peer-reviewed sources.

Explicitly note any limitations, open questions, or areas of uncertainty.

Output Formatting

Present the course as a clear, hierarchical outline of modules and lessons.

Use bullet points, numbered lists, tables, or clear sections as needed for readability.

Include an introductory section summarizing the overall course aim, prerequisites (if any), and instructions for the learner.

Responsiveness to User Needs

Keep all language and instructional detail directly matched to {KNOWLEDGE_LEVEL} and {LEARNING_GOALS}.

Ensure tone and examples are appropriate for the user profile.`;

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

    const { session_id, approved_outline, clerk_user_id }: FinalCourseRequest = await req.json();

    // Validate required fields
    if (!session_id || !approved_outline || !clerk_user_id) {
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

    // Create personalized prompt for final course generation
    const personalizedPrompt = FINAL_COURSE_SYSTEM_PROMPT
      .replace(/{TOPIC}/g, session.topic)
      .replace(/{CONTEXT}/g, session.context)
      .replace(/{KNOWLEDGE_LEVEL}/g, session.knowledge_level)
      .replace(/{LEARNING_GOALS}/g, session.learning_goals)
      .replace(/{PREFERRED_DURATION}/g, session.preferred_duration)
      .replace(/{COURSE_OUTLINE}/g, JSON.stringify(approved_outline, null, 2));

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
            content: 'You are an expert educational content creator. Generate comprehensive, detailed course content based on approved outlines. Create engaging, practical learning materials with clear structure and actionable content.'
          },
          {
            role: 'user',
            content: personalizedPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 8000,
      }),
    });

    if (!openRouterResponse.ok) {
      throw new Error(`OpenRouter API error: ${openRouterResponse.statusText}`);
    }

    const aiResponse = await openRouterResponse.json();
    const courseContent = aiResponse.choices[0].message.content;

    // Create the course in the database
    const { data: course, error: courseError } = await supabaseClient
      .from('courses')
      .insert({
        clerk_user_id,
        title: approved_outline.title || session.topic,
        description: approved_outline.description || `A comprehensive course on ${session.topic}`,
        topic: session.topic,
        context: session.context,
        knowledge_level: session.knowledge_level,
        objectives: approved_outline.modules?.map((m: any) => m.title) || [],
        total_modules: approved_outline.modules?.length || 0,
        status: 'active',
        ai_generated: true,
        metadata: {
          session_id,
          approved_outline,
          generation_timestamp: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (courseError) {
      throw new Error(`Database error creating course: ${courseError.message}`);
    }

    // Create course modules based on the outline
    if (approved_outline.modules && Array.isArray(approved_outline.modules)) {
      const modules = approved_outline.modules.map((module: any, index: number) => ({
        course_id: course.id,
        title: module.title,
        description: module.description,
        content: courseContent, // For now, put all content in each module
        order_index: index + 1,
        exercises: [],
        assessment_questions: []
      }));

      const { error: modulesError } = await supabaseClient
        .from('course_modules')
        .insert(modules);

      if (modulesError) {
        console.error('Error creating modules:', modulesError);
      }
    }

    // Create initial progress record
    const { error: progressError } = await supabaseClient
      .from('user_progress')
      .insert({
        clerk_user_id,
        course_id: course.id,
        progress_percentage: 0,
        completed_modules: [],
        time_spent: 0,
        notes: ''
      });

    if (progressError) {
      console.error('Error creating progress record:', progressError);
    }

    // Update session status
    await supabaseClient
      .from('course_generation_sessions')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', session_id);

    return new Response(
      JSON.stringify({
        success: true,
        course: {
          id: course.id,
          title: course.title,
          description: course.description,
          content: courseContent,
          modules: approved_outline.modules || []
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error generating final course:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});