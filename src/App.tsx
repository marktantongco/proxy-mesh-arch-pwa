import { useState, useEffect } from 'react'
import HeroSection from './components/HeroSection'
import StatsBar from './components/StatsBar'
import ArchitectureDiagram from './components/ArchitectureDiagram'
import TrafficFlow from './components/TrafficFlow'
import EvolutionTimeline from './components/EvolutionTimeline'
import ChatSection from './components/ChatSection'
import Footer from './components/Footer'

const tabs = [
  { id: 'architecture', label: 'Architecture' },
  { id: 'traffic', label: 'Traffic' },
  { id: 'evolution', label: 'Evolution' },
  { id: 'chat', label: 'Chat' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('architecture')

  useEffect(() => {
    const el = document.getElementById(activeTab)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveTab(entry.target.id)
          }
        }
      },
      { threshold: 0.3 }
    )

    tabs.forEach((t) => {
      const el = document.getElementById(t.id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  const scrollTo = (id: string) => {
    setActiveTab(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="scanline min-h-screen">
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-40">
        <div className="flex items-center gap-1 px-2 py-1.5 rounded-full bg-cyber/80 backdrop-blur-md border border-white/5">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => scrollTo(t.id)}
              className={`px-3 py-1 rounded-full text-[11px] font-mono tracking-wider transition-all duration-200 ${
                activeTab === t.id
                  ? 'bg-neon/10 text-neon border border-neon/20'
                  : 'text-gray-500 hover:text-gray-300 border border-transparent'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <HeroSection />
      <StatsBar />
      <ArchitectureDiagram />
      <TrafficFlow />
      <EvolutionTimeline />
      <ChatSection />
      <Footer />
    </div>
  )
}
