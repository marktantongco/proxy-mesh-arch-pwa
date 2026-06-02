import { motion } from 'motion/react'
import { useState } from 'react'

const models = [
  { id: 'nvidia/nemotron-3-nano-30b-a3b', label: 'Nemotron Nano 30B' },
  { id: 'nvidia/nemotron-3-super-120b-a12b', label: 'Nemotron Super 120B' },
  { id: 'nvidia/nemotron-nano-9b-v2', label: 'Nemotron Nano 9B v2' },
  { id: 'nvidia/nemotron-nano-12b-v2-vl', label: 'Nemotron Nano 12B v2 VL' },
]

export default function ChatSection() {
  const [input, setInput] = useState('')

  return (
    <section className="py-20 md:py-32 px-4" id="chat">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <p className="font-mono text-neon text-xs tracking-widest uppercase mb-3">
            Coming Soon
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
              defaultValue="nvidia/nemotron-3-nano-30b-a3b"
              disabled
              className="bg-transparent text-[10px] font-mono text-muted border border-white/10 rounded px-2 py-0.5 cursor-not-allowed"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id} className="bg-cyber text-gray-300">
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="h-80 overflow-y-auto p-6 bg-[#0a0e27]/50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="text-center max-w-md"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                <span className="font-mono text-[10px] text-yellow-400 uppercase tracking-wider">
                  Awaiting Activation
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-200 mb-2">
                Chat temporarily disabled
              </h3>
              <p className="text-xs text-gray-500 font-mono leading-relaxed">
                The API route and streaming pipeline are deployed and ready.
                The Vercel AI Gateway requires a credit card on file before
                routing requests to NVIDIA Nemotron. Add a card in Vercel
                settings to enable live chat.
              </p>
              <div className="mt-6 pt-4 border-t border-white/5">
                <p className="text-[10px] text-gray-600 font-mono mb-2 uppercase tracking-wider">
                  Stack ready
                </p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {['Vercel Edge', 'AI SDK', 'SSE Streaming', 'Nemotron'].map(
                    (t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 text-gray-400 border border-white/5"
                      >
                        {t}
                      </span>
                    )
                  )}
                </div>
              </div>
            </motion.div>
          </div>

          <form className="border-t border-white/5 p-3 opacity-50 pointer-events-none">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Chat pending activation..."
                disabled
                className="flex-1 bg-cyber-light/50 border border-white/10 rounded px-3 py-2 text-sm text-gray-500 font-mono placeholder:text-gray-700 focus:outline-none cursor-not-allowed"
              />
              <button
                type="button"
                disabled
                className="px-4 py-2 rounded bg-white/5 border border-white/10 text-gray-600 text-sm font-mono cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}
