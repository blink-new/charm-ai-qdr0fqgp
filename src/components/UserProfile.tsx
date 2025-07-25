import { useState, useEffect, useCallback } from 'react'
import { blink } from '../blink/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Switch } from './ui/switch'
import { Separator } from './ui/separator'
import { User, Settings, Volume2, MessageSquare, Palette, Moon, Sun } from 'lucide-react'
import { motion } from 'framer-motion'

interface User {
  id: string
  email: string
  displayName?: string
}

interface UserPreferences {
  voiceEnabled: boolean
  voiceGender: 'male' | 'female'
  voiceTone: 'warm' | 'confident' | 'playful' | 'empathetic'
  adviceStyle: 'casual' | 'professional' | 'empathetic'
  theme: 'light' | 'dark'
}

interface UserProfileProps {
  user: User
  onThemeChange: () => void
}

export default function UserProfile({ user, onThemeChange }: UserProfileProps) {
  const [preferences, setPreferences] = useState<UserPreferences>({
    voiceEnabled: true,
    voiceGender: 'female',
    voiceTone: 'warm',
    adviceStyle: 'empathetic',
    theme: 'light'
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const loadUserPreferences = useCallback(async () => {
    try {
      setIsLoading(true)
      const userPrefs = await blink.db.userPreferences.list({
        where: { userId: user.id },
        limit: 1
      })

      if (userPrefs.length > 0) {
        const prefs = userPrefs[0]
        setPreferences({
          voiceEnabled: Number(prefs.voiceEnabled) > 0,
          voiceGender: prefs.voiceGender as 'male' | 'female',
          voiceTone: prefs.voiceTone as 'warm' | 'confident' | 'playful' | 'empathetic',
          adviceStyle: prefs.adviceStyle as 'casual' | 'professional' | 'empathetic',
          theme: prefs.theme as 'light' | 'dark'
        })
      }
    } catch (error) {
      console.error('Failed to load user preferences:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user.id])

  useEffect(() => {
    loadUserPreferences()
  }, [loadUserPreferences])

  const savePreferences = async () => {
    try {
      setIsSaving(true)
      
      await blink.db.userPreferences.upsertMany([{
        id: `pref_${user.id}`,
        userId: user.id,
        voiceEnabled: preferences.voiceEnabled ? "1" : "0",
        voiceGender: preferences.voiceGender,
        voiceTone: preferences.voiceTone,
        adviceStyle: preferences.adviceStyle,
        theme: preferences.theme
      }])

      // Apply theme change immediately
      document.documentElement.classList.toggle('dark', preferences.theme === 'dark')
      
    } catch (error) {
      console.error('Failed to save preferences:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const updatePreference = <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }))
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-full mx-auto mb-4 flex items-center justify-center">
          <User className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Profile Settings</h1>
        <p className="text-muted-foreground">
          Customize your Charm AI experience
        </p>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Account Information */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Account Information</span>
              </CardTitle>
              <CardDescription>
                Your account details and basic information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Email</Label>
                <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Display Name</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {user.displayName || 'Not set'}
                </p>
              </div>
              <Separator />
              <Button
                variant="outline"
                onClick={() => blink.auth.logout()}
                className="w-full"
              >
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Voice Settings */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Volume2 className="w-5 h-5" />
                <span>Voice Settings</span>
              </CardTitle>
              <CardDescription>
                Configure voice interaction preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="voice-enabled">Enable Voice</Label>
                <Switch
                  id="voice-enabled"
                  checked={preferences.voiceEnabled}
                  onCheckedChange={(checked) => updatePreference('voiceEnabled', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label>Voice Gender</Label>
                <Select
                  value={preferences.voiceGender}
                  onValueChange={(value: 'male' | 'female') => updatePreference('voiceGender', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Voice Tone</Label>
                <Select
                  value={preferences.voiceTone}
                  onValueChange={(value: 'warm' | 'confident' | 'playful' | 'empathetic') => 
                    updatePreference('voiceTone', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warm">Warm</SelectItem>
                    <SelectItem value="confident">Confident</SelectItem>
                    <SelectItem value="playful">Playful</SelectItem>
                    <SelectItem value="empathetic">Empathetic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Conversation Settings */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="w-5 h-5" />
                <span>Conversation Style</span>
              </CardTitle>
              <CardDescription>
                How Charm AI should respond to you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Advice Style</Label>
                <Select
                  value={preferences.adviceStyle}
                  onValueChange={(value: 'casual' | 'professional' | 'empathetic') => 
                    updatePreference('adviceStyle', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="casual">Casual & Friendly</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="empathetic">Empathetic & Supportive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="text-sm text-muted-foreground">
                <p className="mb-2">Style descriptions:</p>
                <ul className="space-y-1 text-xs">
                  <li><strong>Casual:</strong> Relaxed, friendly tone with informal language</li>
                  <li><strong>Professional:</strong> Structured, formal advice with clear guidance</li>
                  <li><strong>Empathetic:</strong> Warm, understanding responses focused on emotional support</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Appearance Settings */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Palette className="w-5 h-5" />
                <span>Appearance</span>
              </CardTitle>
              <CardDescription>
                Customize the look and feel
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Theme</Label>
                <Select
                  value={preferences.theme}
                  onValueChange={(value: 'light' | 'dark') => updatePreference('theme', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      <div className="flex items-center space-x-2">
                        <Sun className="w-4 h-4" />
                        <span>Light</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center space-x-2">
                        <Moon className="w-4 h-4" />
                        <span>Dark</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Save Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex justify-center"
      >
        <Button
          onClick={savePreferences}
          disabled={isSaving}
          size="lg"
          className="min-w-32"
        >
          {isSaving ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Saving...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Save Preferences</span>
            </div>
          )}
        </Button>
      </motion.div>
    </div>
  )
}