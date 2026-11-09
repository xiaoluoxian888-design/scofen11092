import React, { useState, useEffect } from 'react';
import { User, Board, Submission, LedgerEntry, InfluencePointEvent, RatedTrackReportItem } from '../types/schema';
import { apiClient } from '../services/apiClient';
import { rebalanceCriteriaWeights } from '../services/mathEngine';
import { 
  User as UserIcon, 
  Sparkles, 
  Disc, 
  Upload, 
  Receipt, 
  Cpu, 
  Layers, 
  Play, 
  Pause, 
  Lock, 
  Unlock, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  TrendingUp, 
  DollarSign, 
  ShieldCheck, 
  FileText, 
  Edit3, 
  ExternalLink,
  ChevronRight,
  Headphones,
  Sliders,
  Wallet,
  FileAudio,
  Trash2,
  Volume2
} from 'lucide-react';
import { 
  BOARD_CREATION_THRESHOLD, 
  canUserCreateBoard, 
  calculateCuratorEntryFee 
} from '../services/mathEngine';
import { InfluenceEngineConsole } from './InfluenceEngineConsole';
import { WhatIsNewFeed } from './WhatIsNewFeed';

interface UserDashboardViewProps {
  currentUser: User;
  boards: Board[];
  onPlayTrack: (submission: Submission) => void;
  currentTrackId?: string;
  isPlaying?: boolean;
  onOpenSongProfile: (songIdOrSubId: string) => void;
  onRefreshData: () => void;
  onToggleSubscription: () => void;
  onNavigateToBoard: (boardId: string) => void;
  onNavigateToIntegrations?: () => void;
  onNavigateToAssessment?: () => void;
  onOpenUserProfile?: (userId: string) => void;
}

export type DashboardTab = 'studio' | 'boards' | 'financials' | 'engine';

export const UserDashboardView: React.FC<UserDashboardViewProps> = ({
  currentUser,
  boards,
  onPlayTrack,
  currentTrackId,
  isPlaying,
  onOpenSongProfile,
  onRefreshData,
  onToggleSubscription,
  onNavigateToBoard,
  onNavigateToIntegrations,
  onNavigateToAssessment,
  onOpenUserProfile,
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('studio');
  const [userProfileData, setUserProfileData] = useState<{
    submittedTracks: Submission[];
    hostedBoards: Board[];
    influenceEvents: InfluencePointEvent[];
    ratedTracks: RatedTrackReportItem[];
  }>({
    submittedTracks: [],
    hostedBoards: [],
    influenceEvents: [],
    ratedTracks: [],
  });
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick upload modal state in studio
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadGenre, setUploadGenre] = useState('Cyberpunk / Synthwave');
  const [uploadLyrics, setUploadLyrics] = useState('');
  const [uploadAboutTrack, setUploadAboutTrack] = useState('');
  const [uploadAudioFile, setUploadAudioFile] = useState<File | null>(null);
  const [uploadAudioFileName, setUploadAudioFileName] = useState('');
  const [uploadAudioFileSize, setUploadAudioFileSize] = useState('');
  const [uploadAudioDataUrl, setUploadAudioDataUrl] = useState<string | null>(null);
  const [uploadAudioDuration, setUploadAudioDuration] = useState<number>(180);
  const [isUploadAudioPlaying, setIsUploadAudioPlaying] = useState(false);
  const uploadAudioPreviewRef = React.useRef<HTMLAudioElement | null>(null);
  const uploadFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [uploadBoardId, setUploadBoardId] = useState(boards[0]?.id || '');
  const [uploadEntryMode, setUploadEntryMode] = useState<'crowd_pool' | 'curator_skip'>('crowd_pool');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleDashboardFileSelected = (file: File) => {
    setUploadAudioFile(file);
    setUploadAudioFileName(file.name);
    setUploadAudioFileSize((file.size / (1024 * 1024)).toFixed(1) + ' MB');
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    if (!uploadTitle || uploadTitle.includes('Neon Horizon')) {
      setUploadTitle(baseName);
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setUploadAudioDataUrl(dataUrl);
      try {
        const tempAudio = new Audio(dataUrl);
        tempAudio.onloadedmetadata = () => {
          if (tempAudio.duration && !isNaN(tempAudio.duration)) {
            setUploadAudioDuration(Math.round(tempAudio.duration));
          }
        };
      } catch {}
    };
    reader.readAsDataURL(file);
  };

  const handleToggleUploadPreviewPlay = () => {
    if (!uploadAudioDataUrl) return;
    if (!uploadAudioPreviewRef.current) {
      uploadAudioPreviewRef.current = new Audio(uploadAudioDataUrl);
      uploadAudioPreviewRef.current.onended = () => setIsUploadAudioPlaying(false);
    }
    if (isUploadAudioPlaying) {
      uploadAudioPreviewRef.current.pause();
      setIsUploadAudioPlaying(false);
    } else {
      uploadAudioPreviewRef.current.play().catch(() => {});
      setIsUploadAudioPlaying(true);
    }
  };

  const handleRemoveUploadFile = () => {
    if (uploadAudioPreviewRef.current) {
      uploadAudioPreviewRef.current.pause();
    }
    setUploadAudioFile(null);
    setUploadAudioFileName('');
    setUploadAudioFileSize('');
    setUploadAudioDataUrl(null);
    setIsUploadAudioPlaying(false);
  };

  // Create board modal state
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [newBoardGenre, setNewBoardGenre] = useState('Future Bass & Club');
  const [newBoardCriteria, setNewBoardCriteria] = useState([
    { criterion_name: 'Hook Memorability', weight: 35 },
    { criterion_name: 'Mixdown Dynamics', weight: 35 },
    { criterion_name: 'Vocal Presence', weight: 30 },
  ]);
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [createBoardError, setCreateBoardError] = useState<string | null>(null);

  // Load user data & ledger
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const profile = await apiClient.getUserProfile(currentUser.id);
      setUserProfileData({
        submittedTracks: profile.submittedTracks || [],
        hostedBoards: profile.hostedBoards || [],
        influenceEvents: profile.influenceEvents || [],
        ratedTracks: profile.ratedTracks || [],
      });
      const ledger = await apiClient.getLedger();
      setLedgerEntries(ledger);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [currentUser.id]);

  // Compute financials from ledger
  const myEarnings = ledgerEntries.reduce((total, entry) => {
    if (entry.host_id === currentUser.id && (entry.type === 'CURATOR_SKIP_ENTRY' || entry.type === 'ESCALATION_PAYOUT')) {
      return total + entry.host_cut;
    }
    return total;
  }, 0);

  const myCreatedBoards = boards.filter((b) => b.host_id === currentUser.id);
  const canCreate = canUserCreateBoard(currentUser.influence_points);
  const votingWeight = (currentUser.influence_points / 10).toFixed(1);
  const curatorFeeCommand = calculateCuratorEntryFee(currentUser.influence_points);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim()) {
      setUploadError('Track title is required');
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);
      await apiClient.uploadStudioTrack(
        currentUser.id,
        uploadTitle,
        uploadGenre,
        'cyber_bass',
        uploadLyrics,
        124,
        uploadAboutTrack,
        uploadAudioDataUrl || undefined,
        uploadAudioDuration
      );
      setIsUploadOpen(false);
      setUploadTitle('');
      setUploadLyrics('');
      setUploadAboutTrack('');
      handleRemoveUploadFile();
      fetchDashboardData();
      onRefreshData();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateBoardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardTitle.trim()) {
      setCreateBoardError('Board title is required');
      return;
    }

    const weightSum = newBoardCriteria.reduce((sum, c) => sum + Number(c.weight), 0);
    if (weightSum !== 100) {
      setCreateBoardError(`Criteria weights must sum to exactly 100% (currently ${weightSum}%).`);
      return;
    }

    try {
      setIsCreatingBoard(true);
      setCreateBoardError(null);
      await apiClient.createBoard(
        currentUser.id,
        newBoardTitle,
        newBoardCriteria,
        newBoardGenre,
        'from-emerald-700 via-teal-900 to-zinc-950'
      );
      setIsCreateBoardOpen(false);
      setNewBoardTitle('');
      fetchDashboardData();
      onRefreshData();
    } catch (err) {
      setCreateBoardError(err instanceof Error ? err.message : 'Board creation failed');
    } finally {
      setIsCreatingBoard(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Profile Summary Bar */}
      <div className="relative rounded-3xl bg-zinc-900/60 border border-zinc-800/80 p-6 sm:p-8 backdrop-blur-md overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center space-x-4 sm:space-x-5">
            <div 
              onClick={() => onOpenUserProfile?.(currentUser.id)}
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-600 to-emerald-950 flex items-center justify-center text-xl font-black text-zinc-950 shadow-xl shadow-emerald-500/10 border border-emerald-400/40 flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
              title="View your public profile"
            >
              {currentUser.first_name[0]}{currentUser.last_name[0]}
            </div>
            <div>
              <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                <h1 
                  onClick={() => onOpenUserProfile?.(currentUser.id)}
                  className="text-2xl font-black text-white tracking-tight hover:text-emerald-400 cursor-pointer transition-colors"
                  title="View your public profile"
                >
                  {currentUser.first_name} {currentUser.last_name}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold tracking-wider ${
                  currentUser.role === 'admin'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : currentUser.role === 'curator'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {currentUser.role ? currentUser.role.toUpperCase() : 'ARTIST / CURATOR'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  PRODUCER WORKSTATION
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 font-mono">
                {currentUser.email}
              </p>
              {currentUser.bio && (
                <p className="text-xs text-zinc-300 mt-1.5 max-w-xl line-clamp-2">
                  {currentUser.bio}
                </p>
              )}
            </div>
          </div>

          {/* Quick Actions in Header */}
          <div className="flex items-center space-x-3 self-start md:self-center">
            <button
              onClick={() => {
                setActiveTab('studio');
                setIsUploadOpen(true);
              }}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-colors shadow-lg shadow-emerald-500/20"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Song</span>
            </button>
          </div>
        </div>

        {/* Dynamic Metric Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-zinc-800/80">
          {/* Card 1: Influence Points */}
          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80">
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold flex items-center justify-between">
              <span>Influence Points</span>
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">
              {currentUser.influence_points} <span className="text-xs font-normal text-zinc-500">PTS</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">
              Voting Weight: <strong className="text-zinc-200">{votingWeight}x</strong>
            </div>
          </div>

          {/* Card 2: Board Creator Authority */}
          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80">
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold flex items-center justify-between">
              <span>Board Host Status</span>
              <Disc className="w-3.5 h-3.5 text-teal-400" />
            </div>
            <div className="text-lg font-bold text-white mt-1">
              {canCreate ? (
                <span className="text-emerald-400 font-mono flex items-center space-x-1">
                  <ShieldCheck className="w-4 h-4 inline" />
                  <span>ELIGIBLE (≥100)</span>
                </span>
              ) : (
                <span className="text-amber-400 font-mono text-sm">
                  {currentUser.influence_points} / {BOARD_CREATION_THRESHOLD} PTS
                </span>
              )}
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">
              Curator Pricing: <strong className="text-zinc-200">${curatorFeeCommand.toFixed(2)}</strong>
            </div>
          </div>

          {/* Card 3: Financials / Royalties */}
          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80">
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold flex items-center justify-between">
              <span>Total Royalties Earned</span>
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white mt-1 font-mono">
              ${myEarnings.toFixed(2)}
            </div>
            <div className="text-[11px] text-emerald-400 font-mono mt-0.5">
              Curator & Escalation Payouts
            </div>
          </div>

          {/* Card 4: Music Catalog & Battles */}
          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80">
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold flex items-center justify-between">
              <span>Studio Catalog</span>
              <Headphones className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-white mt-1 font-mono">
              {userProfileData.submittedTracks.length} <span className="text-xs font-normal text-zinc-500">Tracks</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">
              Active in <strong className="text-zinc-200">{myCreatedBoards.length}</strong> created boards
            </div>
          </div>
        </div>
      </div>

      {/* Top Section: "What is new" Activity Feed of Followed Creators */}
      <WhatIsNewFeed
        currentUser={currentUser}
        onPlayTrack={onPlayTrack}
        currentTrackId={currentTrackId}
        isPlaying={isPlaying}
        onOpenSongProfile={onOpenSongProfile}
        onNavigateToBoard={onNavigateToBoard}
        onRefreshData={onRefreshData}
        onOpenUserProfile={onOpenUserProfile}
      />

      {/* Primary Dashboard Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-zinc-800/80 pb-2">
        <button
          onClick={() => setActiveTab('studio')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'studio'
              ? 'bg-zinc-800 text-white border border-emerald-500/40 shadow-md shadow-black/40'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <Headphones className="w-4 h-4 text-emerald-400" />
          <span>Music Studio ({userProfileData.submittedTracks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('boards')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'boards'
              ? 'bg-zinc-800 text-white border border-emerald-500/40 shadow-md shadow-black/40'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <Disc className="w-4 h-4 text-teal-400" />
          <span>My Created Boards ({myCreatedBoards.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('financials')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'financials'
              ? 'bg-zinc-800 text-white border border-emerald-500/40 shadow-md shadow-black/40'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <Receipt className="w-4 h-4 text-emerald-400" />
          <span>Financials & Royalties</span>
        </button>

        <button
          onClick={() => setActiveTab('engine')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'engine'
              ? 'bg-zinc-800 text-white border border-emerald-500/40 shadow-md shadow-black/40'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <Cpu className="w-4 h-4 text-purple-400" />
          <span>Influence Engine & Diagnostics</span>
        </button>
      </div>

      {/* =========================================================================
          SECTION 1: MUSIC STUDIO (Tracks, Song Profiles, Lyrics, Upload)
         ========================================================================= */}
      {activeTab === 'studio' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Artist Music Studio</h2>
              <p className="text-xs text-zinc-400">
                Manage your songs, edit track titles, genres & lyrics, and track performance across domain battlefields.
              </p>
            </div>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-colors shadow-lg shadow-emerald-500/20"
            >
              <Upload className="w-4 h-4" />
              <span>Upload New Song</span>
            </button>
          </div>

          {userProfileData.submittedTracks.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-zinc-900/40 border border-zinc-800 space-y-4">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-500">
                <Headphones className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white">No songs uploaded yet</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Upload your first audio track, enter it into a curator board crowd pool ($5.00) or curator skip, and track ratings.
              </p>
              <button
                onClick={() => setIsUploadOpen(true)}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-zinc-950 font-bold text-xs"
              >
                Upload First Track
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userProfileData.submittedTracks.map((track) => {
                const isThisPlaying = currentTrackId === track.id && isPlaying;
                return (
                  <div
                    key={track.id}
                    className="p-5 rounded-3xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col justify-between space-y-4 group"
                  >
                    <div className="flex items-start space-x-4">
                      {/* Artwork & Play button */}
                      <div className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br ${track.cover_gradient || 'from-emerald-600 to-teal-950'} flex-shrink-0 flex items-center justify-center shadow-lg border border-white/10 overflow-hidden`}>
                        <button
                          onClick={() => onPlayTrack(track)}
                          className="w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:scale-105 transition-transform"
                        >
                          {isThisPlaying ? (
                            <Pause className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                          ) : (
                            <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                          )}
                        </button>
                      </div>

                      {/* Track Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded text-[9px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            {track.genre || 'Electronic'}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {track.bpm || 124} BPM
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-white truncate mt-1 group-hover:text-emerald-400 transition-colors">
                          {track.track_title}
                        </h3>
                        <p className="text-xs text-zinc-400 truncate mt-0.5">
                          {track.board?.title ? (
                            <>
                              Board: <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onNavigateToBoard(track.board_id);
                                }}
                                className="text-emerald-400 hover:underline font-bold transition-colors cursor-pointer ml-1 inline-flex items-center space-x-1"
                              >
                                <span>{track.board.title}</span>
                                <span className="text-[10px]">&rarr;</span>
                              </button>
                            </>
                          ) : (
                            <span className="text-emerald-400 font-medium">Available for Boards (In Studio)</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Lyrics Preview if available */}
                    {track.lyrics && (
                      <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-[11px] font-mono text-zinc-400 italic line-clamp-2">
                        "{track.lyrics.split('\n').filter(Boolean).slice(0, 2).join(' / ')}"
                      </div>
                    )}

                    {/* Scores & Profile CTA */}
                    <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80">
                      <div className="flex items-center space-x-3 text-xs">
                        <div>
                          <span className="text-[10px] uppercase font-mono text-zinc-500 block">Combined</span>
                          <span className="font-extrabold text-emerald-400 font-mono text-sm">
                            {track.final_score > 0 ? track.final_score.toFixed(1) : '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-mono text-zinc-500 block">Status</span>
                          <span className="text-zinc-300 font-mono text-[11px]">
                            {track.is_locked ? 'Locked' : 'In Pool'}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => onOpenSongProfile(track.song_id || track.id)}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-white font-semibold text-xs border border-zinc-700 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Song Profile & Edit</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          SECTION 2: CREATED BOARDS (Battlefields Hosted by User)
         ========================================================================= */}
      {activeTab === 'boards' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Your Hosted Curator Boards</h2>
              <p className="text-xs text-zinc-400">
                Boards act as sandboxed battlefields. Entry fee is tied directly to your Influence Points: Fee = Influence × 0.1.
              </p>
            </div>

            {canCreate ? (
              <button
                onClick={() => setIsCreateBoardOpen(true)}
                className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-colors shadow-lg shadow-emerald-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Establish New Board</span>
              </button>
            ) : (
              <div className="px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 flex items-center space-x-2">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Requires 100 PTS to create a board (You have {currentUser.influence_points} PTS)</span>
              </div>
            )}
          </div>

          {myCreatedBoards.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-zinc-900/40 border border-zinc-800 space-y-4">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-500">
                <Disc className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white">No Boards Established Yet</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                {canCreate
                  ? 'You possess established architectural authority (≥100 Influence Points). Establish your custom grading criteria and host a battlefield.'
                  : `You currently have ${currentUser.influence_points} Influence Points. Achieve 100 points through consensus accuracy to open your own battlefield.`}
              </p>
              {canCreate && (
                <button
                  onClick={() => setIsCreateBoardOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 text-zinc-950 font-bold text-xs"
                >
                  Create Board Now
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myCreatedBoards.map((board) => (
                <div
                  key={board.id}
                  className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col justify-between space-y-5"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-mono uppercase bg-teal-500/10 text-teal-300 border border-teal-500/30 font-semibold">
                        {board.genre || 'Sound Domain'}
                      </span>
                      <span className="text-xs font-mono text-emerald-400 font-bold">
                        Host Fee: ${board.entry_fee.toFixed(2)}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white">{board.title}</h3>

                    {/* Criteria weights preview */}
                    <div className="mt-4 space-y-2">
                      <div className="text-[10px] font-mono uppercase text-zinc-500 font-bold">
                        Unified Scoring Matrix Weights:
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {board.criteria?.map((c) => (
                          <div key={c.id} className="p-2 rounded-xl bg-zinc-950/70 border border-zinc-800/80 text-[11px] flex justify-between items-center">
                            <span className="text-zinc-300 truncate">{c.criterion_name}</span>
                            <span className="text-emerald-400 font-mono font-bold ml-1">{c.weight}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-mono text-zinc-500 block">Escrow Pool Ledger</span>
                      <span className="text-sm font-extrabold text-white font-mono">
                        ${board.ledger_balance.toFixed(2)}
                      </span>
                    </div>

                    <button
                      onClick={() => onNavigateToBoard(board.id)}
                      className="flex items-center space-x-1 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition-colors"
                    >
                      <span>Manage Board</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          SECTION 3: FINANCIALS & ROYALTIES
         ========================================================================= */}
      {activeTab === 'financials' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Financials & Royalty Ledger</h2>
              <p className="text-xs text-zinc-400">
                Audited ledger entries, curator fees, crowd escalation pool reserves, and streaming splits.
              </p>
            </div>
            {onNavigateToIntegrations && (currentUser.role === 'admin' || currentUser.email === 'scofenreborn@gmail.com') && (
              <button
                onClick={onNavigateToIntegrations}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-xs font-semibold text-zinc-200 cursor-pointer"
              >
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Stripe & Resend Centre (Admin)</span>
              </button>
            )}
          </div>

          {/* Financial Breakdown Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
              <span className="text-[10px] uppercase font-mono text-zinc-500 font-bold block">
                Crowd Pool Logistics
              </span>
              <div className="text-xl font-black text-white font-mono mt-1">$5.00 Standard Entry</div>
              <p className="text-xs text-zinc-400 mt-1">
                70% ($3.50) held in board ledger • 30% ($1.50) Scofen software cut
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
              <span className="text-[10px] uppercase font-mono text-zinc-500 font-bold block">
                Curator Skip Split
              </span>
              <div className="text-xl font-black text-amber-400 font-mono mt-1">80 / 10 / 10</div>
              <p className="text-xs text-zinc-400 mt-1">
                80% Artist • 10% Curator • 10% Scofen Treasury
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
              <span className="text-[10px] uppercase font-mono text-zinc-500 font-bold block">
                Crowd Escalation Split
              </span>
              <div className="text-xl font-black text-emerald-400 font-mono mt-1">70 / 10 / 10 / 10</div>
              <p className="text-xs text-zinc-400 mt-1">
                70% Artist • 10% Curator • 10% Crowd Voters • 10% Scofen
              </p>
            </div>
          </div>

          {/* Transaction Ledger Table */}
          <div className="rounded-3xl bg-zinc-900/60 border border-zinc-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono">
                Recent Network Ledger Activity
              </h3>
              <span className="text-[11px] text-zinc-500 font-mono">
                {ledgerEntries.length} Records Logged
              </span>
            </div>

            {ledgerEntries.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500 font-mono">No ledger transactions recorded yet.</div>
            ) : (
              <div className="divide-y divide-zinc-800/80">
                {ledgerEntries.slice(0, 10).map((entry) => (
                  <div key={entry.id} className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-semibold text-zinc-200">
                        {entry.description || `Transaction ${entry.id.slice(0, 8)}`}
                      </div>
                      <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                        {new Date(entry.created_at).toLocaleString()} • Type: {entry.type || 'POOL_SPLIT'}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 self-end sm:self-center font-mono">
                      <span className="text-zinc-400">Total: ${entry.entry_fee.toFixed(2)}</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                        Host Cut: ${entry.host_cut.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 4: INFLUENCE ENGINE CONSOLE (Embedded)
         ========================================================================= */}
      {activeTab === 'engine' && (
        <div className="space-y-6">
          {/* Notification on Applicant's Account: Assessment in progress */}
          {currentUser.is_assessment_completed && currentUser.assessment_status === 'pending' && (
            <div className="rounded-2xl bg-amber-500/10 border border-amber-500/40 p-4 flex items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                <div>
                  <div className="text-xs sm:text-sm font-bold text-amber-300">
                    Assessment in progress
                  </div>
                  <p className="text-xs text-zinc-300">
                    Your Initial Influence Assessment has been submitted and is awaiting Admin Terminal verification.
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 font-mono text-[10px] font-bold uppercase text-amber-300 shrink-0">
                Pending Admin
              </span>
            </div>
          )}

          {/* Temporary Banner for New Users: Take Influence Assessment */}
          {!currentUser.is_assessment_completed && onNavigateToAssessment && (
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/40 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-[11px] font-mono uppercase font-bold tracking-wider text-emerald-400">
                  Single-Time Authority Calibration
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Initial Influence Point Assessment Available
                </h3>
                <p className="text-xs text-zinc-300">
                  Submit your industry affiliation, portfolio links, and curation criteria for manual Admin Terminal verification.
                </p>
              </div>
              <button
                type="button"
                onClick={onNavigateToAssessment}
                className="shrink-0 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                Take Influence Assessment
              </button>
            </div>
          )}

          {/* Rater Influence Gain/Loss Report */}
          <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>My Rater Influence Report</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Detailed breakdown of every song you have rated, its finalization status, and your influence gain or loss.
                </p>
              </div>
              {(() => {
                const finalized = userProfileData.ratedTracks.filter((t) => t.is_locked);
                const pending = userProfileData.ratedTracks.filter((t) => !t.is_locked);
                const netDelta = finalized.reduce((sum, t) => sum + (t.influence_delta || 0), 0);
                return (
                  <div className="flex items-center space-x-2 text-xs font-mono">
                    <span className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300">
                      Rated: <strong>{userProfileData.ratedTracks.length}</strong>
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300">
                      Pending: <strong>{pending.length}</strong>
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-lg border font-bold ${
                        netDelta > 0
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : netDelta < 0
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      Net: {netDelta > 0 ? `+${netDelta}` : netDelta} PTS
                    </span>
                  </div>
                );
              })()}
            </div>

            {userProfileData.ratedTracks.length === 0 ? (
              <div className="p-6 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-center text-xs text-zinc-500">
                You haven&apos;t rated any songs yet. Rate tracks on active boards to earn +1 consensus influence rewards!
              </div>
            ) : (
              <div className="space-y-2.5">
                {userProfileData.ratedTracks.map((item) => (
                  <div
                    key={item.submission_id}
                    className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => onOpenSongProfile(item.submission_id)}
                          className="text-sm font-bold text-white hover:text-emerald-400 transition-colors truncate"
                        >
                          {item.track_title}
                        </button>
                        <span className="text-xs text-zinc-500">by {item.artist_name}</span>
                        <span
                          className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${
                            item.is_locked
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400 flex items-center space-x-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => onNavigateToBoard(item.board_id)}
                          className="text-emerald-400/90 hover:text-emerald-300 font-medium"
                        >
                          {item.board_title}
                        </button>
                        <span>•</span>
                        <span className="font-mono">
                          Your Score: <strong className="text-zinc-200">{item.user_score.toFixed(1)}</strong>
                        </span>
                        <span>•</span>
                        <span className="font-mono">
                          {item.is_locked ? 'Final Score:' : 'Current Crowd:'}{' '}
                          <strong className="text-zinc-200">
                            {(item.is_locked ? item.final_score : item.crowd_rating).toFixed(1)}
                          </strong>
                        </span>
                      </div>
                      {item.influence_reason && (
                        <p className="text-[11px] text-zinc-500">{item.influence_reason}</p>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center md:justify-end">
                      {item.is_locked ? (
                        <span
                          className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold border ${
                            (item.influence_delta || 0) > 0
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : (item.influence_delta || 0) < 0
                              ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                          }`}
                        >
                          {(item.influence_delta || 0) > 0
                            ? `+${item.influence_delta} PTS`
                            : `${item.influence_delta || 0} PTS`}
                        </span>
                      ) : (
                        <span className="px-3 py-1.5 rounded-xl font-mono text-xs font-medium bg-zinc-900 text-amber-300/90 border border-zinc-800">
                          Awaiting Host
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800 p-4">
            <p className="text-xs text-zinc-400">
              The Scofen Influence Engine mathematical console is embedded directly within your dashboard. Monitor authority calibration, voter consensus bonuses (+1), and extreme penalty slashing (-1).
            </p>
          </div>
          <InfluenceEngineConsole
            currentUser={currentUser}
            allUsers={[currentUser]}
            boards={boards}
            onPlayTrack={onPlayTrack}
            onRefreshData={onRefreshData}
          />
        </div>
      )}

      {/* Upload Song Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <Upload className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Upload Track to Studio</h3>
              </div>
              <button onClick={() => setIsUploadOpen(false)} className="p-1 text-zinc-400 hover:text-white">
                ✕
              </button>
            </div>

            {uploadError && (
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* Real Audio File Dropzone */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1 font-mono uppercase flex justify-between">
                  <span>Audio File (MP3, WAV, M4A, FLAC)</span>
                  {uploadAudioFileSize && <span className="text-emerald-400 font-mono">{uploadAudioFileSize}</span>}
                </label>
                <input
                  type="file"
                  ref={uploadFileInputRef}
                  accept="audio/*,.mp3,.wav,.m4a,.flac,.ogg,.aac"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleDashboardFileSelected(file);
                  }}
                  className="hidden"
                />

                {!uploadAudioDataUrl ? (
                  <div
                    onClick={() => uploadFileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleDashboardFileSelected(file);
                    }}
                    className="border-2 border-dashed border-zinc-800 hover:border-emerald-500/60 rounded-2xl p-4 text-center cursor-pointer transition-all bg-zinc-900/30 hover:bg-emerald-500/5 group"
                  >
                    <FileAudio className="w-7 h-7 mx-auto text-zinc-500 group-hover:text-emerald-400 mb-1.5 transition-colors" />
                    <div className="text-xs font-semibold text-zinc-200">Click or drag & drop audio track</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">Real audio file plays across the whole app</div>
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl bg-zinc-900/90 border border-emerald-500/40 flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-2.5 truncate">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <Volume2 className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold text-white truncate">{uploadAudioFileName}</div>
                        <div className="text-[10px] text-emerald-400 font-mono">
                          {uploadAudioFileSize} • ~{uploadAudioDuration}s
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleToggleUploadPreviewPlay}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold flex items-center space-x-1"
                      >
                        {isUploadAudioPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
                        <span>{isUploadAudioPlaying ? 'Pause' : 'Preview'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveUploadFile}
                        className="p-1.5 rounded-xl bg-zinc-800 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1 font-mono uppercase">
                    Track Title
                  </label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="e.g. Neon Horizon (Vanguard Cut)"
                    required
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1 font-mono uppercase">
                    Genre
                  </label>
                  <input
                    type="text"
                    value={uploadGenre}
                    onChange={(e) => setUploadGenre(e.target.value)}
                    placeholder="e.g. Synthwave, Neo-Soul..."
                    required
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1 font-mono uppercase flex justify-between">
                  <span>About the Track</span>
                  <span className="text-[10px] text-zinc-500 lowercase">optional</span>
                </label>
                <textarea
                  rows={2}
                  value={uploadAboutTrack}
                  onChange={(e) => setUploadAboutTrack(e.target.value)}
                  placeholder="Inspiration, sonic context, instruments, intended vibe..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1 font-mono uppercase flex justify-between">
                  <span>Lyrics / Liner Notes</span>
                  <span className="text-[10px] text-zinc-500 lowercase">optional</span>
                </label>
                <textarea
                  rows={3}
                  value={uploadLyrics}
                  onChange={(e) => setUploadLyrics(e.target.value)}
                  placeholder="[Verse 1]&#10;Write lyrics..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm font-mono text-zinc-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2 text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold text-xs"
                >
                  {isUploading ? 'Uploading...' : 'Publish Track'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Board Modal */}
      {isCreateBoardOpen && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <Disc className="w-5 h-5 text-teal-400" />
                <h3 className="text-base font-bold text-white">Establish Curator Board</h3>
              </div>
              <button onClick={() => setIsCreateBoardOpen(false)} className="p-1 text-zinc-400 hover:text-white">
                ✕
              </button>
            </div>

            {createBoardError && (
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
                {createBoardError}
              </div>
            )}

            <form onSubmit={handleCreateBoardSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1 font-mono uppercase">
                  Board Battlefield Title
                </label>
                <input
                  type="text"
                  value={newBoardTitle}
                  onChange={(e) => setNewBoardTitle(e.target.value)}
                  placeholder="e.g. Obsidian Sync: Dark Wave Stems"
                  required
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1 font-mono uppercase">
                  Sonic Genre
                </label>
                <input
                  type="text"
                  value={newBoardGenre}
                  onChange={(e) => setNewBoardGenre(e.target.value)}
                  required
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-zinc-400 font-mono uppercase">
                    Custom Criteria & Weights (Must Sum to 100%)
                  </label>
                  <span className={`text-xs font-mono font-bold ${
                    newBoardCriteria.reduce((sum, c) => sum + Number(c.weight), 0) === 100
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                  }`}>
                    Sum: {newBoardCriteria.reduce((sum, c) => sum + Number(c.weight), 0)}%
                  </span>
                </div>

                <div className="space-y-2">
                  {newBoardCriteria.map((criterion, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={criterion.criterion_name}
                        onChange={(e) => {
                          const updated = [...newBoardCriteria];
                          updated[idx].criterion_name = e.target.value;
                          setNewBoardCriteria(updated);
                        }}
                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100"
                      />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={criterion.weight}
                        onChange={(e) => {
                          const parsed = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                          setNewBoardCriteria(
                            rebalanceCriteriaWeights(newBoardCriteria, idx, Number.isNaN(parsed) ? 0 : parsed)
                          );
                        }}
                        className="w-20 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 font-mono text-center"
                      />
                      <span className="text-xs text-zinc-400">%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-400">
                Your entry fee will automatically be fixed to <strong className="text-emerald-400 font-mono">${(currentUser.influence_points * 0.1).toFixed(2)}</strong> based on your {currentUser.influence_points} Influence Points.
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsCreateBoardOpen(false)}
                  className="px-4 py-2 text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingBoard}
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold text-xs"
                >
                  {isCreatingBoard ? 'Deploying...' : 'Establish Board'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
