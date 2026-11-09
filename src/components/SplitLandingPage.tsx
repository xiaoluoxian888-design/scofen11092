import React, { useEffect, useRef } from 'react';

interface SplitLandingPageProps {
  onEnterAsHost: () => void;
  onEnterAsArtist: () => void;
  onOpenLoginModal: () => void;
  onOpenHostMarketing?: () => void;
}

interface NetworkNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isCurator: boolean;
  pulsePhase: number;
}

interface DataPacket {
  fromIdx: number;
  toIdx: number;
  progress: number;
  speed: number;
  color: string;
}

export const SplitLandingPage: React.FC<SplitLandingPageProps> = ({
  onEnterAsHost,
  onEnterAsArtist,
  onOpenLoginModal,
  onOpenHostMarketing,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const NODE_COUNT = 46;
    const MAX_DIST = 210;

    const nodes: NetworkNode[] = Array.from({ length: NODE_COUNT }, (_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.45,
      radius: i % 6 === 0 ? 3.5 : 2,
      isCurator: i % 6 === 0,
      pulsePhase: Math.random() * Math.PI * 2,
    }));

    const packets: DataPacket[] = [];

    const spawnPacket = () => {
      if (packets.length > 28) return;
      const fromIdx = Math.floor(Math.random() * nodes.length);
      const fromNode = nodes[fromIdx];
      // Find a nearby node
      for (let attempt = 0; attempt < 8; attempt++) {
        const toIdx = Math.floor(Math.random() * nodes.length);
        if (toIdx === fromIdx) continue;
        const toNode = nodes[toIdx];
        const dx = toNode.x - fromNode.x;
        const dy = toNode.y - fromNode.y;
        const dist = Math.hypot(dx, dy);
        if (dist < MAX_DIST) {
          packets.push({
            fromIdx,
            toIdx,
            progress: 0,
            speed: 0.012 + Math.random() * 0.018,
            color: fromNode.isCurator || toNode.isCurator ? '#22d3ee' : '#10b981',
          });
          break;
        }
      }
    };

    const render = () => {
      ctx.fillStyle = 'rgba(9, 9, 11, 0.28)';
      ctx.fillRect(0, 0, width, height);

      // Update & draw nodes
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x += n.vx;
        n.y += n.vy;
        n.pulsePhase += 0.03;

        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;

        // Draw edges to nearby nodes
        for (let j = i + 1; j < nodes.length; j++) {
          const m = nodes[j];
          const dx = m.x - n.x;
          const dy = m.y - n.y;
          const dist = Math.hypot(dx, dy);
          if (dist < MAX_DIST) {
            const alpha = (1 - dist / MAX_DIST) * 0.22;
            ctx.strokeStyle =
              n.isCurator || m.isCurator
                ? `rgba(34, 211, 238, ${alpha})`
                : `rgba(16, 185, 129, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(m.x, m.y);
            ctx.stroke();
          }
        }
      }

      // Spawn & draw data stream packets
      if (Math.random() < 0.25) {
        spawnPacket();
      }

      for (let i = packets.length - 1; i >= 0; i--) {
        const p = packets[i];
        p.progress += p.speed;
        if (p.progress >= 1) {
          packets.splice(i, 1);
          continue;
        }
        const from = nodes[p.fromIdx];
        const to = nodes[p.toIdx];
        const px = from.x + (to.x - from.x) * p.progress;
        const py = from.y + (to.y - from.y) * p.progress;

        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(px, py, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw node cores
      for (const n of nodes) {
        const pulse = (Math.sin(n.pulsePhase) + 1) * 0.5;
        ctx.fillStyle = n.isCurator
          ? `rgba(34, 211, 238, ${0.55 + pulse * 0.35})`
          : `rgba(16, 185, 129, ${0.45 + pulse * 0.35})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    ctx.fillStyle = '#09090B';
    ctx.fillRect(0, 0, width, height);
    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="relative min-h-screen w-full bg-zinc-950 text-zinc-100 font-sans flex flex-col select-none selection:bg-emerald-500 selection:text-zinc-950">
      {/* Node-to-Node Data Stream Canvas Background */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full pointer-events-none z-0"
      />

      {/* Top Masthead & Authoritative Utility Banner */}
      <header className="relative z-10 w-full bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 shrink-0">
        <div className="w-full px-6 sm:px-10 py-2.5 border-b border-zinc-800/80 flex items-center justify-between font-mono text-[11px] uppercase tracking-widest text-zinc-400">
          <span className="font-bold text-white tracking-[0.2em]">SCOFEN.COM // PROTOCOL v2.4</span>
          <span className="hidden sm:inline text-zinc-500">50:50 ASYMMETRIC DISCOVERY INFRASTRUCTURE</span>
          <span className="text-emerald-400 font-semibold">● LIVE LEDGER</span>
        </div>
        <div className="py-4 px-6 text-center bg-zinc-900/40">
          <h1 className="text-sm sm:text-lg md:text-xl font-black tracking-tight uppercase leading-snug text-white">
            SCOFEN: THE HARDCORE INDUSTRY STANDARD FOR MUSIC CURATION AND ABSOLUTE DISCOVERY.
          </h1>
        </div>
      </header>

      {/* Main Section: Two Perfectly Equal Vertical Halves */}
      <main className="relative z-10 flex-1 grid grid-cols-1 md:grid-cols-2 w-full">
        {/* Left Column Terminal - ENTER AS HOST */}
        <section className="flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-zinc-800/80 px-8 sm:px-14 lg:px-20 py-8">
          <div className="w-full max-w-md flex flex-col items-start space-y-5 bg-zinc-900/75 backdrop-blur-md border border-zinc-800/90 rounded-3xl p-8 shadow-2xl">
            <div className="w-full flex items-center justify-between font-mono text-[11px] uppercase tracking-widest text-zinc-400 border-b border-zinc-800 pb-3">
              <span className="text-emerald-400 font-bold">01 // ENTER AS HOST</span>
              <span>CURATOR JURISDICTION</span>
            </div>

            <div className="space-y-1.5 w-full">
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white leading-none">
                HOST TERMINAL
              </h2>
              <p className="font-mono text-xs uppercase tracking-wider text-emerald-400 font-semibold">
                Vetted Curators, Independent Labels, Domain Owners
              </p>
            </div>

            <p className="text-xs sm:text-sm leading-relaxed text-zinc-300">
              Activate your jurisdiction. Host custom genre contests, curate with a 50:50 power split against the crowd, and secure a clean 30% platform utility fee on all entries.
            </p>

            {/* Key Protocol Specs */}
            <div className="w-full grid grid-cols-3 border-t border-b border-zinc-800 py-3 font-mono text-xs">
              <div>
                <div className="text-[10px] uppercase text-zinc-500">Power Split</div>
                <div className="font-bold text-white mt-0.5">50 : 50</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-zinc-500">Host Share</div>
                <div className="font-bold text-emerald-400 mt-0.5">70% Pool</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-zinc-500">Authority</div>
                <div className="font-bold text-white mt-0.5">100+ PTS</div>
              </div>
            </div>

            <button
              type="button"
              onClick={onEnterAsHost}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 py-3.5 px-6 rounded-2xl text-xs sm:text-sm font-black uppercase tracking-widest cursor-pointer text-center transition-colors shadow-lg shadow-emerald-500/20"
            >
              ACTIVATE JURISDICTION -&gt;
            </button>

            {onOpenHostMarketing && (
              <button
                type="button"
                onClick={onOpenHostMarketing}
                className="text-[11px] font-mono text-zinc-400 hover:text-emerald-400 transition-colors cursor-pointer text-center w-full"
              >
                Curator Briefing &amp; Economics Overview →
              </button>
            )}
          </div>
        </section>

        {/* Right Column Terminal - ENTER AS ARTIST */}
        <section className="flex flex-col items-center justify-center px-8 sm:px-14 lg:px-20 py-8">
          <div className="w-full max-w-md flex flex-col items-start space-y-5 bg-zinc-900/75 backdrop-blur-md border border-zinc-800/90 rounded-3xl p-8 shadow-2xl">
            <div className="w-full flex items-center justify-between font-mono text-[11px] uppercase tracking-widest text-zinc-400 border-b border-zinc-800 pb-3">
              <span className="text-emerald-400 font-bold">02 // ENTER AS ARTIST</span>
              <span>COMPETENCE CRUCIBLE</span>
            </div>

            <div className="space-y-1.5 w-full">
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white leading-none">
                ARTIST CRUCIBLE
              </h2>
              <p className="font-mono text-xs uppercase tracking-wider text-emerald-400 font-semibold">
                Serious Independent Recording Artists
              </p>
            </div>

            <p className="text-xs sm:text-sm leading-relaxed text-zinc-300">
              Submit your work for absolute mathematical verification. No algorithmic gaming, no soft padding. Competence evaluated by weighted crowd logic and professional curation under the 50:50 distortion-kill matrix.
            </p>

            {/* Key Protocol Specs */}
            <div className="w-full grid grid-cols-3 border-t border-b border-zinc-800 py-3 font-mono text-xs">
              <div>
                <div className="text-[10px] uppercase text-zinc-500">Crowd Pool</div>
                <div className="font-bold text-white mt-0.5">$5.00 Entry</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-zinc-500">Scoring</div>
                <div className="font-bold text-emerald-400 mt-0.5">Weighted</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-zinc-500">Royalty</div>
                <div className="font-bold text-white mt-0.5">70–80%</div>
              </div>
            </div>

            <button
              type="button"
              onClick={onEnterAsArtist}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 py-3.5 px-6 rounded-2xl text-xs sm:text-sm font-black uppercase tracking-widest cursor-pointer text-center transition-colors shadow-lg shadow-emerald-500/20"
            >
              SUBMIT COMPETENCE -&gt;
            </button>
          </div>
        </section>
      </main>

      {/* Bottom Login Bar */}
      <footer className="relative z-10 w-full bg-zinc-950/80 backdrop-blur-md border-t border-zinc-800 py-3 px-6 text-center shrink-0">
        <button
          type="button"
          onClick={onOpenLoginModal}
          className="text-xs font-mono text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          Already have an account?{' '}
          <span className="text-emerald-400 hover:text-emerald-300 font-bold underline underline-offset-4">
            Log in here
          </span>
        </button>
      </footer>
    </div>
  );
};
