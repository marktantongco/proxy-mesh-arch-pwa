export default function Footer() {
  return (
    <footer className="py-10 px-4 border-t border-white/5">
      <div className="max-w-3xl mx-auto text-center">
        <p className="font-mono text-[10px] text-muted tracking-widest uppercase mb-2">
          ~/proxy-mesh-arch
        </p>
        <p className="text-xs text-gray-600 font-mono">
          <span className="text-neon">$</span> cat /etc/proxy-mesh/CONTEXT.md
        </p>
        <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-muted font-mono">
          <span>github.com/marktantongco/proxy-mesh-arch</span>
          <span>·</span>
          <span>MIT</span>
          <span>·</span>
          <span>
            <span className="text-neon">_</span> 2026
          </span>
        </div>
      </div>
    </footer>
  )
}
