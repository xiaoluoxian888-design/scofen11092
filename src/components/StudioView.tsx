import React, { useState, useEffect } from 'react';
import { Board, Submission, User, SongProfile } from '../types/schema';
import { apiClient } from '../services/apiClient';
import { 
  Headphones, 
  Upload, 
  Play, 
  Pause, 
  Sparkles, 
  Disc, 
  Music, 
  CheckCircle2, 
  Clock, 
  Sliders, 
  FileText, 
  Plus, 
  ArrowRight, 
  ExternalLink, 
  Radio, 
  Layers, 
  Lock, 
  ShieldCheck, 
  DollarSign, 
  Coins,
  ChevronRight,
  TrendingUp,
  X,
  FileAudio,
  Trash2,
  Volume2
} from 'lucide-react';

interface StudioViewProps {
  currentUser: User;
  boards: Board[];
  onPlayTrack: (submission: Submission) => void;
  currentTrackId?: string;
  isPlaying?: boolean;
  onOpenSongProfile: (songIdOrSubId: string) => void;
  onRefreshData: () => void;
  onNavigateToBoards: () => void;
  initialBoardId?: string | null;
}

export const StudioView: React.FC<StudioViewProps> = ({
  currentUser,
  boards,
  onPlayTrack,
  currentTrackId,
  isPlaying,
  onOpenSongProfile,
  onRefreshData,
  onNavigateToBoards,
  initialBoardId,
}) => {
  const [studioTracks, setStudioTracks] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  // New Track Upload Modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [trackTitle, setTrackTitle] = useState('Sonic Vanguard (Original Mix)');
  const [genre, setGenre] = useState('Cyberpunk / Synthwave');
  const [aboutTrack, setAboutTrack] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioFileName, setAudioFileName] = useState('');
  const [audioFileSize, setAudioFileSize] = useState('');
  const [audioDataUrl, setAudioDataUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(180);
  const [isPreviewAudioPlaying, setIsPreviewAudioPlaying] = useState(false);
  const previewAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Audio file selection handler
  const handleFileSelected = (file: File) => {
    setAudioFile(file);
    setAudioFileName(file.name);
    const sizeStr = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
    setAudioFileSize(sizeStr);

    const baseName = file.name.replace(/\.[^/.]+$/, "");
    if (!trackTitle || trackTitle.includes('Sonic Vanguard') || trackTitle.includes('New Track') || trackTitle.includes('Original Mix')) {
      setTrackTitle(baseName);
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setAudioDataUrl(dataUrl);

      // Measure duration
      try {
        const tempAudio = new Audio(dataUrl);
        tempAudio.onloadedmetadata = () => {
          if (tempAudio.duration && !isNaN(tempAudio.duration)) {
            setAudioDuration(Math.round(tempAudio.duration));
          }
        };
      } catch {}
    };
    reader.readAsDataURL(file);
  };

  const handleTogglePreviewPlay = () => {
    if (!audioDataUrl) return;
    if (!previewAudioRef.current) {
      previewAudioRef.current = new Audio(audioDataUrl);
      previewAudioRef.current.onended = () => setIsPreviewAudioPlaying(false);
    }
    if (isPreviewAudioPlaying) {
      previewAudioRef.current.pause();
      setIsPreviewAudioPlaying(false);
    } else {
      previewAudioRef.current.play().catch(() => {});
      setIsPreviewAudioPlaying(true);
    }
  };

  const handleRemoveFile = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }
    setAudioFile(null);
    setAudioFileName('');
    setAudioFileSize('');
    setAudioDataUrl(null);
    setIsPreviewAudioPlaying(false);
  };

  // Enter Existing Song into Board Modal
  const [enteringTrack, setEnteringTrack] = useState<Submission | null>(null);
  const [selectedEnterBoardId, setSelectedEnterBoardId] = useState<string>(boards[0]?.id || '');
  const [selectedEnterMode, setSelectedEnterMode] = useState<'crowd_pool' | 'curator_skip'>('crowd_pool');
  const [isEnteringBoard, setIsEnteringBoard] = useState(false);
  const [enterBoardError, setEnterBoardError] = useState<string | null>(null);
  const [enterBoardSuccess, setEnterBoardSuccess] = useState<string | null>(null);

  const presets = [
    { id: 'cyber_bass', name: 'Cyber Sub-Bass 128 BPM', genre: 'Industrial / Club', desc: 'Punchy transient side-chain compression' },
    { id: 'analog_soul', name: 'Analog Rhodes Soul 92 BPM', genre: 'Neo-Soul / Lo-Fi', desc: 'Warm acoustic dynamic chords' },
    { id: 'hyper_drill', name: 'Hyper Drill 808 Glide 142 BPM', genre: 'Drill / Trap', desc: 'Rapid hats and subterranean slides' },
    { id: 'modular_hook', name: 'Modular Arpeggiator Lead', genre: 'Synthwave', desc: 'Melodic commercial hook stickiness' },
    { id: 'ambient_void', name: 'Quantum Spatial Void', genre: 'Cinematic / Sync', desc: 'Sync cinematic drone textures' },
  ];

  // Fetch all user studio tracks
  const fetchStudioTracks = async () => {
    try {
      setLoading(true);
      const profileData = await apiClient.getUserProfile(currentUser.id);
      setStudioTracks(profileData.submittedTracks || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudioTracks();
  }, [currentUser.id]);

  // Handle Upload New Track to Studio (No board required, no payment required)
  const [bpm, setBpm] = useState(124);

  const handleUploadTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackTitle.trim()) {
      setUploadError('Track title is required');
      return;
    }

    setIsSubmitting(true);
    setUploadError(null);
    try {
      await apiClient.uploadStudioTrack(
        currentUser.id,
        trackTitle,
        genre || 'Electronic / Hybrid',
        'cyber_bass',
        lyrics,
        124,
        aboutTrack,
        audioDataUrl || undefined,
        audioDuration || 180
      );
      setUploadSuccess(`"${trackTitle}" saved to your Studio catalog! Ready to enter boards.`);
      await fetchStudioTracks();
      onRefreshData();
      setTimeout(() => {
        setIsUploadModalOpen(false);
        setUploadSuccess(null);
        setTrackTitle('New Track (Original Mix)');
        setLyrics('');
        setAboutTrack('');
        handleRemoveFile();
      }, 1500);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle entering existing studio song into another board
  const handleExecuteEnterBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enteringTrack || !selectedEnterBoardId) return;

    setIsEnteringBoard(true);
    setEnterBoardError(null);
    try {
      const canonicalSongId = enteringTrack.song_id || enteringTrack.id;
      const targetBoard = boards.find((b) => b.id === selectedEnterBoardId);
      await apiClient.enterSongIntoBoard(canonicalSongId, selectedEnterBoardId, selectedEnterMode);
      setEnterBoardSuccess(`Song successfully entered into ${targetBoard?.title || 'board'}!`);
      await fetchStudioTracks();
      onRefreshData();
      setTimeout(() => {
        setEnteringTrack(null);
        setEnterBoardSuccess(null);
      }, 1400);
    } catch (err) {
      setEnterBoardError(err instanceof Error ? err.message : 'Failed to enter board');
    } finally {
      setIsEnteringBoard(false);
    }
  };

  // Group unique songs in studio
  const uniqueSongs = React.useMemo(() => {
    const map = new Map<string, { main: Submission; allEntries: Submission[] }>();
    studioTracks.forEach((sub) => {
      const key = sub.song_id || sub.id;
      if (!map.has(key)) {
        map.set(key, { main: sub, allEntries: [sub] });
      } else {
        map.get(key)!.allEntries.push(sub);
      }
    });
    return Array.from(map.values());
  }, [studioTracks]);

  const selectedBoardForExisting = boards.find((b) => b.id === selectedEnterBoardId) || boards[0];

  return (
    <div className="space-y-8 pb-20">
      {/* Studio Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-800/80 p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <Headphones className="w-5 h-5 text-emerald-400 stroke-[2.2]" />
              </span>
              <span className="text-xs font-mono font-bold tracking-wider text-emerald-400 uppercase">
                Music Studio & Catalog Hub
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Artist Music Studio
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Produce, upload, and dispatch your songs to active boards. Every track receives a permanent Song Profile where you can inspect board entries, update metadata, and track crowd versus curator performance.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center space-x-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Upload New Song to Studio</span>
            </button>

            <button
              onClick={onNavigateToBoards}
              className="px-5 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs flex items-center space-x-2 border border-zinc-700/80 transition-all cursor-pointer"
            >
              <span>Explore Boards</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Studio Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-zinc-800/80">
          <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800">
            <div className="text-[10px] font-mono text-zinc-500 uppercase font-bold">Catalog Tracks</div>
            <div className="text-xl font-black text-white font-mono mt-0.5">{uniqueSongs.length}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800">
            <div className="text-[10px] font-mono text-zinc-500 uppercase font-bold">Board Entries</div>
            <div className="text-xl font-black text-emerald-400 font-mono mt-0.5">{studioTracks.length}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800">
            <div className="text-[10px] font-mono text-zinc-500 uppercase font-bold">Audio Engine</div>
            <div className="text-sm font-bold text-emerald-400 font-mono mt-1 flex items-center space-x-1">
              <Headphones className="w-3.5 h-3.5 text-emerald-400" />
              <span>Full Master</span>
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800">
            <div className="text-[10px] font-mono text-zinc-500 uppercase font-bold">Influence Weight</div>
            <div className="text-xl font-black text-cyan-400 font-mono mt-0.5">
              {(currentUser.influence_points / 10).toFixed(1)}x
            </div>
          </div>
        </div>
      </div>

      {/* Studio Track Catalog */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Studio Track Catalog</h2>
            <p className="text-xs text-zinc-400">
              Each song can enter multiple boards and holds its own permanent profile.
            </p>
          </div>
          <span className="text-xs font-mono text-zinc-500">
            {uniqueSongs.length} {uniqueSongs.length === 1 ? 'song' : 'songs'} in library
          </span>
        </div>

        {loading ? (
          <div className="text-center py-16 text-xs text-zinc-500">Loading your studio tracks...</div>
        ) : uniqueSongs.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-zinc-900/30 border border-dashed border-zinc-800 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-600">
              <Music className="w-8 h-8 text-emerald-400" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-base font-bold text-white">Your Studio is Empty</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Produce your first track using the built-in synthesizer presets or drop your lyrics to enter any active battlefield board.
              </p>
            </div>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs inline-flex items-center space-x-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Your First Track</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {uniqueSongs.map(({ main: song, allEntries }) => {
              const isTrackPlaying = currentTrackId === song.id && isPlaying;
              const canonicalSongId = song.song_id || song.id;

              return (
                <div
                  key={canonicalSongId}
                  className="p-5 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-lg"
                >
                  {/* Left: Play button, Cover, Info */}
                  <div className="flex items-start sm:items-center space-x-4">
                    <button
                      onClick={() => onPlayTrack(song)}
                      className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-md"
                    >
                      {isTrackPlaying ? (
                        <Pause className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Play className="w-5 h-5 ml-0.5 text-emerald-400" />
                      )}
                    </button>

                    <div>
                      <div className="flex items-center space-x-2 flex-wrap">
                        <h3 className="text-base font-bold text-white hover:text-emerald-400 transition-colors">
                          {song.track_title}
                        </h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {song.genre || 'Electronic'}
                        </span>
                        {song.bpm && (
                          <span className="text-[10px] font-mono text-zinc-500">
                            {song.bpm} BPM
                          </span>
                        )}
                      </div>

                      {(() => {
                        const validEntries = allEntries.filter((e) => e.board_id && e.board_id.trim() !== '');
                        return (
                          <>
                            <div className="flex items-center space-x-3 text-xs text-zinc-400 mt-1">
                              <span>Preset: <strong className="text-zinc-300">{song.audio_preset || 'synth'}</strong></span>
                              <span>•</span>
                              <span>Duration: <strong className="text-zinc-300">{song.duration_seconds || 180}s</strong></span>
                              <span>•</span>
                              {validEntries.length > 0 ? (
                                <span className="text-emerald-400 font-medium">
                                  Entered in {validEntries.length} {validEntries.length === 1 ? 'board' : 'boards'}
                                </span>
                              ) : (
                                <span className="text-emerald-400 font-medium">
                                  Available for Boards (In Studio)
                                </span>
                              )}
                            </div>

                            {/* Lyrics preview snippet if present */}
                            {song.lyrics && (
                              <p className="text-[11px] text-zinc-500 italic mt-1 line-clamp-1 max-w-xl font-mono">
                                "{song.lyrics.slice(0, 90)}..."
                              </p>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Middle / Right: Board Entries Chips & Actions */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    {/* Boards Entered Badges */}
                    <div className="flex flex-wrap gap-1.5 max-w-md">
                      {(() => {
                        const validEntries = allEntries.filter((e) => e.board_id && e.board_id.trim() !== '');
                        if (validEntries.length === 0) {
                          return (
                            <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono text-[10px] font-bold">
                              Available for Boards (0 entered)
                            </span>
                          );
                        }
                        return validEntries.map((entry) => {
                          const board = boards.find((b) => b.id === entry.board_id);
                          return (
                            <div
                              key={entry.id}
                              className="px-2.5 py-1 rounded-xl bg-zinc-950 border border-zinc-800 text-[10px] font-mono flex items-center space-x-1.5"
                            >
                              <span className="text-zinc-300 font-semibold truncate max-w-[130px]">
                                {board?.title || 'Board'}
                              </span>
                              <span className="text-emerald-400 font-bold">
                                {entry.final_score > 0 ? `${entry.final_score.toFixed(1)}p` : 'In Review'}
                              </span>
                              {entry.is_locked && (
                                <span title="Rating Locked">
                                  <Lock className="w-2.5 h-2.5 text-zinc-500" />
                                </span>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={() => onOpenSongProfile(canonicalSongId)}
                        className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center space-x-1.5 border border-zinc-700/80 transition-all cursor-pointer"
                        title="View and edit song title, genre, lyrics, and board history"
                      >
                        <FileText className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Song Profile</span>
                      </button>

                      <button
                        onClick={() => {
                          setEnteringTrack(song);
                          setEnterBoardError(null);
                          setEnterBoardSuccess(null);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center space-x-1.5 border border-emerald-500/30 transition-all cursor-pointer"
                        title="Enter this track into another battlefield board"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Enter Board</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload New Track to Studio Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-5 relative">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center space-x-2">
                <Upload className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">Upload New Song to Studio</h3>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1"
              >
                ✕
              </button>
            </div>

            {uploadSuccess ? (
              <div className="py-8 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
                <h4 className="text-base font-bold text-white">Song Added to Studio!</h4>
                <p className="text-xs text-zinc-400">{uploadSuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleUploadTrack} className="space-y-4">
                {/* Real Audio File Upload */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-300 flex items-center space-x-1.5">
                      <FileAudio className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Audio File (MP3, WAV, FLAC, M4A, OGG)</span>
                    </label>
                    <span className="text-[10px] text-zinc-500 font-mono">Max 50MB</span>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac,.aac"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelected(file);
                    }}
                    className="hidden"
                  />

                  {!audioFile ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleFileSelected(file);
                      }}
                      className="border-2 border-dashed border-zinc-800 hover:border-emerald-500/60 rounded-2xl p-5 text-center cursor-pointer bg-zinc-900/40 hover:bg-zinc-900/80 transition-all group space-y-2"
                    >
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-200 group-hover:text-emerald-400 transition-colors">
                          Click to select audio file or drag & drop here
                        </p>
                        <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">
                          Supports high-definition master audio files
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-zinc-900 border border-emerald-500/40 flex items-center justify-between gap-3 shadow-md">
                      <div className="flex items-center space-x-3 truncate">
                        <button
                          type="button"
                          onClick={handleTogglePreviewPlay}
                          className="w-9 h-9 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20 cursor-pointer"
                          title="Preview audio"
                        >
                          {isPreviewAudioPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                        </button>
                        <div className="truncate">
                          <div className="text-xs font-bold text-white truncate flex items-center space-x-1.5">
                            <span>{audioFileName}</span>
                          </div>
                          <div className="text-[10px] text-zinc-400 font-mono flex items-center space-x-2">
                            <span>{audioFileSize}</span>
                            <span>•</span>
                            <span>{Math.floor(audioDuration / 60)}:{String(audioDuration % 60).padStart(2, '0')}</span>
                            <span>•</span>
                            <span className="text-emerald-400 font-semibold">Ready to upload</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium"
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Remove file"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Track Title and Genre */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">Track Title</label>
                    <input
                      type="text"
                      value={trackTitle}
                      onChange={(e) => setTrackTitle(e.target.value)}
                      required
                      placeholder="e.g. Velocity Shiver"
                      className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">Genre</label>
                    <input
                      type="text"
                      value={genre}
                      onChange={(e) => setGenre(e.target.value)}
                      placeholder="e.g. Cyberpunk / Club Synthwave"
                      className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Optional "About the track" field as requested */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-300">About the Track</label>
                    <span className="text-[10px] text-zinc-500 font-mono">Optional</span>
                  </div>
                  <textarea
                    value={aboutTrack}
                    onChange={(e) => setAboutTrack(e.target.value)}
                    rows={2}
                    placeholder="Tell curators and listeners the story, sync mood, or sound design behind this track..."
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Lyrics / Liner notes */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-300">Song Lyrics / Arrangement Notes</label>
                    <span className="text-[10px] text-zinc-500 font-mono">Optional</span>
                  </div>
                  <textarea
                    value={lyrics}
                    onChange={(e) => setLyrics(e.target.value)}
                    rows={2}
                    placeholder="Provide song lyrics, arrangement stems, or sync licensing notes..."
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                {/* Free Studio Upload Notice */}
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-1">
                  <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Free Music Studio Upload • No Board Required • $0.00 Cost</span>
                  </div>
                  <p className="text-[11px] text-zinc-300 leading-relaxed">
                    Upload unlimited tracks directly into your music vault. Once added, songs are available to enter any battlefield board at any time.
                  </p>
                </div>

                {uploadError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs">
                    {uploadError}
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsUploadModalOpen(false)}
                    className="px-4 py-2 text-xs text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <span>Adding to Studio...</span>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Produce & Add to Studio</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Enter Existing Studio Song into Board Modal */}
      {enteringTrack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-emerald-400 tracking-wider">
                  Enter Board from Studio
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  {enteringTrack.track_title}
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Dispatch this existing studio track to another competitive battlefield board.
                </p>
              </div>
              <button
                onClick={() => setEnteringTrack(null)}
                className="text-zinc-500 hover:text-zinc-300 p-1"
              >
                ✕
              </button>
            </div>

            {enterBoardSuccess ? (
              <div className="py-8 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
                <h4 className="text-base font-bold text-white">Board Entered!</h4>
                <p className="text-xs text-zinc-400">{enterBoardSuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleExecuteEnterBoard} className="space-y-4">
                {/* Select Board */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Select Target Board</label>
                  <select
                    value={selectedEnterBoardId}
                    onChange={(e) => setSelectedEnterBoardId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {boards.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title} — {b.board_type || b.genre} (Curator Fee: ${b.entry_fee.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Entry Funnel */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Select Entry Funnel</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedEnterMode('crowd_pool')}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        selectedEnterMode === 'crowd_pool'
                          ? 'bg-emerald-500/10 border-emerald-500 text-white'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">Crowd Pool</span>
                        <span className="text-xs font-black text-emerald-400">$5.00</span>
                      </div>
                      <div className="text-[10px] text-zinc-400 mt-1 leading-tight">
                        $1.50 Scofen, $3.50 board ledger.
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedEnterMode('curator_skip')}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        selectedEnterMode === 'curator_skip'
                          ? 'bg-emerald-500/10 border-emerald-500 text-white'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">Curator Skip</span>
                        <span className="text-xs font-black text-emerald-400">
                          ${selectedBoardForExisting.entry_fee.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-400 mt-1 leading-tight">
                        Direct-to-curator rating. Skips crowd pool.
                      </div>
                    </button>
                  </div>
                </div>

                {enterBoardError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs">
                    {enterBoardError}
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setEnteringTrack(null)}
                    className="px-4 py-2 text-xs text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isEnteringBoard}
                    className="px-6 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer"
                  >
                    {isEnteringBoard ? (
                      <span>Entering Board...</span>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>
                          Confirm & Pay {selectedEnterMode === 'crowd_pool' ? '$5.00' : `$${selectedBoardForExisting.entry_fee.toFixed(2)}`}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
