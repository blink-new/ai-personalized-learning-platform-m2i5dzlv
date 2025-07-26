import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ProgressUpdate {
  course_id: string;
  module_id?: string;
  progress_percentage: number;
  completed_modules?: string[];
  time_spent?: number;
  notes?: string;
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

    const { course_id, module_id, progress_percentage, completed_modules, time_spent, notes }: ProgressUpdate = await req.json();

    // Validate required fields
    if (!course_id || progress_percentage === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: course_id, progress_percentage' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update or insert progress record
    const { data: existingProgress } = await supabaseClient
      .from('user_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', course_id)
      .single();

    let progressData;

    if (existingProgress) {
      // Update existing progress
      const { data, error } = await supabaseClient
        .from('user_progress')
        .update({
          progress_percentage: Math.max(existingProgress.progress_percentage, progress_percentage),
          completed_modules: completed_modules || existingProgress.completed_modules,
          time_spent: (existingProgress.time_spent || 0) + (time_spent || 0),
          last_accessed: new Date().toISOString(),
          notes: notes || existingProgress.notes,
        })
        .eq('user_id', user.id)
        .eq('course_id', course_id)
        .select()
        .single();

      if (error) throw error;
      progressData = data;
    } else {
      // Create new progress record
      const { data, error } = await supabaseClient
        .from('user_progress')
        .insert({
          user_id: user.id,
          course_id,
          progress_percentage,
          completed_modules: completed_modules || [],
          time_spent: time_spent || 0,
          notes: notes || '',
        })
        .select()
        .single();

      if (error) throw error;
      progressData = data;
    }

    // If module_id is provided, update module-specific progress
    if (module_id) {
      await supabaseClient
        .from('module_progress')
        .upsert({
          user_id: user.id,
          course_id,
          module_id,
          completed: progress_percentage >= 100,
          time_spent: time_spent || 0,
          last_accessed: new Date().toISOString(),
        });
    }

    // Update course completion status if 100%
    if (progress_percentage >= 100) {
      await supabaseClient
        .from('courses')
        .update({
          completed_at: new Date().toISOString(),
          status: 'completed'
        })
        .eq('id', course_id)
        .eq('user_id', user.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        progress: progressData,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error updating progress:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});