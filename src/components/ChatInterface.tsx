import { useState, useEffect, useRef, useCallback } from 'react'
import { blink } from '../blink/client'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card } from './ui/card'
import { Mic, MicOff, Send, Volume2, VolumeX } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import VoiceVisualizer from './VoiceVisualizer'
import MessageBubble from './MessageBubble'

interface User {
  id: string
  email: string
  displayName?: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sentiment?: 'positive' | 'neutral' | 'negative' | 'cautionary'
  isVoice?: boolean
  timestamp: Date
}

interface Conversation {
  id: string
  title?: string
  messages: Message[]
}

interface ChatInterfaceProps {
  user: User
}

export default function ChatInterface({ user }: ChatInterfaceProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null)
  const [inputMessage, setInputMessage] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isVoiceMode, setIsVoiceMode] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const analyzeSentiment = useCallback((text: string): 'positive' | 'neutral' | 'negative' | 'cautionary' => {
    const lowerText = text.toLowerCase()
    
    const positiveWords = ['great', 'wonderful', 'amazing', 'excellent', 'good', 'happy', 'love', 'perfect', 'fantastic']
    const negativeWords = ['sorry', 'difficult', 'hard', 'problem', 'issue', 'concern', 'worry', 'sad', 'upset']
    const cautionaryWords = ['careful', 'caution', 'warning', 'consider', 'think about', 'be aware', 'watch out']
    
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length
    const cautionaryCount = cautionaryWords.filter(word => lowerText.includes(word)).length
    
    if (cautionaryCount > 0) return 'cautionary'
    if (positiveCount > negativeCount) return 'positive'
    if (negativeCount > positiveCount) return 'negative'
    return 'neutral'
  }, [])

  const generateSpeech = useCallback(async (text: string) => {
    try {
      setIsSpeaking(true)
      
      const { url } = await blink.ai.generateSpeech({
        text,
        voice: 'nova'
      })

      const audio = new Audio(url)
      audio.onended = () => setIsSpeaking(false)
      audio.onerror = () => setIsSpeaking(false)
      await audio.play()
    } catch (error) {
      console.error('Failed to generate speech:', error)
      setIsSpeaking(false)
    }
  }, [])

  const createNewConversation = useCallback(async () => {
    const newConversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    try {
      await blink.db.conversations.create({
        id: newConversationId,
        userId: user.id,
        title: 'New Conversation'
      })

      const newConversation: Conversation = {
        id: newConversationId,
        title: 'New Conversation',
        messages: []
      }

      setCurrentConversation(newConversation)
      setConversations(prev => [newConversation, ...prev])
    } catch (error) {
      console.error('Failed to create new conversation:', error)
    }
  }, [user.id])

  const sendMessage = useCallback(async (content: string, isVoice = false) => {
    if (!currentConversation || !content.trim()) return

    const userMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const userMessage: Message = {
      id: userMessageId,
      role: 'user',
      content: content.trim(),
      isVoice,
      timestamp: new Date()
    }

    // Add user message to UI immediately
    setCurrentConversation(prev => prev ? {
      ...prev,
      messages: [...prev.messages, userMessage]
    } : null)

    try {
      setIsLoading(true)

      // Save user message to database
      await blink.db.messages.create({
        id: userMessageId,
        conversationId: currentConversation.id,
        userId: user.id,
        role: 'user',
        content: content.trim(),
        isVoice: isVoice ? "1" : "0"
      })

      // Get AI response
      const conversationHistory = [
        ...currentConversation.messages,
        userMessage
      ].map(msg => ({
        role: msg.role,
        content: msg.content
      }))

      const { text: aiResponse } = await blink.ai.generateText({
        messages: [
          {
            role: 'system',
            content: `You are Charm AI, an emotionally intelligent conversational assistant specializing in romantic and interpersonal advice. You provide authentic, empathetic, and practical guidance. Analyze the emotional tone of the user's message and respond accordingly. Be warm, understanding, and helpful while maintaining appropriate boundaries.`
          },
          ...conversationHistory.slice(-10) // Keep last 10 messages for context
        ],
        model: 'gpt-4o-mini',
        maxTokens: 500
      })

      // Analyze sentiment of AI response
      const sentiment = analyzeSentiment(aiResponse)

      const assistantMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: aiResponse,
        sentiment,
        timestamp: new Date()
      }

      // Add AI response to UI
      setCurrentConversation(prev => prev ? {
        ...prev,
        messages: [...prev.messages, assistantMessage]
      } : null)

      // Save AI message to database
      await blink.db.messages.create({
        id: assistantMessageId,
        conversationId: currentConversation.id,
        userId: user.id,
        role: 'assistant',
        content: aiResponse,
        sentiment,
        isVoice: "0"
      })

      // Update conversation timestamp
      await blink.db.conversations.update(currentConversation.id, {
        updatedAt: new Date().toISOString()
      })

      // Generate speech if voice mode is enabled
      if (isVoiceMode) {
        await generateSpeech(aiResponse)
      }

    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsLoading(false)
    }
  }, [currentConversation, user.id, analyzeSentiment, isVoiceMode, generateSpeech])

  const transcribeAudio = useCallback(async (audioBlob: Blob) => {
    try {
      setIsLoading(true)
      
      // Convert blob to base64
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const dataUrl = reader.result as string
          const base64Data = dataUrl.split(',')[1]
          resolve(base64Data)
        }
        reader.onerror = reject
        reader.readAsDataURL(audioBlob)
      })

      const { text } = await blink.ai.transcribeAudio({
        audio: base64Audio,
        language: 'en'
      })

      if (text.trim()) {
        await sendMessage(text, true)
      }
    } catch (error) {
      console.error('Failed to transcribe audio:', error)
    } finally {
      setIsLoading(false)
    }
  }, [sendMessage])

  const loadConversations = useCallback(async () => {
    try {
      const convos = await blink.db.conversations.list({
        where: { userId: user.id },
        orderBy: { updatedAt: 'desc' },
        limit: 10
      })

      const conversationsWithMessages = await Promise.all(
        convos.map(async (convo) => {
          const messages = await blink.db.messages.list({
            where: { conversationId: convo.id },
            orderBy: { createdAt: 'asc' }
          })

          return {
            id: convo.id,
            title: convo.title,
            messages: messages.map(msg => ({
              id: msg.id,
              role: msg.role as 'user' | 'assistant',
              content: msg.content,
              sentiment: msg.sentiment as 'positive' | 'neutral' | 'negative' | 'cautionary',
              isVoice: Number(msg.isVoice) > 0,
              timestamp: new Date(msg.createdAt)
            }))
          }
        })
      )

      setConversations(conversationsWithMessages)
      
      // Set current conversation to the most recent one or create new
      if (conversationsWithMessages.length > 0) {
        setCurrentConversation(conversationsWithMessages[0])
      } else {
        createNewConversation()
      }
    } catch (error) {
      console.error('Failed to load conversations:', error)
      createNewConversation()
    }
  }, [user.id, createNewConversation])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        await transcribeAudio(audioBlob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Failed to start recording:', error)
    }
  }, [transcribeAudio])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }, [isRecording])

  const handleSendText = useCallback(async () => {
    if (inputMessage.trim()) {
      await sendMessage(inputMessage)
      setInputMessage('')
    }
  }, [inputMessage, sendMessage])

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendText()
    }
  }, [handleSendText])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  useEffect(() => {
    scrollToBottom()
  }, [currentConversation?.messages, scrollToBottom])

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {currentConversation?.messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.role === 'user'}
            />
          ))}
        </AnimatePresence>
        
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <Card className="p-4 max-w-xs">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-muted-foreground">Charm AI is thinking...</span>
              </div>
            </Card>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Voice Visualizer */}
      {isRecording && (
        <div className="px-4 py-2">
          <VoiceVisualizer isActive={isRecording} />
        </div>
      )}

      {/* Input Area */}
      <div className="border-t bg-card/50 backdrop-blur-sm p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center space-x-3">
            {/* Voice Mode Toggle */}
            <Button
              variant={isVoiceMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsVoiceMode(!isVoiceMode)}
              className="shrink-0"
            >
              {isVoiceMode ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>

            {/* Voice Input Button */}
            <Button
              variant={isRecording ? 'destructive' : 'outline'}
              size="lg"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading}
              className={`shrink-0 ${isRecording ? 'animate-pulse-glow' : ''}`}
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>

            {/* Text Input */}
            <div className="flex-1 flex space-x-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message or use voice..."
                disabled={isLoading || isRecording}
                className="flex-1"
              />
              <Button
                onClick={handleSendText}
                disabled={!inputMessage.trim() || isLoading || isRecording}
                size="lg"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>

            {/* New Conversation Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={createNewConversation}
              className="shrink-0"
            >
              New Chat
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}