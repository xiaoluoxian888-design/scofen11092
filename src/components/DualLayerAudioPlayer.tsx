import React, { useEffect, useRef, useState } from 'react';
import { Submission, User } from '../types/schema';
import { audioEngine } from '../services/audioEngine';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX,
  Radio,
  Sliders,
  Sparkles,
  Headphones
} from 'lucide-react';

interface DualLayerAudioPlayerProps {
  currentTrack: Submission | null;
  currentUser: User;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onToggleSubscription?: () => void;
  onOpenUserProfile?: (userId: string) => void;
}

export const DualLayerAudioPlayer: React.FC<DualLayerAudioPlayerProps> = ({
  currentTrack,
  currentUser,
  isPlaying,
  onTogglePlay,
  onOpenUserProfile,
}) => {
  const [playbackSeconds, setPlaybackSeconds] = useState(0);
  const [volume, setVolume] = useState(0.6);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);

  const fullDuration = currentTrack?.duration_seconds || 180;

  useEffect(() => {
    setPlaybackSeconds(0);
  }, [currentTrack?.id]);

  useEffect(() => {
    if (isPlaying && currentTrack) {
      const audioSource = currentTrack.audio_url || currentTrack.audio_preset || 'cyber_bass';
      audioEngine.play(audioSource, (sec) => {
        setPlaybackSeconds(sec);
      });
    } else {
      audioEngine.pause();
    }
  }, [isPlaying, currentTrack]);

  useEffect(() => {
    audioEngine.setVolume(volume);
  }, [volume]);

  // Real-time canvas FFT visualizer with Jade Green music frequency gradient
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderWave = () => {
      const analyser = audioEngine.getAnalyser();
      if (analyser && isPlaying) {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / bufferLength) * 2.2;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height;
          // Jade green aesthetic hue ~ 155
          const hue = 152 + (i / bufferLength) * 25;
          ctx.fillStyle = `hsl(${hue}, 80%, ${dataArray[i] > 180 ? '60%' : '45%'})`;
          ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
          x += barWidth;
        }
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#27272a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
      }

      animationFrameId.current = requestAnimationFrame(renderWave);
    };

    renderWave();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isPlaying]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = Math.min(100, (playbackSeconds / fullDuration) * 100);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 border-t border-zinc-800/80 backdrop-blur-lg px-4 py-3 shadow-2xl">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Track Info with artwork */}
        <div className="flex items-center space-x-3.5 w-full md:w-1/4">
          <div className="w-[50px] h-[50px] rounded-xl bg-gradient-to-br from-emerald-600 via-teal-800 to-zinc-950 border border-zinc-800 flex items-center justify-center relative overflow-hidden shrink-0 shadow-md">
            <img
              src="/assets/aistudio/image_e3f3963a_63143619.jpg"
              alt="Scofen Music"
              className={`w-full h-full object-cover transition-all duration-300 ${
                isPlaying ? 'scale-105 opacity-100' : 'opacity-85'
              }`}
            />
            {isPlaying && (
              <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none border border-emerald-500/40" />
            )}
          </div>

          <div className="truncate">
            <div className="text-xs sm:text-sm font-semibold text-white truncate flex items-center space-x-2">
              <span>{currentTrack ? currentTrack.track_title : 'Select a Track'}</span>
              {currentTrack && currentTrack.final_score >= 88.0 && (
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                  TOP 1%
                </span>
              )}
            </div>
            <div className="text-xs text-zinc-400 truncate flex items-center space-x-1.5 mt-0.5">
              {currentTrack?.owner && onOpenUserProfile ? (
                <button
                  type="button"
                  onClick={() => onOpenUserProfile(currentTrack.owner!.id)}
                  className="inline-flex items-center space-x-1 hover:text-emerald-400 cursor-pointer group text-zinc-300 font-medium transition-colors"
                  title={`View ${currentTrack.owner.first_name}'s public profile`}
                >
                  <span className="w-3.5 h-3.5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[7px] font-bold text-zinc-300 group-hover:border-emerald-500 group-hover:text-emerald-400 transition-colors">
                    {currentTrack.owner.first_name[0]}
                  </span>
                  <span className="underline underline-offset-2">
                    {currentTrack.owner.first_name} {currentTrack.owner.last_name}
                  </span>
                </button>
              ) : (
                <span>{currentTrack?.owner ? `${currentTrack.owner.first_name} ${currentTrack.owner.last_name}` : 'Scofen Discovery'}</span>
              )}
              <span>•</span>
              <span className="text-emerald-400 font-medium font-mono text-[11px]">
                Producer Master
              </span>
            </div>
          </div>
        </div>

        {/* Transport & Frequency Visualizer */}
        <div className="flex flex-col items-center w-full md:w-2/4 max-w-xl">
          <div className="flex items-center space-x-4 mb-1.5">
            <button
              onClick={onTogglePlay}
              disabled={!currentTrack}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                !currentTrack
                  ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                  : isPlaying
                  ? 'bg-emerald-500 text-zinc-950 shadow-[0_0_20px_rgba(16,185,129,0.35)] hover:bg-emerald-400 scale-105'
                  : 'bg-white text-zinc-950 hover:bg-zinc-200 shadow-md'
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>

            {/* Real-time FFT Visualizer */}
            <div className="w-44 sm:w-60 h-7 bg-zinc-900/90 rounded-lg border border-zinc-800/80 px-1 py-0.5 flex items-center shadow-inner">
              <canvas ref={canvasRef} width={256} height={24} className="w-full h-full" />
            </div>

            {/* Time display */}
            <div className="text-xs text-zinc-400 shrink-0 font-medium font-mono">
              <span>{formatTime(playbackSeconds)} / {formatTime(fullDuration)}</span>
            </div>
          </div>

          {/* Track Progress Slider */}
          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-200"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Right: Producer Audio Status & Volume */}
        <div className="hidden md:flex items-center justify-end space-x-4 w-1/4">
          <div className="text-right">
            <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Audio Engine</div>
            <div className="text-xs font-semibold flex items-center justify-end space-x-1.5 text-emerald-400">
              <Headphones className="w-3 h-3" />
              <span>Full Playback</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Volume2 className="w-4 h-4 text-zinc-400" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-18 accent-emerald-500 bg-zinc-800 h-1 rounded-full cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
