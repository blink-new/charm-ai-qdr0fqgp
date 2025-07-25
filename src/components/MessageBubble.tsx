import { motion } from 'framer-motion'
import { Card } from './ui/card'
import { Mic, Bot, User } from 'lucide-react'
import { cn } from '../lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sentiment?: 'positive' | 'neutral' | 'negative' | 'cautionary'
  isVoice?: boolean
  timestamp: Date
}

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
}

export default function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return 'border-l-positive bg-positive/5'
      case 'negative':
        return 'border-l-destructive bg-destructive/5'
      case 'cautionary':
        return 'border-l-cautionary bg-cautionary/5'
      default:
        return 'border-l-neutral bg-neutral/5'
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        'flex items-start space-x-3 max-w-4xl',
        isOwn ? 'justify-end ml-auto' : 'justify-start mr-auto'
      )}
    >
      {/* Avatar */}
      {!isOwn && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0 mt-1">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Message Content */}
      <div className={cn('flex flex-col', isOwn ? 'items-end' : 'items-start')}>
        <Card
          className={cn(
            'p-4 max-w-lg border-l-4 transition-all duration-200 hover:shadow-md',
            isOwn
              ? 'bg-primary/10 border-l-primary'
              : getSentimentColor(message.sentiment)
          )}
        >
          <div className="flex items-start space-x-2">
            {/* Voice Indicator */}
            {message.isVoice && (
              <div className="shrink-0 mt-1">
                <Mic className="w-3 h-3 text-muted-foreground" />
              </div>
            )}

            {/* Message Text */}
            <div className="flex-1">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {message.content}
              </p>
            </div>
          </div>

          {/* Timestamp */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
            <span className="text-xs text-muted-foreground">
              {formatTime(message.timestamp)}
            </span>
            
            {/* Sentiment Indicator for AI messages */}
            {!isOwn && message.sentiment && (
              <div className="flex items-center space-x-1">
                <div
                  className={cn(
                    'w-2 h-2 rounded-full',
                    message.sentiment === 'positive' && 'bg-positive',
                    message.sentiment === 'negative' && 'bg-destructive',
                    message.sentiment === 'cautionary' && 'bg-cautionary',
                    message.sentiment === 'neutral' && 'bg-neutral'
                  )}
                />
                <span className="text-xs text-muted-foreground capitalize">
                  {message.sentiment}
                </span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* User Avatar */}
      {isOwn && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center shrink-0 mt-1">
          <User className="w-4 h-4 text-white" />
        </div>
      )}
    </motion.div>
  )
}