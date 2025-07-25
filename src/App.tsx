import { useState, useEffect, useCallback } from 'react'
import { blink } from './blink/client'
import ChatInterface from './components/ChatInterface'
import UserProfile from './components/UserProfile'
import LandingPage from './components/LandingPage'
import { Button } from './components/ui/button'
import { Settings, MessageCircle, User } from 'lucide-react'
import { motion } from 'framer-motion'

interface User {
  id: string
  email: string
  displayName?: string
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentView, setCurrentView] = useState<'landing' | 'chat' | 'profile'>('landing')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      setLoading(state.isLoading)
      
      // If user is authenticated and we're on landing, go to chat
      if (state.user && currentView === 'landing') {
        setCurrentView('chat')
      }
      // If user logs out, go back to landing
      if (!state.user && currentView !== 'landing') {
        setCurrentView('landing')
      }
    })
    return unsubscribe
  }, [currentView])

  const loadUserPreferences = useCallback(async () => {
    if (!user) return
    
    try {
      const preferences = await blink.db.userPreferences.list({
        where: { userId: user.id },
        limit: 1
      })
      
      if (preferences.length > 0) {
        const userTheme = preferences[0].theme as 'light' | 'dark'
        setTheme(userTheme)
        document.documentElement.classList.toggle('dark', userTheme === 'dark')
      }
    } catch (error) {
      console.error('Failed to load user preferences:', error)
    }
  }, [user])

  useEffect(() => {
    // Load user theme preference
    if (user) {
      loadUserPreferences()
    }
  }, [user, loadUserPreferences])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
    
    // Save theme preference
    if (user) {
      blink.db.userPreferences.upsertMany([{
        id: `pref_${user.id}`,
        userId: user.id,
        theme: newTheme
      }])
    }
  }

  const handleGetStarted = () => {
    if (user) {
      setCurrentView('chat')
    } else {
      blink.auth.login()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading Charm AI...</p>
        </motion.div>
      </div>
    )
  }

  // Show landing page if not authenticated or explicitly on landing
  if (!user || currentView === 'landing') {
    return <LandingPage onGetStarted={handleGetStarted} />
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold">Charm AI</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant={currentView === 'chat' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('chat')}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat
            </Button>
            <Button
              variant={currentView === 'profile' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('profile')}
            >
              <User className="w-4 h-4 mr-2" />
              Profile
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto">
        {currentView === 'chat' ? (
          <ChatInterface user={user} />
        ) : (
          <UserProfile user={user} onThemeChange={toggleTheme} />
        )}
      </main>
    </div>
  )
}

export default App