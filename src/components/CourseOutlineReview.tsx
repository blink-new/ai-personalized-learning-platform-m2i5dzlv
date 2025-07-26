import { useState } from 'react'
import { ArrowLeft, MessageSquare, Sparkles, Loader2, Send, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Textarea } from './ui/textarea'
import { ScrollArea } from './ui/scroll-area'
import { api } from '../lib/supabase'
import { toast } from '../hooks/use-toast'

interface CourseOutlineReviewProps {
  outline: any
  sessionId: string
  onBack: () => void
  onCreateCourse: (outline: any) => void
}

export function CourseOutlineReview({ outline, sessionId, onBack, onCreateCourse }: CourseOutlineReviewProps) {
  const [currentOutline, setCurrentOutline] = useState(outline)
  const [isEditing, setIsEditing] = useState(false)
  const [userMessage, setUserMessage] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [conversationHistory, setConversationHistory] = useState<Array<{
    role: 'user' | 'assistant'
    content: string
    timestamp: string
  }>>([])

  const handleRequestChanges = () => {
    setIsEditing(true)
  }

  const handleSendMessage = async () => {
    if (!userMessage.trim() || isProcessing) return

    setIsProcessing(true)
    const newUserMessage = {
      role: 'user' as const,
      content: userMessage,
      timestamp: new Date().toISOString()
    }

    setConversationHistory(prev => [...prev, newUserMessage])
    setUserMessage('')

    try {
      const result = await api.editCourseOutline({
        session_id: sessionId,
        user_message: userMessage,
        current_outline: currentOutline
      })

      if (result.success) {
        setCurrentOutline(result.outline)
        
        const assistantMessage = {
          role: 'assistant' as const,
          content: 'I\'ve updated the course outline based on your feedback. Please review the changes above.',
          timestamp: new Date().toISOString()
        }
        
        setConversationHistory(prev => [...prev, assistantMessage])
        
        toast({
          title: "Outline updated",
          description: "The course outline has been revised based on your feedback.",
        })
      }
    } catch (error) {
      console.error('Failed to edit outline:', error)
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update outline. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCreateCourse = async () => {
    setIsCreating(true)
    try {
      const result = await api.generateFinalCourse({
        session_id: sessionId,
        approved_outline: currentOutline
      })

      if (result.success) {
        toast({
          title: "Course created successfully!",
          description: `Your personalized course "${result.course.title}" is ready.`,
        })
        onCreateCourse(result.course)
      }
    } catch (error) {
      console.error('Failed to create course:', error)
      toast({
        title: "Course creation failed",
        description: error instanceof Error ? error.message : "Failed to create course. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Course Outline Review</h1>
          <p className="text-muted-foreground mt-2">
            Review and refine your AI-generated course outline
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Course Outline */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                {currentOutline.title}
              </CardTitle>
              <CardDescription>
                {currentOutline.description}
              </CardDescription>
              <div className="flex gap-2 mt-2">
                <Badge variant="secondary">{currentOutline.duration}</Badge>
                <Badge variant="outline">{currentOutline.modules?.length || 0} modules</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Modules */}
              <div>
                <h3 className="font-semibold mb-4">Course Modules</h3>
                <div className="space-y-4">
                  {currentOutline.modules?.map((module: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{module.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{module.description}</p>
                          {module.rationale && (
                            <p className="text-xs text-muted-foreground mt-2 italic">
                              <strong>Why this module:</strong> {module.rationale}
                            </p>
                          )}
                          {module.topics && module.topics.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {module.topics.map((topic: string, topicIndex: number) => (
                                <Badge key={topicIndex} variant="outline" className="text-xs">
                                  {topic}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sources */}
              {currentOutline.sources && currentOutline.sources.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Key Sources</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {currentOutline.sources.map((source: string, index: number) => (
                      <li key={index}>• {source}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Notes */}
              {currentOutline.notes && (
                <div>
                  <h3 className="font-semibold mb-2">Important Notes</h3>
                  <p className="text-sm text-muted-foreground">{currentOutline.notes}</p>
                </div>
              )}

              {/* Review Message */}
              {currentOutline.review_message && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">{currentOutline.review_message}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={handleRequestChanges}
              className="gap-2"
              disabled={isCreating}
            >
              <MessageSquare className="h-4 w-4" />
              Request Changes
            </Button>
            
            <Button
              onClick={handleCreateCourse}
              disabled={isCreating}
              className="gap-2"
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {isCreating ? 'Creating Course...' : 'Create Course'}
            </Button>
          </div>
        </div>

        {/* Chat Interface */}
        {isEditing && (
          <div className="lg:col-span-1">
            <Card className="h-[600px] flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Refine Outline
                </CardTitle>
                <CardDescription>
                  Chat with AI to make changes to your course outline
                </CardDescription>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col">
                {/* Conversation History */}
                <ScrollArea className="flex-1 mb-4">
                  <div className="space-y-4">
                    {conversationHistory.length === 0 && (
                      <div className="text-center text-muted-foreground text-sm py-8">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Start a conversation to refine your course outline.</p>
                        <p className="mt-1">For example: "Add more practical exercises" or "Make module 2 more beginner-friendly"</p>
                      </div>
                    )}
                    
                    {conversationHistory.map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-foreground'
                          }`}
                        >
                          {message.content}
                        </div>
                      </div>
                    ))}
                    
                    {isProcessing && (
                      <div className="flex justify-start">
                        <div className="bg-muted text-foreground rounded-lg px-3 py-2 text-sm flex items-center gap-2">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Updating outline...
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Describe the changes you'd like to make..."
                    value={userMessage}
                    onChange={(e) => setUserMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    rows={3}
                    disabled={isProcessing}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!userMessage.trim() || isProcessing}
                    size="sm"
                    className="self-end"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}