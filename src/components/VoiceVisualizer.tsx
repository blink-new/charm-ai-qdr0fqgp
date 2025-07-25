import { motion } from 'framer-motion'

interface VoiceVisualizerProps {
  isActive: boolean
}

export default function VoiceVisualizer({ isActive }: VoiceVisualizerProps) {
  const bars = Array.from({ length: 12 }, (_, i) => i)

  return (
    <div className="flex items-center justify-center space-x-1 py-4">
      {bars.map((bar) => (
        <motion.div
          key={bar}
          className="w-1 bg-gradient-to-t from-primary to-accent rounded-full"
          animate={
            isActive
              ? {
                  height: [4, Math.random() * 40 + 10, 4],
                  opacity: [0.3, 1, 0.3],
                }
              : { height: 4, opacity: 0.3 }
          }
          transition={{
            duration: 0.5 + Math.random() * 0.5,
            repeat: isActive ? Infinity : 0,
            ease: 'easeInOut',
            delay: bar * 0.1,
          }}
          style={{ height: 4 }}
        />
      ))}
    </div>
  )
}