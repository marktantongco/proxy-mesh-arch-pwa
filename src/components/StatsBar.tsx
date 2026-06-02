import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const stats = [
  { label: 'Services', value: '5', sub: 'all running' },
  { label: 'Total Memory', value: '~15MB', sub: 'combined RSS' },
  { label: 'Claude Models', value: '14', sub: 'via Kirolink' },
  { label: 'Uptime', value: '99.9%', sub: 'zero restarts' },
]

export default function StatsBar() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!sectionRef.current) return
    ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top 85%',
      onEnter: () => {
        gsap.fromTo(
          sectionRef.current!.querySelectorAll('.stat-card'),
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'power3.out' }
        )
      },
    })
  }, [])

  return (
    <section ref={sectionRef} className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="stat-card os-window p-4 md:p-5 text-center opacity-0"
            >
              <p className="text-2xl md:text-3xl font-bold text-neon font-mono">{s.value}</p>
              <p className="text-xs text-gray-400 mt-1">{s.label}</p>
              <p className="text-[10px] text-gray-600 font-mono mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
