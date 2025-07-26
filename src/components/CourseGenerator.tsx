import { useState, useEffect } from 'react'
import { ArrowLeft, Sparkles, BookOpen, Target, Clock, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Label } from './ui/label'
import { Badge } from './ui/badge'
import { useUser } from '@clerk/clerk-react'
import { supabase, api, ensureUserExists } from '../lib/supabase'
import { CourseOutlineReview } from './CourseOutlineReview'

interface CourseGeneratorProps {
  onBack: () => void
  onCourseGenerated: (course: any) => void
}

export function CourseGenerator({ onBack, onCourseGenerated }: CourseGeneratorProps) {
  const [step, setStep] = useState(1)
  const [generating, setGenerating] = useState(false)
  const [courseData, setCourseData] = useState({
    topic: '',
    context: '',
    currentLevel: '',
    goals: '',
    duration: '',
    difficulty: ''
  })
  const [generatedOutline, setGeneratedOutline] = useState<any>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)

  const knowledgeLevels = [
    { value: 'beginner', label: 'Beginner', description: 'Little to no experience' },
    { value: 'intermediate', label: 'Intermediate', description: 'Some experience and understanding' },
    { value: 'advanced', label: 'Advanced', description: 'Strong foundation and experience' },
    { value: 'expert', label: 'Expert', description: 'Deep expertise, looking to expand' }
  ]

  const durations = [
    { value: '1-2', label: '1-2 hours', description: 'Quick overview' },
    { value: '3-5', label: '3-5 hours', description: 'Comprehensive introduction' },
    { value: '6-10', label: '6-10 hours', description: 'In-depth learning' },
    { value: '10+', label: '10+ hours', description: 'Mastery-focused' }
  ]

  const { user: clerkUser } = useUser()
  const [userProfile, setUserProfile] = useState<any>(null)

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        if (!clerkUser) return

        const supabaseUser = await ensureUserExists(clerkUser)
        if (!supabaseUser) return

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('clerk_user_id', clerkUser.id)
          .single()

        setUserProfile(profile)
      } catch (error) {
        console.error('Error loading user profile:', error)
      }
    }

    if (clerkUser) {
      loadUserProfile()
    }
  }, [clerkUser])

  const generateOutline = async () => {
    setGenerating(true)
    try {
      if (!clerkUser) {
        alert('Please sign in to generate a course.')
        return
      }

      const supabaseUser = await ensureUserExists(clerkUser)
      if (!supabaseUser) {
        alert('Failed to set up user account. Please try again.')
        return
      }

      // Prepare outline generation data
      const outlineData = {
        topic: courseData.topic,
        context: courseData.context,
        knowledge_level: courseData.currentLevel,
        learning_goals: courseData.goals,
        preferred_duration: courseData.duration,
        clerk_user_id: clerkUser.id
      }

      // Call the Supabase Edge Function to generate course outline
      const result = await api.generateCourseOutline(outlineData)

      if (result.success) {
        setGeneratedOutline(result.outline)
        setSessionId(result.session_id)
        setStep(4) // Move to outline review step
        alert('Course outline generated! Review your personalized course outline and make any changes needed.')
      } else {
        throw new Error(result.error || 'Failed to generate course outline')
      }
    } catch (error) {
      console.error('Failed to generate outline:', error)
      alert(error instanceof Error ? error.message : 'Failed to generate course outline. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const canProceed = () => {
    switch (step) {
      case 1:
        return courseData.topic.trim() && courseData.context.trim()
      case 2:
        return courseData.currentLevel && courseData.goals.trim()
      case 3:
        return courseData.duration
      default:
        return false
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Courses
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Generate AI Course</h1>
          <p className="text-muted-foreground mt-2">
            Create a personalized learning experience tailored to your needs
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      {step <= 3 && (
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-4">
            {[1, 2, 3].map((stepNum) => (
              <div key={stepNum} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= stepNum
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {stepNum}
                </div>
                <span
                  className={`text-sm ${
                    step >= stepNum ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {stepNum === 1 && 'Topic & Context'}
                  {stepNum === 2 && 'Knowledge & Goals'}
                  {stepNum === 3 && 'Preferences'}
                </span>
                {stepNum < 3 && (
                  <div
                    className={`w-8 h-0.5 ${
                      step > stepNum ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step Content */}
      {step === 4 && generatedOutline && sessionId ? (
        <CourseOutlineReview
          outline={generatedOutline}
          sessionId={sessionId}
          onBack={() => setStep(3)}
          onCreateCourse={onCourseGenerated}
        />
      ) : (
        <div className="max-w-2xl mx-auto">
          {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                What do you want to learn?
              </CardTitle>
              <CardDescription>
                Tell us about the topic and provide some context
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="topic">Topic or Subject</Label>
                <Input
                  id="topic"
                  placeholder="e.g., Machine Learning, React Development, Data Analysis"
                  value={courseData.topic}
                  onChange={(e) => setCourseData({ ...courseData, topic: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="context">Context & Background</Label>
                <Textarea
                  id="context"
                  placeholder="Provide context about why you want to learn this, what you plan to do with it, or any specific areas you're interested in..."
                  value={courseData.context}
                  onChange={(e) => setCourseData({ ...courseData, context: e.target.value })}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Your Knowledge & Goals
              </CardTitle>
              <CardDescription>
                Help us understand your current level and objectives
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Current Knowledge Level</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  {knowledgeLevels.map((level) => (
                    <div
                      key={level.value}
                      onClick={() => setCourseData({ ...courseData, currentLevel: level.value })}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        courseData.currentLevel === level.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <h3 className="font-medium">{level.label}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{level.description}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="goals">Learning Goals</Label>
                <Textarea
                  id="goals"
                  placeholder="What do you want to achieve? What specific skills or knowledge are you looking to gain?"
                  value={courseData.goals}
                  onChange={(e) => setCourseData({ ...courseData, goals: e.target.value })}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Course Preferences
              </CardTitle>
              <CardDescription>
                Customize the course structure to fit your schedule
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Preferred Duration</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  {durations.map((duration) => (
                    <div
                      key={duration.value}
                      onClick={() => setCourseData({ ...courseData, duration: duration.value })}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        courseData.duration === duration.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <h3 className="font-medium">{duration.label}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{duration.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Course Summary */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-medium mb-3">Course Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Topic:</span>
                    <span>{courseData.topic}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Level:</span>
                    <Badge variant="secondary" className="capitalize">
                      {courseData.currentLevel}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration:</span>
                    <span>{courseData.duration} hours</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
            disabled={step === 1}
          >
            Previous
          </Button>
          
          {step < 3 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="gap-2"
            >
              Next
              <ArrowLeft className="h-4 w-4 rotate-180" />
            </Button>
          ) : (
            <Button
              onClick={generateOutline}
              disabled={!canProceed() || generating}
              className="gap-2"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {generating ? 'Generating Outline...' : 'Generate Course Outline'}
            </Button>
          )}
        </div>
        </div>
      )}
    </div>
  )
}