import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export default function HeroSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const textRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!canvasRef.current || !textRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!
    let animId: number

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const nodes = Array.from({ length: 30 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      r: Math.random() * 2 + 1,
    }))

    const draw = () => {
      ctx.fillStyle = '#0a0e27'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      nodes.forEach((n) => {
        n.x += n.vx
        n.y += n.vy
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1

        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(0, 255, 136, 0.4)'
        ctx.fill()
      })

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < 120) {
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.strokeStyle = `rgba(0, 255, 136, ${0.15 * (1 - d / 120)})`
            ctx.lineWidth = 1
            ctx.stroke()
          }
        }
      }

      animId = requestAnimationFrame(draw)
    }
    draw()

    gsap.fromTo(
      textRef.current!.children,
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 1, stagger: 0.2, ease: 'power3.out' }
    )

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0e27] z-[1]" />
      <div className="grid-bg absolute inset-0 opacity-30 z-[1]" />
      <div ref={textRef} className="relative z-10 text-center px-4 max-w-3xl">
        <p className="font-mono text-neon text-sm mb-4 tracking-widest uppercase">
          ~/proxy-mesh-arch
        </p>
        <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
          Proxy Mesh
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon to-[#00ffcc]">
            Architecture
          </span>
        </h1>
        <p className="text-lg md:text-xl text-gray-400 leading-relaxed mb-8 max-w-xl mx-auto">
          Hub-and-spoke proxy stack powering AI agent connectivity —
          <span className="text-gray-300"> OWL → Mihomo → Kirolink → Anthropic</span>
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          {['OWL :60000', 'Mihomo :7890', 'Kirolink :8080', 'Kiro :8333', 'Tokend :48321'].map(
            (s) => (
              <span
                key={s}
                className="px-3 py-1.5 rounded-full bg-[#00ff88]/10 border border-[#00ff88]/20 font-mono text-xs text-neon"
              >
                {s}
              </span>
            )
          )}
        </div>
        <div className="mt-12 flex items-center justify-center gap-2 text-sm text-gray-500 font-mono">
          <span className="w-2 h-2 rounded-full bg-neon glow-pulse inline-block" />
          5 services running · ~15MB total
        </div>
      </div>
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2">
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
      </div>
    </section>
  )
}
