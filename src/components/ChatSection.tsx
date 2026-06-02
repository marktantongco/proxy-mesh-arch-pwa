import { useRef, useEffect } from 'react'
import { useChat } from '@ai-sdk/react'
import { motion, AnimatePresence } from 'motion/react'

const models = [
  { id: 'nvidia/nemotron-3-nano-30b-a3b', label: 'Nemotron Nano 30B' },
  { id: 'nvidia/nemotron-3-super-120b-a12b', label: 'Nemotron Super 120B' },
  { id: 'nvidia/nemotron-nano-9b-v2', label: 'Nemotron Nano 9B v2' },
  { id: 'nvidia/nemotron-nano-12b-v2-vl', label: 'Nemotron Nano 12B v2 VL' },
]

export default function ChatSection() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages, append } =
    useChat({
      api: '/api/chat',
      body: { model: 'nvidia/nemotron-3-nano-30b-a3b' },
    })

  const listRef = useRef<HTMLDivElement>(null)
  const modelRef = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo(0, listRef.current.scrollHeight)
  }, [messages])

  const currentModel = modelRef.current?.value || 'nvidia/nemotron-3-nano-30b-a3b'

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    handleSubmit(e, { body: { model: currentModel } })
  }

  const onModelChange = () => {
    if (messages.length > 0) {
      setMessages([
        ...messages,
        {
          id: `system-${Date.now()}`,
          role: 'assistant',
          content: `Switched to ${modelRef.current?.selectedOptions[0]?.text || 'new model'}. Send a new message to use it.`,
        },
      ])
    }
  }

  return (
    <section className="py-20 md:py-32 px-4" id="chat">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <p className="font-mono text-neon text-xs tracking-widest uppercase mb-3">
            Live Demo
          </p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Talk to{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon to-[#00ffcc]">
              Nemotron
            </span>
          </h2>
          <p className="text-sm text-gray-500 font-mono">
            proxied through Vercel AI Gateway —
            <span className="text-gray-400"> Browser → API → NVIDIA</span>
          </p>
        </div>

        <div className="os-window">
          <div className="os-window-header justify-between">
            <div className="flex items-center gap-2">
              <span className="os-dot bg-red-500" />
              <span className="os-dot bg-yellow-500" />
              <span className="os-dot bg-green-500" />
            </div>
            <select
              ref={modelRef}
              defaultValue="nvidia/nemotron-3-nano-30b-a3b"
              onChange={onModelChange}
              className="bg-transparent text-[10px] font-mono text-neon border border-neon/20 rounded px-2 py-0.5 focus:outline-none focus:border-neon/40 cursor-pointer"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id} className="bg-cyber text-gray-300">
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div
            ref={listRef}
            className="h-80 overflow-y-auto p-4 space-y-3 bg-[#0a0e27]/50"
          >
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-gray-600 font-mono">
                  <span className="text-neon">$</span> Type a message to start
                </p>
              </div>
            )}
            <AnimatePresence initial={false}>
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-neon/10 border border-neon/20 text-gray-200'
                        : 'bg-cyber-light/50 border border-white/5 text-gray-300'
                    }`}
                  >
                    <p className="font-mono text-[10px] text-muted mb-1">
                      {m.role === 'user' ? 'You' : 'Nemotron'}
                    </p>
                    <div className="whitespace-pre-wrap break-words">{m.content}</div>
                  </div>
                </motion.div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="rounded-lg px-3 py-2 bg-cyber-light/50 border border-white/5">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-neon/60 glow-pulse" />
                      <span
                        className="w-2 h-2 rounded-full bg-neon/40 glow-pulse"
                        style={{ animationDelay: '0.3s' }}
                      />
                      <span
                        className="w-2 h-2 rounded-full bg-neon/20 glow-pulse"
                        style={{ animationDelay: '0.6s' }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <form onSubmit={onSubmit} className="border-t border-white/5 p-3">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={handleInputChange}
                placeholder="Ask Nemotron about the architecture..."
                className="flex-1 bg-cyber-light/50 border border-white/10 rounded px-3 py-2 text-sm text-gray-300 font-mono placeholder:text-gray-600 focus:outline-none focus:border-neon/30"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-4 py-2 rounded bg-neon/10 border border-neon/20 text-neon text-sm font-mono hover:bg-neon/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Send
              </button>
            </div>
            <p className="mt-2 text-[10px] text-gray-600 font-mono text-center">
              Messages are sent through the API route and proxied to NVIDIA Nemotron
            </p>
          </form>
        </div>
      </div>
    </section>
  )
}
