import { useState } from 'react'
import { ArrowLeft, BookOpen, CheckCircle, Circle, Clock, Target } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { Separator } from './ui/separator'

interface CourseContentProps {
  course: any
  onBack: () => void
}

export function CourseContent({ course, onBack }: CourseContentProps) {
  const [currentLesson, setCurrentLesson] = useState(0)
  const [completedLessons, setCompletedLessons] = useState<number[]>([])

  // Mock lesson data - in real app this would come from the course content
  const lessons = [
    {
      id: 1,
      title: 'Introduction and Fundamentals',
      duration: '15 min',
      content: `# Introduction to ${course?.title || 'the Topic'}

Welcome to your personalized AI-generated course! This lesson will introduce you to the fundamental concepts and set the foundation for your learning journey.

## What You'll Learn

- Core concepts and terminology
- Historical context and evolution
- Why this topic is important
- Real-world applications

## Key Concepts

### Concept 1: Foundation
Understanding the basic principles that underpin this subject area.

### Concept 2: Applications
How these concepts are applied in practice.

### Concept 3: Future Trends
Where this field is heading and emerging opportunities.

## Practice Exercise

Try to identify three ways this topic relates to your current interests or goals.

---

*This content has been personalized based on your learning profile and preferences.*`
    },
    {
      id: 2,
      title: 'Core Principles and Theory',
      duration: '25 min',
      content: `# Core Principles and Theory

Now that you understand the basics, let's dive deeper into the theoretical foundations.

## Learning Objectives

By the end of this lesson, you will:
- Understand the key theoretical frameworks
- Be able to explain core principles
- Recognize patterns and relationships

## Theoretical Framework

### Framework 1
Detailed explanation of the first major theoretical approach...

### Framework 2
How this builds upon the previous concepts...

## Practical Applications

Let's see how these theories apply in real scenarios...`
    },
    {
      id: 3,
      title: 'Practical Applications',
      duration: '30 min',
      content: `# Practical Applications

Time to put theory into practice! This lesson focuses on hands-on application of the concepts you've learned.

## Hands-On Exercises

### Exercise 1: Basic Implementation
Step-by-step guide to your first practical application...

### Exercise 2: Problem Solving
Apply your knowledge to solve a real-world problem...

## Case Studies

Let's examine how professionals use these concepts in their work...`
    }
  ]

  const toggleLessonComplete = (lessonIndex: number) => {
    if (completedLessons.includes(lessonIndex)) {
      setCompletedLessons(completedLessons.filter(i => i !== lessonIndex))
    } else {
      setCompletedLessons([...completedLessons, lessonIndex])
    }
  }

  const progressPercentage = (completedLessons.length / lessons.length) * 100

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Courses
            </Button>
          </div>
          
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground mb-2">
                {course?.title || 'Course Title'}
              </h1>
              <p className="text-muted-foreground mb-4">
                {course?.description || 'Course description'}
              </p>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {course?.duration || '4 hours'}
                </div>
                <div className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  {lessons.length} lessons
                </div>
                <Badge className={getDifficultyColor(course?.difficulty)}>
                  {course?.difficulty || 'Intermediate'}
                </Badge>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-2xl font-bold text-foreground">
                {Math.round(progressPercentage)}%
              </div>
              <div className="text-sm text-muted-foreground">Complete</div>
            </div>
          </div>
          
          <div className="mt-4">
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar - Lesson List */}
        <div className="w-80 border-r border-border bg-card">
          <div className="p-4">
            <h2 className="font-semibold text-foreground mb-4">Course Content</h2>
            <div className="space-y-2">
              {lessons.map((lesson, index) => (
                <div
                  key={lesson.id}
                  onClick={() => setCurrentLesson(index)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    currentLesson === index
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleLessonComplete(index)
                      }}
                      className="mt-0.5"
                    >
                      {completedLessons.includes(index) ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-medium text-sm ${
                        currentLesson === index ? 'text-primary-foreground' : 'text-foreground'
                      }`}>
                        {lesson.title}
                      </h3>
                      <p className={`text-xs mt-1 ${
                        currentLesson === index ? 'text-primary-foreground/80' : 'text-muted-foreground'
                      }`}>
                        {lesson.duration}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="p-8">
            <div className="max-w-4xl mx-auto">
              {/* Lesson Header */}
              <div className="mb-8">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <span>Lesson {currentLesson + 1} of {lessons.length}</span>
                  <Separator orientation="vertical" className="h-4" />
                  <span>{lessons[currentLesson]?.duration}</span>
                </div>
                <h1 className="text-3xl font-bold text-foreground">
                  {lessons[currentLesson]?.title}
                </h1>
              </div>

              {/* Lesson Content */}
              <Card>
                <CardContent className="p-8">
                  <div className="prose prose-slate max-w-none">
                    <div 
                      className="text-foreground leading-relaxed"
                      style={{ whiteSpace: 'pre-line' }}
                    >
                      {lessons[currentLesson]?.content}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Navigation */}
              <div className="flex justify-between items-center mt-8">
                <Button
                  variant="outline"
                  onClick={() => setCurrentLesson(Math.max(0, currentLesson - 1))}
                  disabled={currentLesson === 0}
                >
                  Previous Lesson
                </Button>
                
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    onClick={() => toggleLessonComplete(currentLesson)}
                    className="gap-2"
                  >
                    {completedLessons.includes(currentLesson) ? (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Completed
                      </>
                    ) : (
                      <>
                        <Circle className="h-4 w-4" />
                        Mark Complete
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={() => setCurrentLesson(Math.min(lessons.length - 1, currentLesson + 1))}
                    disabled={currentLesson === lessons.length - 1}
                  >
                    Next Lesson
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}