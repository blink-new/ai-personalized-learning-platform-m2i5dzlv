import { useState } from 'react'
import { SignedIn, SignedOut, SignInButton, SignUpButton, useUser } from '@clerk/clerk-react'
import { Sidebar } from './components/Sidebar'
import { CoursesPage } from './components/CoursesPage'
import { LearningStylePage } from './components/LearningStylePage'
import { AccountPage } from './components/AccountPage'
import { CourseGenerator } from './components/CourseGenerator'
import { CourseContent } from './components/CourseContent'

type Page = 'courses' | 'learning-style' | 'account' | 'course-generator' | 'course-content'

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('courses')
  const [selectedCourse, setSelectedCourse] = useState<any>(null)
  const { user, isLoaded } = useUser()

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'courses':
        return (
          <CoursesPage 
            onGenerateCourse={() => setCurrentPage('course-generator')}
            onViewCourse={(course) => {
              setSelectedCourse(course)
              setCurrentPage('course-content')
            }}
          />
        )
      case 'learning-style':
        return <LearningStylePage />
      case 'account':
        return <AccountPage user={user} />
      case 'course-generator':
        return (
          <CourseGenerator 
            onBack={() => setCurrentPage('courses')}
            onCourseGenerated={(course) => {
              setSelectedCourse(course)
              setCurrentPage('course-content')
            }}
          />
        )
      case 'course-content':
        return (
          <CourseContent 
            course={selectedCourse}
            onBack={() => setCurrentPage('courses')}
          />
        )
      default:
        return <CoursesPage onGenerateCourse={() => setCurrentPage('course-generator')} onViewCourse={() => {}} />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SignedOut>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">ULearn</h1>
              <p className="text-muted-foreground">Teach yourself anything</p>
            </div>
            <div className="space-y-4">
              <div className="flex flex-col space-y-2">
                <SignInButton mode="modal">
                  <button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 rounded-md font-medium transition-colors">
                    Sign In
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="w-full border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 rounded-md font-medium transition-colors">
                    Sign Up
                  </button>
                </SignUpButton>
              </div>
            </div>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="flex">
          <Sidebar 
            currentPage={currentPage} 
            onPageChange={setCurrentPage}
            user={user}
          />
          <main className="flex-1 overflow-auto">
            {renderPage()}
          </main>
        </div>
      </SignedIn>
    </div>
  )
}

export default App