import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

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

    // Get user's courses with progress
    const { data: coursesWithProgress, error: coursesError } = await supabaseClient
      .from('user_course_progress_view')
      .select('*')
      .eq('user_id', user.id);

    if (coursesError) {
      throw new Error(`Courses error: ${coursesError.message}`);
    }

    // Get learning analytics
    const { data: analytics, error: analyticsError } = await supabaseClient
      .from('user_learning_analytics_view')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (analyticsError && analyticsError.code !== 'PGRST116') {
      throw new Error(`Analytics error: ${analyticsError.message}`);
    }

    // Get recent activity
    const { data: recentActivity, error: activityError } = await supabaseClient
      .from('user_progress')
      .select(`
        *,
        courses (title, topic)
      `)
      .eq('user_id', user.id)
      .order('last_accessed', { ascending: false })
      .limit(10);

    if (activityError) {
      throw new Error(`Activity error: ${activityError.message}`);
    }

    // Calculate learning streaks and patterns
    const learningStreak = await calculateLearningStreak(supabaseClient, user.id);
    const weeklyProgress = await getWeeklyProgress(supabaseClient, user.id);

    return new Response(
      JSON.stringify({
        success: true,
        analytics: {
          overview: analytics || {
            total_courses: 0,
            completed_courses: 0,
            in_progress_courses: 0,
            total_time_spent: 0,
            average_progress: 0,
          },
          courses: coursesWithProgress || [],
          recent_activity: recentActivity || [],
          learning_streak: learningStreak,
          weekly_progress: weeklyProgress,
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error getting analytics:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function calculateLearningStreak(supabaseClient: any, userId: string): Promise<number> {
  const { data: progressData } = await supabaseClient
    .from('user_progress')
    .select('last_accessed')
    .eq('user_id', userId)
    .order('last_accessed', { ascending: false });

  if (!progressData || progressData.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const progress of progressData) {
    const accessDate = new Date(progress.last_accessed);
    accessDate.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.floor((today.getTime() - accessDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === streak) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

async function getWeeklyProgress(supabaseClient: any, userId: string): Promise<any[]> {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const { data: weeklyData } = await supabaseClient
    .from('user_progress')
    .select('last_accessed, time_spent, progress_percentage')
    .eq('user_id', userId)
    .gte('last_accessed', oneWeekAgo.toISOString());

  // Group by day and calculate daily totals
  const dailyProgress: { [key: string]: { time_spent: number; sessions: number } } = {};

  weeklyData?.forEach((item: any) => {
    const date = new Date(item.last_accessed).toDateString();
    if (!dailyProgress[date]) {
      dailyProgress[date] = { time_spent: 0, sessions: 0 };
    }
    dailyProgress[date].time_spent += item.time_spent || 0;
    dailyProgress[date].sessions += 1;
  });

  return Object.entries(dailyProgress).map(([date, data]) => ({
    date,
    ...data,
  }));
}