import { useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { trafficFlow } from '../data/proxy-stack'

gsap.registerPlugin(ScrollTrigger)

export default function TrafficFlow() {
  const sectionRef = useRef<HTMLElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!titleRef.current) return
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

  return (
    <section ref={sectionRef} className="py-20 md:py-32 px-4" id="traffic">
      <div className="max-w-3xl mx-auto">
        <div ref={titleRef} className="mb-12 text-center">
          <p className="font-mono text-neon text-xs tracking-widest uppercase mb-3">
            Request Flow
          </p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Traffic{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon to-[#00ffcc]">
              Flow
            </span>
          </h2>
          <p className="text-sm text-gray-500 max-w-md mx-auto font-mono">
            How a request traverses the proxy chain
          </p>
        </div>

        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-neon/30 via-neon/20 to-transparent" />

          {trafficFlow.map((step, i) => (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              className="relative pl-16 pb-8 last:pb-0"
            >
              <div
                className="absolute left-3 top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center"
                style={{ borderColor: step.color }}
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: step.color }} />
              </div>

              <div className="os-window p-4">
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                  <div className="flex items-center gap-2 font-mono text-xs md:text-sm shrink-0">
                    <span className="text-white font-medium">{step.from}</span>
                    <svg width="16" height="12" viewBox="0 0 16 12" className="text-neon/60">
                      <path
                        d="M1 6h12M9 2l4 4-4 4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        fill="none"
                      />
                    </svg>
                    <span className="text-white font-medium">{step.to}</span>
                  </div>
                  <div className="flex-1" />
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider"
                    style={{
                      backgroundColor: `${step.color}15`,
                      color: step.color,
                      border: `1px solid ${step.color}30`,
                    }}
                  >
                    {step.label}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
