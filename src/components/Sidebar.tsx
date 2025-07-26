import { BookOpen, Brain, User } from 'lucide-react'
import { UserButton } from '@clerk/clerk-react'

interface SidebarProps {
  currentPage: string
  onPageChange: (page: 'courses' | 'learning-style' | 'account') => void
  user: any
}

export function Sidebar({ currentPage, onPageChange, user }: SidebarProps) {
  const menuItems = [
    {
      id: 'courses',
      label: 'Courses',
      icon: BookOpen,
      description: 'AI-generated content'
    },
    {
      id: 'learning-style',
      label: 'Learning Style',
      icon: Brain,
      description: 'Profile & preferences'
    },
    {
      id: 'account',
      label: 'Account',
      icon: User,
      description: 'Settings & management'
    }
  ]

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold text-foreground">ULearn</h1>
        <p className="text-sm text-muted-foreground mt-1">Teach yourself anything</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = currentPage === item.id
            
            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                <Icon className="h-5 w-5" />
                <div>
                  <div className="font-medium">{item.label}</div>
                  <div className={`text-xs ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                    {item.description}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3">
          <UserButton 
            appearance={{
              elements: {
                avatarBox: "w-8 h-8"
              }
            }}
          />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground truncate">
              {user?.firstName || user?.emailAddresses?.[0]?.emailAddress || 'User'}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {user?.emailAddresses?.[0]?.emailAddress}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}