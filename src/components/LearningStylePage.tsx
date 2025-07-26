import { useState, useEffect, useCallback } from 'react'
import { Brain, User, Target, Clock, Globe, Edit3, Save, X } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Badge } from './ui/badge'
import { useUser } from '@clerk/clerk-react'
import { supabase, ensureUserExists, UserProfile } from '../lib/supabase'

export function LearningStylePage() {
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { user: clerkUser } = useUser()
  
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    display_name: '',
    learning_style: '',
    interests: [],
    personality_traits: [],
    preferred_difficulty: '',
    goals: '',
    timezone: '',
    language: 'en'
  })

  const [editForm, setEditForm] = useState<Partial<UserProfile>>({})

  const learningStyles = [
    { value: 'visual', label: 'Visual', description: 'Learn through images, diagrams, and visual aids' },
    { value: 'auditory', label: 'Auditory', description: 'Learn through listening and discussion' },
    { value: 'kinesthetic', label: 'Kinesthetic', description: 'Learn through hands-on activities and practice' },
    { value: 'reading', label: 'Reading/Writing', description: 'Learn through text and written materials' }
  ]

  const personalityTraits = [
    'Analytical', 'Creative', 'Detail-oriented', 'Big-picture thinker',
    'Collaborative', 'Independent', 'Patient', 'Fast-paced',
    'Structured', 'Flexible', 'Practical', 'Theoretical'
  ]

  const difficultyLevels = [
    { value: 'beginner', label: 'Beginner-friendly' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
    { value: 'mixed', label: 'Mixed levels' }
  ]

  const commonInterests = [
    'Technology', 'Science', 'Business', 'Arts', 'Health',
    'Education', 'Finance', 'Marketing', 'Design', 'Programming',
    'Data Analysis', 'Psychology', 'History', 'Languages', 'Music'
  ]

  const loadUserProfile = useCallback(async () => {
    try {
      setLoading(true)
      if (!clerkUser) return

      // Ensure user exists in Supabase
      await ensureUserExists(clerkUser)

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('clerk_user_id', clerkUser.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error)
        return
      }

      if (data) {
        setProfile({
          ...data,
          interests: Array.isArray(data.interests) ? data.interests : [],
          personality_traits: Array.isArray(data.personality_traits) ? data.personality_traits : []
        })
      }
    } catch (error) {
      console.error('Error loading user profile:', error)
    } finally {
      setLoading(false)
    }
  }, [clerkUser])

  useEffect(() => {
    loadUserProfile()
  }, [clerkUser, loadUserProfile])

  const startEditing = () => {
    setEditForm({ ...profile })
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setEditForm({})
    setIsEditing(false)
  }

  const saveProfile = async () => {
    try {
      setSaving(true)
      if (!clerkUser) return

      const updateData = {
        ...editForm,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('clerk_user_id', clerkUser.id)

      if (error) {
        console.error('Error saving profile:', error)
        alert('Failed to save profile. Please try again.')
        return
      }

      setProfile({ ...profile, ...editForm })
      setIsEditing(false)
      setEditForm({})
      alert('Profile saved successfully!')
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Failed to save profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const toggleInterest = (interest: string) => {
    const currentInterests = Array.isArray(editForm.interests) ? editForm.interests : []
    const newInterests = currentInterests.includes(interest)
      ? currentInterests.filter(i => i !== interest)
      : [...currentInterests, interest]
    
    setEditForm({ ...editForm, interests: newInterests })
  }

  const togglePersonalityTrait = (trait: string) => {
    const currentTraits = Array.isArray(editForm.personality_traits) ? editForm.personality_traits : []
    const newTraits = currentTraits.includes(trait)
      ? currentTraits.filter(t => t !== trait)
      : [...currentTraits, trait]
    
    setEditForm({ ...editForm, personality_traits: newTraits })
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Learning Style</h1>
          <p className="text-muted-foreground mt-2">
            Customize your learning experience with personalized preferences
          </p>
        </div>
        {!isEditing ? (
          <Button onClick={startEditing} className="gap-2">
            <Edit3 className="h-4 w-4" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={cancelEditing} className="gap-2">
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={saveProfile} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
            <CardDescription>
              Basic information about your learning preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="display_name">Display Name</Label>
              {isEditing ? (
                <Input
                  id="display_name"
                  value={editForm.display_name || ''}
                  onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                  placeholder="Your preferred name"
                />
              ) : (
                <p className="text-sm text-muted-foreground mt-1">
                  {profile.display_name || 'Not set'}
                </p>
              )}
            </div>

            <div>
              <Label>Email</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {clerkUser?.emailAddresses?.[0]?.emailAddress || 'Not available'}
              </p>
            </div>

            <div>
              <Label htmlFor="timezone">Timezone</Label>
              {isEditing ? (
                <Select
                  value={editForm.timezone || ''}
                  onValueChange={(value) => setEditForm({ ...editForm, timezone: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">Eastern Time</SelectItem>
                    <SelectItem value="America/Chicago">Central Time</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                    <SelectItem value="Europe/London">London</SelectItem>
                    <SelectItem value="Europe/Paris">Paris</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">
                  {profile.timezone || 'Not set'}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Learning Style */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Learning Style
            </CardTitle>
            <CardDescription>
              How do you learn best?
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-3">
                {learningStyles.map((style) => (
                  <div
                    key={style.value}
                    onClick={() => setEditForm({ ...editForm, learning_style: style.value })}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      editForm.learning_style === style.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <h3 className="font-medium">{style.label}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{style.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                {profile.learning_style ? (
                  <Badge variant="secondary" className="capitalize">
                    {learningStyles.find(s => s.value === profile.learning_style)?.label || profile.learning_style}
                  </Badge>
                ) : (
                  <p className="text-sm text-muted-foreground">Not set</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Interests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Interests
            </CardTitle>
            <CardDescription>
              What topics are you interested in learning about?
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {commonInterests.map((interest) => {
                    const currentInterests = Array.isArray(editForm.interests) ? editForm.interests : []
                    const isSelected = currentInterests.includes(interest)
                    return (
                      <Badge
                        key={interest}
                        variant={isSelected ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleInterest(interest)}
                      >
                        {interest}
                      </Badge>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {Array.isArray(profile.interests) && profile.interests.length > 0 ? (
                  profile.interests.map((interest) => (
                    <Badge key={interest} variant="secondary">
                      {interest}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No interests selected</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Personality Traits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Personality Traits
            </CardTitle>
            <CardDescription>
              How would you describe your learning personality?
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="flex flex-wrap gap-2">
                {personalityTraits.map((trait) => {
                  const currentTraits = Array.isArray(editForm.personality_traits) ? editForm.personality_traits : []
                  const isSelected = currentTraits.includes(trait)
                  return (
                    <Badge
                      key={trait}
                      variant={isSelected ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => togglePersonalityTrait(trait)}
                    >
                      {trait}
                    </Badge>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {Array.isArray(profile.personality_traits) && profile.personality_traits.length > 0 ? (
                  profile.personality_traits.map((trait) => (
                    <Badge key={trait} variant="secondary">
                      {trait}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No traits selected</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Learning Goals & Preferences */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Learning Goals & Preferences
            </CardTitle>
            <CardDescription>
              Tell us about your learning objectives and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="goals">Learning Goals</Label>
              {isEditing ? (
                <Textarea
                  id="goals"
                  value={editForm.goals || ''}
                  onChange={(e) => setEditForm({ ...editForm, goals: e.target.value })}
                  placeholder="What do you want to achieve with your learning? What are your long-term goals?"
                  rows={3}
                />
              ) : (
                <p className="text-sm text-muted-foreground mt-1">
                  {profile.goals || 'Not set'}
                </p>
              )}
            </div>

            <div>
              <Label>Preferred Difficulty Level</Label>
              {isEditing ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                  {difficultyLevels.map((level) => (
                    <div
                      key={level.value}
                      onClick={() => setEditForm({ ...editForm, preferred_difficulty: level.value })}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors text-center ${
                        editForm.preferred_difficulty === level.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <span className="text-sm font-medium">{level.label}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-2">
                  {profile.preferred_difficulty ? (
                    <Badge variant="secondary" className="capitalize">
                      {difficultyLevels.find(d => d.value === profile.preferred_difficulty)?.label || profile.preferred_difficulty}
                    </Badge>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not set</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}