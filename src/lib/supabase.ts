import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface UserProfile {
  id: string
  clerk_user_id: string
  display_name: string | null
  email: string
  learning_style: string | null
  interests: string[]
  personality_traits: string[]
  preferred_difficulty: string | null
  goals: string | null
  timezone: string | null
  language: string
  created_at: string
  updated_at: string
}

export interface Course {
  id: string
  clerk_user_id: string
  title: string
  description: string
  topic: string
  context: string
  knowledge_level: string
  objectives: string[]
  total_modules: number
  status: string
  ai_generated: boolean
  metadata: any
  created_at: string
  updated_at: string
  completed_at: string | null
}

export interface CourseModule {
  id: string
  course_id: string
  title: string
  description: string
  content: string
  order_index: number
  exercises: string[]
  assessment_questions: string[]
  created_at: string
  updated_at: string
}

// Helper function to ensure user exists in Supabase
export async function ensureUserExists(clerkUser: any) {
  if (!clerkUser) return null
  
  const { data: existingUser } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('clerk_user_id', clerkUser.id)
    .single()
  
  if (existingUser) {
    return existingUser
  }
  
  // Create user if doesn't exist
  const { data: newUser, error } = await supabase
    .from('user_profiles')
    .insert({
      clerk_user_id: clerkUser.id,
      email: clerkUser.emailAddresses?.[0]?.emailAddress || '',
      display_name: clerkUser.firstName || clerkUser.emailAddresses?.[0]?.emailAddress || 'User',
      interests: [],
      personality_traits: [],
      language: 'en',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error creating user:', error)
    return null
  }
  
  return newUser
}

// API helper functions
export const api = {
  async generateCourseOutline(data: {
    topic: string;
    context: string;
    knowledge_level: string;
    learning_goals: string;
    preferred_duration: string;
    clerk_user_id: string;
  }) {
    const response = await fetch(`${supabaseUrl}/functions/v1/generate-course-outline`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify(data)
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to generate course outline')
    }
    
    return response.json()
  },

  async editCourseOutline(data: {
    session_id: string;
    user_message: string;
    current_outline: any;
    clerk_user_id: string;
  }) {
    const response = await fetch(`${supabaseUrl}/functions/v1/edit-course-outline`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify(data)
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to edit course outline')
    }
    
    return response.json()
  },

  async generateFinalCourse(data: {
    session_id: string;
    approved_outline: any;
    clerk_user_id: string;
  }) {
    const response = await fetch(`${supabaseUrl}/functions/v1/generate-final-course`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify(data)
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to generate final course')
    }
    
    return response.json()
  }
}