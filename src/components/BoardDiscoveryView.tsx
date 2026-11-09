import React, { useState, useMemo } from 'react';
import { Board, Submission, User } from '../types/schema';
import { apiClient } from '../services/apiClient';
import { 
  Compass, 
  Search, 
  Filter, 
  Sparkles, 
  Upload, 
  Play, 
  Pause, 
  CheckCircle2, 
  Sliders, 
  Award, 
  Coins, 
  Film, 
  Radio, 
  Mic2, 
  Gamepad2, 
  Flame, 
  ShieldCheck, 
  Layers, 
  ChevronRight, 
  DollarSign,
  ArrowRight,
  Music2,
  Lock,
  ChevronDown,
  Headphones,
  FileAudio,
  Trash2,
  Volume2
} from 'lucide-react';
import { calculateCuratorEntryFee } from '../services/mathEngine';

interface BoardDiscoveryViewProps {
  boards: Board[];
  currentUser: User;
  onRefreshBoards: () => void;
  onPlayTrack: (submission: Submission) => void;
  currentTrackId?: string;
  isPlaying?: boolean;
  onNavigateToMyBoards?: () => void;
  studioTracks?: Submission[];
  onNavigateToStudio?: () => void;
  onOpenBoard?: (boardId: string) => void;
  onOpenUserProfile?: (userId: string) => void;
}

export const BoardDiscoveryView: React.FC<BoardDiscoveryViewProps> = ({
  boards,
  currentUser,
  onRefreshBoards,
  onPlayTrack,
  currentTrackId,
  isPlaying,
  onNavigateToMyBoards,
  studioTracks: propStudioTracks,
  onNavigateToStudio,
  onOpenBoard,
  onOpenUserProfile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [selectedGenreFilter, setSelectedGenreFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'featured' | 'curator_fee' | 'ledger' | 'subs'>('featured');

  // Battlefield inspection modal or drawer
  const [inspectingBoardId, setInspectingBoardId] = useState<string | null>(null);
  const [boardDetail, setBoardDetail] = useState<{ board: Board; submissions: Submission[] } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Quick Submit Modal
  const [submitTargetBoard, setSubmitTargetBoard] = useState<Board | null>(null);
  const [submitSourceType, setSubmitSourceType] = useState<'studio' | 'upload'>('studio');
  const [selectedStudioTrackId, setSelectedStudioTrackId] = useState<string>('');
  const [userStudioCatalog, setUserStudioCatalog] = useState<Submission[]>(
    (propStudioTracks || []).filter((t) => t.owner_id === currentUser.id)
  );
  const [loadingStudioCatalog, setLoadingStudioCatalog] = useState(false);

  const [submitTrackTitle, setSubmitTrackTitle] = useState('New Horizon (Original Mix)');
  const [submitPreset, setSubmitPreset] = useState('cyber_bass');
  const [submitGenre, setSubmitGenre] = useState('');
  const [submitLyrics, setSubmitLyrics] = useState('');
  const [submitAboutTrack, setSubmitAboutTrack] = useState('');
  const [submitAudioFile, setSubmitAudioFile] = useState<File | null>(null);
  const [submitAudioFileName, setSubmitAudioFileName] = useState('');
  const [submitAudioFileSize, setSubmitAudioFileSize] = useState('');
  const [submitAudioDataUrl, setSubmitAudioDataUrl] = useState<string | null>(null);
  const [submitAudioDuration, setSubmitAudioDuration] = useState<number>(180);
  const [isSubmitAudioPlaying, setIsSubmitAudioPlaying] = useState(false);
  const submitAudioPreviewRef = React.useRef<HTMLAudioElement | null>(null);
  const submitFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [submitEntryMode, setSubmitEntryMode] = useState<'crowd_pool' | 'curator_skip'>('crowd_pool');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Map of boards the user has entered
  const enteredBoardMap = useMemo(() => {
    const map = new Map<string, Submission[]>();
    (userStudioCatalog || []).forEach((sub) => {
      if (sub.board_id && sub.board_id.trim() !== '') {
        const list = map.get(sub.board_id) || [];
        list.push(sub);
        map.set(sub.board_id, list);
      }
    });
    return map;
  }, [userStudioCatalog]);

  React.useEffect(() => {
    if (propStudioTracks && propStudioTracks.length > 0) {
      setUserStudioCatalog(propStudioTracks.filter((t) => t.owner_id === currentUser.id));
    } else if (currentUser?.id) {
      apiClient.getUserProfile(currentUser.id).then((profile) => {
        if (profile?.submittedTracks) {
          setUserStudioCatalog(profile.submittedTracks);
        }
      }).catch(() => {});
    }
  }, [propStudioTracks, currentUser?.id]);

  const handleSubmitFileSelected = (file: File) => {
    setSubmitAudioFile(file);
    setSubmitAudioFileName(file.name);
    setSubmitAudioFileSize((file.size / (1024 * 1024)).toFixed(1) + ' MB');
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    if (!submitTrackTitle || submitTrackTitle.includes('New Horizon') || submitTrackTitle.includes('Original Mix')) {
      setSubmitTrackTitle(baseName);
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setSubmitAudioDataUrl(dataUrl);
      try {
        const tempAudio = new Audio(dataUrl);
        tempAudio.onloadedmetadata = () => {
          if (tempAudio.duration && !isNaN(tempAudio.duration)) {
            setSubmitAudioDuration(Math.round(tempAudio.duration));
          }
        };
      } catch {}
    };
    reader.readAsDataURL(file);
  };

  const handleToggleSubmitPreviewPlay = () => {
    if (!submitAudioDataUrl) return;
    if (!submitAudioPreviewRef.current) {
      submitAudioPreviewRef.current = new Audio(submitAudioDataUrl);
      submitAudioPreviewRef.current.onended = () => setIsSubmitAudioPlaying(false);
    }
    if (isSubmitAudioPlaying) {
      submitAudioPreviewRef.current.pause();
      setIsSubmitAudioPlaying(false);
    } else {
      submitAudioPreviewRef.current.play().catch(() => {});
      setIsSubmitAudioPlaying(true);
    }
  };

  const handleRemoveSubmitFile = () => {
    if (submitAudioPreviewRef.current) {
      submitAudioPreviewRef.current.pause();
    }
    setSubmitAudioFile(null);
    setSubmitAudioFileName('');
    setSubmitAudioFileSize('');
    setSubmitAudioDataUrl(null);
    setIsSubmitAudioPlaying(false);
  };

  const presets = [
    { id: 'cyber_bass', name: 'Cyber Sub-Bass 128 BPM', genre: 'Industrial / Club', desc: 'Punchy transient side-chain compression' },
    { id: 'analog_soul', name: 'Analog Rhodes Soul 92 BPM', genre: 'Neo-Soul / Lo-Fi', desc: 'Warm acoustic dynamic chords' },
    { id: 'hyper_drill', name: 'Hyper Drill 808 Glide 142 BPM', genre: 'Drill / Trap', desc: 'Rapid hats and subterranean slides' },
    { id: 'modular_hook', name: 'Modular Arpeggiator Lead', genre: 'Synthwave', desc: 'Melodic commercial hook stickiness' },
    { id: 'ambient_void', name: 'Quantum Spatial Void', genre: 'Cinematic / Sync', desc: 'Sync cinematic drone textures' },
  ];

  // Specific opportunity types as requested
  const opportunityTypes = [
    { id: 'all', label: 'All Opportunities', icon: <Compass className="w-3.5 h-3.5" /> },
    { id: 'Sync for action movie', label: 'Sync for action movie', icon: <Film className="w-3.5 h-3.5 text-amber-400" /> },
    { id: 'Label A&R signing singer', label: 'Label A&R signing singer', icon: <Mic2 className="w-3.5 h-3.5 text-rose-400" /> },
    { id: 'Indie Game OST Placement', label: 'Indie Game OST Placement', icon: <Gamepad2 className="w-3.5 h-3.5 text-cyan-400" /> },
    { id: 'Festival Stage Showcase', label: 'Festival Stage Showcase', icon: <Flame className="w-3.5 h-3.5 text-orange-400" /> },
    { id: 'Club DJ Rotation & Peak Time', label: 'Club DJ Rotation & Peak Time', icon: <Radio className="w-3.5 h-3.5 text-emerald-400" /> },
  ];

  // Distinct genres
  const genres = [
    'all',
    'Cyberpunk & Club Synthwave',
    'Analog Neo-Soul & R&B',
    'Pop & Vocal Melodic',
    'Cinematic & Orchestral',
    'Hip-Hop / Drill & Bass',
  ];

  // Filtered & sorted boards
  const filteredBoards = useMemo(() => {
    return boards.filter((b) => {
      // Type filter
      if (selectedTypeFilter !== 'all') {
        const bType = b.board_type || '';
        if (!bType.toLowerCase().includes(selectedTypeFilter.toLowerCase())) {
          return false;
        }
      }

      // Genre filter
      if (selectedGenreFilter !== 'all') {
        const bGenre = b.genre || '';
        if (!bGenre.toLowerCase().includes(selectedGenreFilter.toLowerCase())) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = b.title.toLowerCase().includes(q);
        const matchDesc = (b.description || '').toLowerCase().includes(q);
        const matchGenre = (b.genre || '').toLowerCase().includes(q);
        const matchType = (b.board_type || '').toLowerCase().includes(q);
        const matchHost = b.host ? `${b.host.first_name} ${b.host.last_name}`.toLowerCase().includes(q) : false;
        if (!matchTitle && !matchDesc && !matchGenre && !matchType && !matchHost) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'curator_fee') return b.entry_fee - a.entry_fee;
      if (sortBy === 'ledger') return b.ledger_balance - a.ledger_balance;
      if (sortBy === 'subs') return (b.submissions_count || 0) - (a.submissions_count || 0);
      return (b.host?.influence_points || 0) - (a.host?.influence_points || 0);
    });
  }, [boards, selectedTypeFilter, selectedGenreFilter, searchQuery, sortBy]);

  // Total stats
  const totalLedger = useMemo(() => {
    return boards.reduce((acc, b) => acc + (b.ledger_balance || 0), 0);
  }, [boards]);

  // Handle Inspect Battlefield
  const handleInspectBoard = async (boardId: string) => {
    if (inspectingBoardId === boardId) {
      setInspectingBoardId(null);
      setBoardDetail(null);
      return;
    }
    setInspectingBoardId(boardId);
    setLoadingDetail(true);
    try {
      const data = await apiClient.getBoard(boardId);
      setBoardDetail(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Open Submit Modal for a board
  const handleOpenSubmit = async (board: Board) => {
    setSubmitTargetBoard(board);
    setSubmitGenre(board.genre || 'Electronic');
    setSubmitTrackTitle(`Original Track - For ${board.title.slice(0, 24)}...`);
    setSubmitEntryMode('crowd_pool');
    setSubmitError(null);
    setSubmitSuccess(null);

    // Fetch fresh user studio tracks
    setLoadingStudioCatalog(true);
    try {
      const profile = await apiClient.getUserProfile(currentUser.id);
      const tracks = profile.submittedTracks || [];
      setUserStudioCatalog(tracks);
      if (tracks.length > 0) {
        setSubmitSourceType('studio');
        setSelectedStudioTrackId(tracks[0].song_id || tracks[0].id);
      } else {
        setSubmitSourceType('upload');
      }
    } catch (err) {
      console.error('Failed to load studio tracks', err);
      setSubmitSourceType('upload');
    } finally {
      setLoadingStudioCatalog(false);
    }
  };

  // Submit track logic
  const handleExecuteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitTargetBoard) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      if (submitSourceType === 'studio') {
        if (!selectedStudioTrackId) {
          throw new Error('Please select a song from your Studio');
        }
        await apiClient.enterSongIntoBoard(
          selectedStudioTrackId,
          submitTargetBoard.id,
          submitEntryMode
        );
        const chosenSong = userStudioCatalog.find(
          (s) => (s.song_id || s.id) === selectedStudioTrackId
        );
        setSubmitSuccess(
          `"${chosenSong?.track_title || 'Selected song'}" from your Studio entered into ${submitTargetBoard.title}!`
        );
      } else {
        if (!submitTrackTitle.trim()) {
          throw new Error('Track title is required');
        }
        const createdSub = await apiClient.createSubmission(
          submitTargetBoard.id,
          currentUser.id,
          submitTrackTitle,
          submitEntryMode,
          'cyber_bass',
          submitLyrics,
          submitGenre,
          submitAboutTrack,
          submitAudioDataUrl || undefined,
          submitAudioDuration || 180
        );
        setSubmitSuccess(
          `"${createdSub.track_title}" created in your Studio and entered into ${submitTargetBoard.title}!`
        );
      }
      onRefreshBoards();
      handleRemoveSubmitFile();
      setSubmitAboutTrack('');
      setTimeout(() => {
        setSubmitTargetBoard(null);
        setSubmitSuccess(null);
      }, 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Submission failed';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-800/80 p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <Compass className="w-5 h-5 text-emerald-400 stroke-[2.2]" />
              </span>
              <span className="text-xs font-mono font-bold tracking-wider text-emerald-400 uppercase">
                Curator Battlefield Directory
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Find Boards to Enter & Compete
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Explore battlefields across Hollywood sync licensing, major label A&R signings, gaming soundtracks, and prime festival slots. Submit directly for <strong className="text-emerald-400">$5.00 Crowd Pool</strong> or choose <strong className="text-zinc-200">Curator Skip</strong> for immediate evaluation.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
            <div className="px-4 py-3 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-center min-w-[120px]">
              <div className="text-[11px] text-zinc-500 uppercase font-mono font-bold">Active Boards</div>
              <div className="text-xl font-black text-white mt-0.5">{boards.length}</div>
            </div>
            <div className="px-4 py-3 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-center min-w-[130px]">
              <div className="text-[11px] text-zinc-500 uppercase font-mono font-bold">Ledger Pool</div>
              <div className="text-xl font-black text-emerald-400 mt-0.5">${totalLedger.toFixed(2)}</div>
            </div>
            {onNavigateToMyBoards && (
              <button
                onClick={onNavigateToMyBoards}
                className="px-4 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-750 border border-zinc-700/80 text-zinc-200 text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer shadow-md"
              >
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span>My Hosted Boards</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="space-y-4">
        {/* Search & Sort Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by opportunity ('Sync for action movie', 'Label A&R'), genre, or curator..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <span className="text-xs text-zinc-500 font-mono">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500/50"
            >
              <option value="featured">Host Influence (High to Low)</option>
              <option value="ledger">Ledger Pool (Highest Stakes)</option>
              <option value="curator_fee">Curator Entry Fee</option>
              <option value="subs">Most Submissions</option>
            </select>
          </div>
        </div>

        {/* Opportunity Types Pills */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-500 px-1">
            Filter by Board Opportunity Type:
          </div>
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
            {opportunityTypes.map((type) => {
              const isSelected = selectedTypeFilter === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => setSelectedTypeFilter(type.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                      : 'bg-zinc-900 text-zinc-300 border border-zinc-800 hover:border-zinc-700 hover:text-white'
                  }`}
                >
                  {type.icon}
                  <span>{type.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Genre Filter Pills */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-500 px-1">
            Filter by Music Genre:
          </div>
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
            {genres.map((g) => {
              const isSelected = selectedGenreFilter === g;
              return (
                <button
                  key={g}
                  onClick={() => setSelectedGenreFilter(g)}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-zinc-200 text-zinc-950 font-bold'
                      : 'bg-zinc-900/60 text-zinc-400 border border-zinc-800/80 hover:text-zinc-200'
                  }`}
                >
                  {g === 'all' ? 'All Genres' : g}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Boards Grid */}
      {filteredBoards.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900/30 border border-dashed border-zinc-800 rounded-3xl space-y-3">
          <Compass className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No boards match your filter</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Try selecting "All Opportunities" or reset your search query to see all available battlefields.
          </p>
          <button
            onClick={() => {
              setSelectedTypeFilter('all');
              setSelectedGenreFilter('all');
              setSearchQuery('');
            }}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-white font-semibold transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBoards.map((board) => {
            const isInspectOpen = inspectingBoardId === board.id;
            const isUserHost = board.host_id === currentUser.id;
            const curatorFee = calculateCuratorEntryFee(board.host?.influence_points || 0);
            const enteredTracks = enteredBoardMap.get(board.id) || [];
            const hasEntered = enteredTracks.length > 0;

            return (
              <div
                key={board.id}
                onClick={() => onOpenBoard?.(board.id)}
                className={`group relative flex flex-col justify-between bg-zinc-900/70 border rounded-3xl overflow-hidden transition-all duration-200 shadow-xl hover:shadow-2xl hover:shadow-emerald-950/20 cursor-pointer ${
                  hasEntered ? 'border-emerald-500/40 ring-1 ring-emerald-500/20 hover:border-emerald-500' : 'border-zinc-800/80 hover:border-zinc-600'
                }`}
              >
                {/* Banner Gradient */}
                <div className={`h-24 bg-gradient-to-r ${board.cover_gradient || 'from-emerald-700 to-teal-950'} p-4 flex flex-col justify-between relative`}>
                  <div className="flex items-center justify-between">
                    {/* Opportunity Tag & Entered Badge */}
                    <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                      <span className="text-[10px] font-bold font-mono tracking-wide uppercase px-2.5 py-1 rounded-full bg-zinc-950/80 text-emerald-400 backdrop-blur-md border border-emerald-500/30 flex items-center space-x-1 shadow-sm">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>{board.board_type || 'Custom Placement'}</span>
                      </span>

                      {/* ENTERED MARK */}
                      {hasEntered && (
                        <span className="text-[10px] font-black font-mono tracking-wide uppercase px-2.5 py-1 rounded-full bg-emerald-400 text-zinc-950 shadow-md shadow-emerald-500/50 flex items-center space-x-1 ring-1 ring-white/40">
                          <CheckCircle2 className="w-3 h-3 text-zinc-950 stroke-[3]" />
                          <span>Entered</span>
                        </span>
                      )}
                    </div>

                    {/* Genre Tag */}
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-900/80 text-zinc-300 backdrop-blur-md border border-zinc-700/60">
                      {board.genre || 'Electronic'}
                    </span>
                  </div>

                  {/* Pool badge */}
                  <div className="flex items-center justify-between text-xs text-white">
                    <span className="font-mono text-[11px] text-zinc-300 flex items-center space-x-1">
                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                      <span>Ledger Pool: <strong>${board.ledger_balance.toFixed(2)}</strong></span>
                    </span>
                    <span className="text-[11px] text-zinc-300 font-mono">
                      {board.submissions_count || 0} tracks entered
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  {/* Title & Description */}
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1 flex items-center justify-between">
                      <span>{board.title}</span>
                      <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-transform group-hover:translate-x-1 shrink-0 ml-1.5" />
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1.5 line-clamp-2 leading-relaxed">
                      {board.description || 'Musicians compete in this battlefield for curator and crowd recognition, escalating to sync and distribution.'}
                    </p>
                  </div>

                  {/* If user entered this board, show their entered tracks badge */}
                  {hasEntered && (
                    <div className="p-2.5 rounded-2xl bg-emerald-950/50 border border-emerald-500/30 flex items-center justify-between">
                      <div className="flex items-center space-x-2 truncate">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="text-xs text-emerald-200 font-semibold truncate">
                          Entered: <strong className="text-white font-bold">{enteredTracks[0].track_title}</strong>
                          {enteredTracks.length > 1 && ` (+${enteredTracks.length - 1} more)`}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-emerald-400 px-2 py-0.5 rounded-md bg-emerald-500/20 shrink-0">
                        Active
                      </span>
                    </div>
                  )}

                  {/* Host info strip */}
                  <div className="flex items-center justify-between p-2.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
                    <div 
                      onClick={() => board.host && onOpenUserProfile?.(board.host.id)}
                      className="flex items-center space-x-2 cursor-pointer group"
                      title={`View ${board.host?.first_name || 'Curator'}'s public profile`}
                    >
                      <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center text-xs font-bold font-mono group-hover:border-emerald-400 group-hover:scale-105 transition-all">
                        {board.host?.first_name?.[0] || 'C'}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-zinc-200 group-hover:text-emerald-400 flex items-center space-x-1 transition-colors">
                          <span>{board.host ? `${board.host.first_name} ${board.host.last_name}` : 'Curator Host'}</span>
                          <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        </div>
                        <div className="text-[10px] font-mono text-zinc-500">
                          Authority: <strong className="text-emerald-400">{board.host?.influence_points || 0} pts</strong>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] uppercase font-mono text-zinc-500 font-bold">Curator Skip Fee</div>
                      <div className="text-xs font-black text-emerald-400 font-mono">
                        ${board.entry_fee.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Custom Evaluation Criteria Matrix Preview */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-mono uppercase font-bold tracking-wider text-zinc-500 flex justify-between">
                      <span>Unified Scorecard Matrix</span>
                      <span>50/50 Crowd:Curator</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {board.criteria && board.criteria.length > 0 ? (
                        board.criteria.map((c) => (
                          <span
                            key={c.id}
                            className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-800/80 text-zinc-300 border border-zinc-700/60"
                          >
                            {c.criterion_name}: <strong className="text-emerald-400">{c.weight}%</strong>
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-zinc-500 font-mono">Default balanced matrix</span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-zinc-800/80 flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenBoard?.(board.id);
                      }}
                      className="px-3.5 py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-750 text-white font-semibold text-xs flex items-center justify-center space-x-1.5 border border-zinc-700 transition-all cursor-pointer shrink-0"
                      title="Open dedicated board page"
                    >
                      <span>Board Page</span>
                      <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenSubmit(board);
                      }}
                      className={`flex-1 py-2.5 px-3 rounded-2xl font-bold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                        hasEntered
                          ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 shadow-sm'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-lg shadow-emerald-500/20'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{hasEntered ? 'Enter Another Track' : 'Enter Board'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Track Submission Modal for Chosen Board */}
      {submitTargetBoard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl space-y-5 p-6 relative">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-emerald-400 tracking-wider">
                  Enter Board Battlefield
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  {submitTargetBoard.title}
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Opportunity: <strong className="text-emerald-400">{submitTargetBoard.board_type || 'Sync & Distribution'}</strong>
                </p>
              </div>
              <button
                onClick={() => setSubmitTargetBoard(null)}
                className="text-zinc-500 hover:text-zinc-300 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {submitSuccess ? (
              <div className="py-8 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
                <h4 className="text-base font-bold text-white">Entry Confirmed!</h4>
                <p className="text-xs text-zinc-400">{submitSuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleExecuteSubmit} className="space-y-4">
                {/* Dual Option Switcher: Choose from Studio vs Upload at the Spot */}
                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-zinc-300">Choose Song Source</div>
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-zinc-900 border border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setSubmitSourceType('studio')}
                      className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        submitSourceType === 'studio'
                          ? 'bg-emerald-500 text-zinc-950 shadow-md'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Headphones className="w-3.5 h-3.5" />
                      <span>Choose from Studio ({userStudioCatalog.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSubmitSourceType('upload')}
                      className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        submitSourceType === 'upload'
                          ? 'bg-emerald-500 text-zinc-950 shadow-md'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload at the Spot</span>
                    </button>
                  </div>
                </div>

                {/* Option 1: Choose from Studio */}
                {submitSourceType === 'studio' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>Select Track from Your Studio:</span>
                      {onNavigateToStudio && (
                        <button
                          type="button"
                          onClick={() => {
                            setSubmitTargetBoard(null);
                            onNavigateToStudio();
                          }}
                          className="text-emerald-400 hover:underline text-[11px]"
                        >
                          Manage Studio &rarr;
                        </button>
                      )}
                    </div>

                    {loadingStudioCatalog ? (
                      <div className="p-6 text-center text-xs text-zinc-500">Loading your studio tracks...</div>
                    ) : userStudioCatalog.length === 0 ? (
                      <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-center space-y-2">
                        <div className="text-xs text-zinc-300 font-semibold">No tracks in your Studio yet</div>
                        <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                          You haven't uploaded any music yet. Switch to "Upload at the Spot" to produce your first song right now!
                        </p>
                        <button
                          type="button"
                          onClick={() => setSubmitSourceType('upload')}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-500/30 transition-colors"
                        >
                          Switch to Upload at the Spot
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {userStudioCatalog.map((t) => {
                          const canonicalId = t.song_id || t.id;
                          const isSelected = selectedStudioTrackId === canonicalId;
                          const isPlayingThis = currentTrackId === t.id && isPlaying;

                          return (
                            <div
                              key={canonicalId}
                              onClick={() => setSelectedStudioTrackId(canonicalId)}
                              className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                                isSelected
                                  ? 'bg-emerald-500/10 border-emerald-500/60 text-white shadow-md'
                                  : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                              }`}
                            >
                              <div className="flex items-center space-x-3 truncate">
                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                  isSelected ? 'border-emerald-400 bg-emerald-400' : 'border-zinc-600'
                                }`}>
                                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-zinc-950" />}
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onPlayTrack(t);
                                  }}
                                  className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-emerald-400 flex items-center justify-center shrink-0"
                                >
                                  {isPlayingThis ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                                </button>

                                <div className="truncate">
                                  <div className="text-xs font-bold text-white truncate">{t.track_title}</div>
                                  <div className="text-[10px] text-zinc-400 font-mono">
                                    {t.genre || 'Electronic'} • {t.duration_seconds || 180}s
                                  </div>
                                </div>
                              </div>

                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono shrink-0">
                                In Studio
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Option 2: Upload at the Spot */}
                {submitSourceType === 'upload' && (
                  <div className="space-y-3.5 p-3.5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>This upload will automatically create a permanent song profile in your Music Studio.</span>
                    </div>

                    {/* Real Audio File Dropzone */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                        <span>Audio File (MP3, WAV, M4A, FLAC)</span>
                        {submitAudioFileSize && <span className="text-[10px] text-emerald-400 font-mono">{submitAudioFileSize}</span>}
                      </label>
                      <input
                        type="file"
                        ref={submitFileInputRef}
                        accept="audio/*,.mp3,.wav,.m4a,.flac,.ogg,.aac"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleSubmitFileSelected(file);
                        }}
                        className="hidden"
                      />

                      {!submitAudioDataUrl ? (
                        <div
                          onClick={() => submitFileInputRef.current?.click()}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const file = e.dataTransfer.files?.[0];
                            if (file) handleSubmitFileSelected(file);
                          }}
                          className="border-2 border-dashed border-zinc-800 hover:border-emerald-500/60 rounded-2xl p-4 text-center cursor-pointer transition-all bg-zinc-900/30 hover:bg-emerald-500/5 group"
                        >
                          <FileAudio className="w-7 h-7 mx-auto text-zinc-500 group-hover:text-emerald-400 mb-2 transition-colors" />
                          <div className="text-xs font-semibold text-zinc-200">
                            Click or drop your audio track here
                          </div>
                          <div className="text-[10px] text-zinc-500 mt-0.5">
                            Real audio file playback enabled across the entire platform
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 rounded-2xl bg-zinc-900/90 border border-emerald-500/40 flex items-center justify-between gap-3">
                          <div className="flex items-center space-x-2.5 truncate">
                            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                              <Volume2 className="w-4 h-4" />
                            </div>
                            <div className="truncate">
                              <div className="text-xs font-bold text-white truncate">{submitAudioFileName}</div>
                              <div className="text-[10px] text-emerald-400 font-mono flex items-center space-x-1.5">
                                <span>{submitAudioFileSize}</span>
                                <span>•</span>
                                <span>~{submitAudioDuration}s</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0">
                            <button
                              type="button"
                              onClick={handleToggleSubmitPreviewPlay}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold flex items-center space-x-1 transition-colors"
                            >
                              {isSubmitAudioPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
                              <span>{isSubmitAudioPlaying ? 'Pause' : 'Preview'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleRemoveSubmitFile}
                              className="p-1.5 rounded-xl bg-zinc-800 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Track Title and Genre */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-300">Track Title</label>
                        <input
                          type="text"
                          value={submitTrackTitle}
                          onChange={(e) => setSubmitTrackTitle(e.target.value)}
                          required
                          className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                          placeholder="Song title..."
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-300">Genre</label>
                        <input
                          type="text"
                          value={submitGenre}
                          onChange={(e) => setSubmitGenre(e.target.value)}
                          placeholder="e.g. Electronic, Synthwave, Hip-Hop..."
                          className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    {/* About the Track (Optional) */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                        <span>About the Track</span>
                        <span className="text-[10px] text-zinc-500 font-mono">Optional</span>
                      </label>
                      <textarea
                        value={submitAboutTrack}
                        onChange={(e) => setSubmitAboutTrack(e.target.value)}
                        rows={2}
                        placeholder="Inspiration, sonic production context, equipment used, intended mood..."
                        className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-500 font-sans"
                      />
                    </div>

                    {/* Lyrics / Liner notes */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                        <span>Lyrics / Liner Notes</span>
                        <span className="text-[10px] text-zinc-500 font-mono">Optional</span>
                      </label>
                      <textarea
                        value={submitLyrics}
                        onChange={(e) => setSubmitLyrics(e.target.value)}
                        rows={2}
                        placeholder="Include song lyrics or sync placement notes..."
                        className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* Entry Mode Selection: Crowd Pool vs Curator Skip */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-bold text-zinc-300">Select Entry Funnel</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSubmitEntryMode('crowd_pool')}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        submitEntryMode === 'crowd_pool'
                          ? 'bg-emerald-500/10 border-emerald-500 text-white'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">Crowd Pool</span>
                        <span className="text-xs font-black text-emerald-400">$5.00</span>
                      </div>
                      <div className="text-[10px] text-zinc-400 mt-1 leading-tight">
                        $1.50 platform cut, $3.50 locked into board ledger for curator payout.
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSubmitEntryMode('curator_skip')}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        submitEntryMode === 'curator_skip'
                          ? 'bg-emerald-500/10 border-emerald-500 text-white'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">Curator Skip</span>
                        <span className="text-xs font-black text-emerald-400">
                          ${submitTargetBoard.entry_fee.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-400 mt-1 leading-tight">
                        Direct-to-curator rating. Skips crowd pool entirely.
                      </div>
                    </button>
                  </div>
                </div>

                {submitError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs">
                    {submitError}
                  </div>
                )}

                {/* Submit action */}
                <div className="pt-2 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setSubmitTargetBoard(null)}
                    className="px-4 py-2 text-xs text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || (submitSourceType === 'studio' && userStudioCatalog.length === 0)}
                    className="px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
                  >
                    {isSubmitting ? (
                      <span>Processing Entry...</span>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>
                          {submitSourceType === 'studio' ? 'Confirm Studio Entry' : 'Produce & Enter'} • Pay {submitEntryMode === 'crowd_pool' ? '$5.00' : `$${submitTargetBoard.entry_fee.toFixed(2)}`}
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
