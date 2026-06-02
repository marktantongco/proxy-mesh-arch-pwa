import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { proxyStack } from '../data/proxy-stack'

gsap.registerPlugin(ScrollTrigger)

function ServiceNode({
  service,
  index,
  isActive,
  onSelect,
}: {
  service: (typeof proxyStack)[number]
  index: number
  isActive: boolean
  onSelect: () => void
}) {
  const isLast = index === proxyStack.length - 1

  return (
    <motion.div
      initial={{ opacity: 0, x: -40 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.15, duration: 0.6, ease: 'easeOut' }}
      className={`relative cursor-pointer transition-all duration-300 ${
        isActive ? 'scale-[1.02]' : 'hover:scale-[1.01]'
      }`}
      onClick={onSelect}
    >
      <div
        className={`os-window transition-all duration-300 ${
          isActive
            ? 'border-neon/40 shadow-[0_0_20px_rgba(0,255,136,0.1)]'
            : 'hover:border-neon/20'
        }`}
      >
        <div className="os-window-header">
          <span className="os-dot bg-red-500" />
          <span className="os-dot bg-yellow-500" />
          <span className="os-dot bg-green-500" />
          <div className="flex-1 text-right">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-neon/10 border border-neon/20 font-mono text-[10px] text-neon">
              <span className="w-1.5 h-1.5 rounded-full bg-neon glow-pulse" />
              :{service.port}
            </span>
          </div>
        </div>
        <div className="p-4 md:p-5">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-sm md:text-base text-white">{service.name}</h3>
            <span className="text-[10px] font-mono text-muted uppercase tracking-wider ml-2 shrink-0">
              {service.role}
            </span>
          </div>
          <p className="text-xs md:text-sm text-gray-400 leading-relaxed">{service.description}</p>
        </div>
      </div>
      {!isLast && (
        <div className="flex justify-center py-2">
          <svg width="16" height="20" viewBox="0 0 16 20" className="text-neon/40">
            <path
              d="M8 0v16M2 10l6 6 6-6"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
    </motion.div>
  )
}

function ServiceDetail({
  service,
  onClose,
}: {
  service: (typeof proxyStack)[number]
  onClose: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        className="relative w-full max-w-lg os-window bg-[#0d1130]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="os-window-header">
          <span className="os-dot bg-red-500" onClick={onClose} />
          <span className="os-dot bg-yellow-500" />
          <span className="os-dot bg-green-500" />
          <span className="ml-3 font-mono text-[10px] text-gray-500 uppercase tracking-wider">
            {service.role}
          </span>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-white mb-1">{service.name}</h2>
            <p className="text-sm text-gray-400">{service.detail}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-cyber-light/50 border border-white/5">
              <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Port</p>
              <p className="font-mono text-neon text-sm">:{service.port}</p>
            </div>
            <div className="p-3 rounded-lg bg-cyber-light/50 border border-white/5">
              <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Status</p>
              <p className="flex items-center gap-1.5 text-sm text-neon font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-neon glow-pulse" />
                {service.status}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-cyber-light/50 border border-white/5">
              <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Protocol</p>
              <p className="font-mono text-xs text-gray-300">{service.protocol}</p>
            </div>
            <div className="p-3 rounded-lg bg-cyber-light/50 border border-white/5">
              <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Upstream</p>
              <p className="font-mono text-xs text-gray-300">{service.upstream.join(', ')}</p>
            </div>
          </div>

          {service.pid && (
            <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
              <span>PID {service.pid}</span>
              {service.version && (
                <>
                  <span>·</span>
                  <span>v{service.version}</span>
                </>
              )}
            </div>
          )}

          <div className="pt-2 border-t border-white/5">
            <pre className="terminal-text text-[11px] text-gray-500">
              <span className="text-gray-600">$</span> systemctl status --no-pager \
              <br />
              <span className="text-gray-600">$</span> curl -s localhost:{service.port}
            </pre>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function ArchitectureDiagram() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!titleRef.current || !sectionRef.current) return
    ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top 80%',
      onEnter: () => {
        gsap.fromTo(
          titleRef.current!.children,
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, stagger: 0.2, ease: 'power3.out' }
        )
      },
    })
  }, [])

  const selected = selectedId ? proxyStack.find((s) => s.id === selectedId) ?? null : null

  return (
    <section ref={sectionRef} className="py-20 md:py-32 px-4" id="architecture">
      <div className="max-w-3xl mx-auto">
        <div ref={titleRef} className="mb-12 text-center">
          <p className="font-mono text-neon text-xs tracking-widest uppercase mb-3">
            System Architecture
          </p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Hub-and-Spoke{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon to-[#00ffcc]">
              Proxy Mesh
            </span>
          </h2>
          <p className="text-sm text-gray-500 max-w-md mx-auto font-mono">
            Click any service node for port, protocol, and process details
          </p>
        </div>

        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-neon/20 via-neon/10 to-transparent hidden md:block" />
          <div className="md:pl-8 space-y-0">
            {proxyStack.map((svc, i) => (
              <ServiceNode
                key={svc.id}
                service={svc}
                index={i}
                isActive={selectedId === svc.id}
                onSelect={() => setSelectedId(selectedId === svc.id ? null : svc.id)}
              />
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <ServiceDetail service={selected} onClose={() => setSelectedId(null)} />
        )}
      </AnimatePresence>
    </section>
  )
}
