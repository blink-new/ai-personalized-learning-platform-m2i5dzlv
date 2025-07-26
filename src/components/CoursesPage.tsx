import { useState, useEffect } from 'react'
import { Plus, BookOpen, Clock, Star, Play } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { supabase } from '../lib/supabase'

interface CoursesPageProps {
  onGenerateCourse: () => void
  onViewCourse: (course: any) => void
}

export function CoursesPage({ onGenerateCourse, onViewCourse }: CoursesPageProps) {
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadCourses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data: userCourses, error } = await supabase
        .from('courses')
        .select(`
          *,
          user_progress (
            progress_percentage,
            time_spent,
            last_accessed
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading courses:', error)
      } else {
        // Transform the data to match the expected format
        const transformedCourses = userCourses?.map(course => ({
          id: course.id,
          title: course.title,
          description: course.description,
          topic: course.topic,
          difficulty: course.knowledge_level,
          duration: `${course.total_modules} modules`,
          progress: course.user_progress?.[0]?.progress_percentage || 0,
          lessons: course.total_modules,
          createdAt: course.created_at,
          status: course.status
        })) || []
        
        setCourses(transformedCourses)
      }
    } catch (error) {
      console.error('Failed to load courses:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCourses()
  }, [])

  const mockCourses = [
    {
      id: '1',
      title: 'Introduction to Machine Learning',
      description: 'Learn the fundamentals of ML algorithms and applications',
      topic: 'Machine Learning',
      difficulty: 'Beginner',
      duration: '4 hours',
      progress: 65,
      lessons: 12,
      createdAt: new Date().toISOString()
    },
    {
      id: '2',
      title: 'Advanced React Patterns',
      description: 'Master advanced React concepts and design patterns',
      topic: 'React',
      difficulty: 'Advanced',
      duration: '6 hours',
      progress: 30,
      lessons: 18,
      createdAt: new Date().toISOString()
    },
    {
      id: '3',
      title: 'Data Structures & Algorithms',
      description: 'Essential CS concepts for technical interviews',
      topic: 'Computer Science',
      difficulty: 'Intermediate',
      duration: '8 hours',
      progress: 0,
      lessons: 24,
      createdAt: new Date().toISOString()
    }
  ]

  const displayCourses = courses.length > 0 ? courses : mockCourses

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner':
        return 'bg-green-100 text-green-800'
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800'
      case 'advanced':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Your Courses</h1>
          <p className="text-muted-foreground mt-2">
            AI-generated courses tailored to your learning style
          </p>
        </div>
        <Button onClick={onGenerateCourse} className="gap-2">
          <Plus className="h-4 w-4" />
          Generate New Course
        </Button>
      </div>

      {/* Courses Grid */}
      {displayCourses.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No courses yet</h3>
          <p className="text-muted-foreground mb-6">
            Generate your first AI-powered course to get started
          </p>
          <Button onClick={onGenerateCourse} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Your First Course
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayCourses.map((course) => (
            <Card key={course.id} className="hover:shadow-lg transition-shadow cursor-pointer group">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      {course.title}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {course.description}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <Badge variant="secondary">{course.topic}</Badge>
                  <Badge className={getDifficultyColor(course.difficulty)}>
                    {course.difficulty}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Course Stats */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {course.duration}
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      {course.lessons} lessons
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {course.progress > 0 && (
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{course.progress}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${course.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  <Button
                    onClick={() => onViewCourse(course)}
                    className="w-full gap-2"
                    variant={course.progress > 0 ? "default" : "outline"}
                  >
                    <Play className="h-4 w-4" />
                    {course.progress > 0 ? 'Continue Learning' : 'Start Course'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}