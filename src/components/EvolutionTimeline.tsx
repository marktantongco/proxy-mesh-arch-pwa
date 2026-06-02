import { useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { evolution } from '../data/proxy-stack'

gsap.registerPlugin(ScrollTrigger)

export default function EvolutionTimeline() {
  const sectionRef = useRef<HTMLElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const isLast = (i: number) => i === evolution.length - 1

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
    <section ref={sectionRef} className="py-20 md:py-32 px-4" id="evolution">
      <div className="max-w-3xl mx-auto">
        <div ref={titleRef} className="mb-12 text-center">
          <p className="font-mono text-neon text-xs tracking-widest uppercase mb-3">
            Evolution
          </p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Architecture{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon to-[#00ffcc]">
              Evolution
            </span>
          </h2>
          <p className="text-sm text-gray-500 max-w-md mx-auto font-mono">
            From direct API calls to a resilient proxy mesh
          </p>
        </div>

        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-px bg-gradient-to-b from-neon/30 via-neon/20 to-neon/5" />

          {evolution.map((event, i) => (
            <motion.div
              key={event.year}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              className="relative pl-14 pb-10 last:pb-0"
            >
              <div
                className={`absolute left-2.5 top-0 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center ${
                  isLast(i)
                    ? 'border-neon bg-neon/20 shadow-[0_0_10px_rgba(0,255,136,0.3)]'
                    : 'border-neon/40 bg-cyber'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    isLast(i) ? 'bg-neon' : 'bg-neon/40'
                  }`}
                />
              </div>

              <div className="os-window p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      isLast(i)
                        ? 'bg-neon text-cyber'
                        : 'bg-neon/10 text-neon border border-neon/20'
                    }`}
                  >
                    {event.year}
                  </span>
                  <h3 className="font-semibold text-sm md:text-base text-white">
                    {event.title}
                  </h3>
                </div>
                <p className="text-xs md:text-sm text-gray-400 leading-relaxed">
                  {event.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
