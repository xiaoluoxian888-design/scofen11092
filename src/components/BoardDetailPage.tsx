import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Board, Submission, User, BoardCriterion } from '../types/schema';
import { apiClient } from '../services/apiClient';
import { 
  ArrowLeft,
  Sparkles, 
  Coins, 
  ShieldCheck, 
  Upload, 
  Play, 
  Pause, 
  CheckCircle2, 
  Sliders, 
  Edit3, 
  Lock, 
  Unlock, 
  FileAudio, 
  Trash2, 
  Volume2, 
  Share2, 
  FileText,
  ChevronDown,
  Layers,
  Music2,
  AlertCircle
} from 'lucide-react';
import { calculateCuratorEntryFee } from '../services/mathEngine';

interface BoardDetailPageProps {
  boardId: string;
  currentUser: User;
  onPlayTrack: (submission: Submission) => void;
  currentTrackId?: string;
  isPlaying?: boolean;
  onBack: () => void;
  onOpenSongProfile: (songId: string) => void;
  onOpenUserProfile?: (userId: string) => void;
  onRefreshBoards: () => void;
  studioTracks?: Submission[];
  onNavigateToStudio?: () => void;
}

export const BoardDetailPage: React.FC<BoardDetailPageProps> = ({
  boardId,
  currentUser,
  onPlayTrack,
  currentTrackId,
  isPlaying,
  onBack,
  onOpenSongProfile,
  onOpenUserProfile,
  onRefreshBoards,
  studioTracks: propStudioTracks,
  onNavigateToStudio,
}) => {
  const [boardData, setBoardData] = useState<{ board: Board; submissions: Submission[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sorting
  const [submissionSort, setSubmissionSort] = useState<'score' | 'newest' | 'curator_rated'>('score');

  // Submit Modal
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submitSourceType, setSubmitSourceType] = useState<'studio' | 'upload'>('studio');
  const [selectedStudioTrackId, setSelectedStudioTrackId] = useState<string>('');
  const [userStudioCatalog, setUserStudioCatalog] = useState<Submission[]>(
    (propStudioTracks || []).filter((t) => t.owner_id === currentUser.id)
  );
  const [loadingStudioCatalog, setLoadingStudioCatalog] = useState(false);

  // Upload at the spot form state (real audio, NO preset or tempo required, with About the Track)
  const [submitTrackTitle, setSubmitTrackTitle] = useState('');
  const [submitGenre, setSubmitGenre] = useState('');
  const [submitAboutTrack, setSubmitAboutTrack] = useState('');
  const [submitLyrics, setSubmitLyrics] = useState('');
  const [submitAudioFile, setSubmitAudioFile] = useState<File | null>(null);
  const [submitAudioFileName, setSubmitAudioFileName] = useState('');
  const [submitAudioFileSize, setSubmitAudioFileSize] = useState('');
  const [submitAudioDataUrl, setSubmitAudioDataUrl] = useState<string | null>(null);
  const [submitAudioDuration, setSubmitAudioDuration] = useState<number>(180);
  const [isSubmitAudioPlaying, setIsSubmitAudioPlaying] = useState(false);
  const submitAudioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const submitFileInputRef = useRef<HTMLInputElement | null>(null);

  const [submitEntryMode, setSubmitEntryMode] = useState<'crowd_pool' | 'curator_skip'>('crowd_pool');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Interactive Crowd Rater Console
  const [activeRatingTrackId, setActiveRatingTrackId] = useState<string | null>(null);
  const [ratingScores, setRatingScores] = useState<Record<string, number>>({});
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [ratingSuccessId, setRatingSuccessId] = useState<string | null>(null);

  // Curator Grading Console (if user is host)
  const [curatorGradingTrackId, setCuratorGradingTrackId] = useState<string | null>(null);
  const [curatorScores, setCuratorScores] = useState<Record<string, number>>({});
  const [isSubmittingCuratorGrade, setIsSubmittingCuratorGrade] = useState(false);
  const [curatorSuccessId, setCuratorSuccessId] = useState<string | null>(null);

  // Fetch board details
  const fetchBoardDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getBoard(boardId);
      setBoardData(data);
      if (data.board.genre && !submitGenre) {
        setSubmitGenre(data.board.genre);
      }
    } catch (err) {
      console.error('Failed to load board details', err);
      setError(err instanceof Error ? err.message : 'Failed to load board');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoardDetails();
  }, [boardId]);

  // Sync Studio Catalog
  useEffect(() => {
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

  const board = boardData?.board;
  const submissions = boardData?.submissions || [];

  // Check if current user is the host
  const isHost = board?.host_id === currentUser.id;

  // Check if user has entered songs into this board
  const myEnteredTracks = useMemo(() => {
    return submissions.filter((s) => s.owner_id === currentUser.id);
  }, [submissions, currentUser.id]);

  const hasEntered = myEnteredTracks.length > 0;

  // Sorted submissions
  const sortedSubmissions = useMemo(() => {
    return [...submissions].sort((a, b) => {
      if (submissionSort === 'score') {
        return (b.final_score || 0) - (a.final_score || 0);
      }
      if (submissionSort === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (submissionSort === 'curator_rated') {
        return (b.curator_rating !== null ? 1 : 0) - (a.curator_rating !== null ? 1 : 0);
      }
      return 0;
    });
  }, [submissions, submissionSort]);

  // File Upload Handlers
  const handleSubmitFileSelected = (file: File) => {
    setSubmitAudioFile(file);
    setSubmitAudioFileName(file.name);
    setSubmitAudioFileSize((file.size / (1024 * 1024)).toFixed(1) + ' MB');
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    if (!submitTrackTitle) {
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

  // Open Enter Board Modal
  const handleOpenEnterModal = async () => {
    setIsSubmitModalOpen(true);
    setSubmitError(null);
    setSubmitSuccess(null);
    setSubmitGenre(board?.genre || 'Electronic');
    if (!submitTrackTitle) {
      setSubmitTrackTitle(`Track for ${board?.title || 'Contest'}`);
    }

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
    } catch {
      setSubmitSourceType('upload');
    } finally {
      setLoadingStudioCatalog(false);
    }
  };

  // Execute Submission
  const handleExecuteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!board) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (submitSourceType === 'studio') {
        if (!selectedStudioTrackId) {
          throw new Error('Please select a track from your Studio.');
        }
        await apiClient.enterSongIntoBoard(selectedStudioTrackId, board.id, submitEntryMode);
        setSubmitSuccess('Song successfully entered into this battlefield!');
      } else {
        if (!submitTrackTitle.trim()) {
          throw new Error('Track title is required.');
        }
        await apiClient.createSubmission(
          board.id,
          currentUser.id,
          submitTrackTitle,
          submitEntryMode,
          'cyber_bass',
          submitLyrics,
          submitGenre,
          submitAboutTrack,
          submitAudioDataUrl || undefined,
          submitAudioDuration
        );
        setSubmitSuccess(`"${submitTrackTitle}" entered into board and saved to your Studio!`);
      }

      await fetchBoardDetails();
      onRefreshBoards();
      setTimeout(() => {
        setIsSubmitModalOpen(false);
        setSubmitSuccess(null);
        handleRemoveSubmitFile();
      }, 1400);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Interactive Rating
  const handleOpenCrowdRating = (track: Submission) => {
    if (activeRatingTrackId === track.id) {
      setActiveRatingTrackId(null);
      return;
    }
    setActiveRatingTrackId(track.id);
    const initial: Record<string, number> = {};
    (board?.criteria || []).forEach((c) => {
      initial[c.id] = 75;
    });
    setRatingScores(initial);
  };

  // Submit Crowd Rating
  const handleSubmitCrowdRating = async (trackId: string) => {
    try {
      setIsSubmittingRating(true);
      await apiClient.rateSongAsCrowd(trackId, currentUser.id, ratingScores);
      setRatingSuccessId(trackId);
      await fetchBoardDetails();
      setTimeout(() => {
        setRatingSuccessId(null);
        setActiveRatingTrackId(null);
      }, 1500);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit rating');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  // Open Curator Grading
  const handleOpenCuratorGrading = (track: Submission) => {
    if (curatorGradingTrackId === track.id) {
      setCuratorGradingTrackId(null);
      return;
    }
    setCuratorGradingTrackId(track.id);
    const initial: Record<string, number> = {};
    (board?.criteria || []).forEach((c) => {
      initial[c.id] = 85;
    });
    setCuratorScores(initial);
  };

  // Submit Curator Grade & Lock
  const handleSubmitCuratorGrade = async (trackId: string) => {
    try {
      setIsSubmittingCuratorGrade(true);
      await apiClient.rateSongAsCurator(trackId, currentUser.id, curatorScores);
      setCuratorSuccessId(trackId);
      await fetchBoardDetails();
      onRefreshBoards();
      setTimeout(() => {
        setCuratorSuccessId(null);
        setCuratorGradingTrackId(null);
      }, 1500);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to grade submission');
    } finally {
      setIsSubmittingCuratorGrade(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-emerald-400 animate-pulse">
          <Sparkles className="w-6 h-6" />
        </div>
        <div className="text-xs font-mono text-zinc-500">Loading battlefield board...</div>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="py-20 text-center space-y-4 max-w-md mx-auto">
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
          {error || 'Board not found'}
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold inline-flex items-center space-x-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Boards</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 animate-in fade-in">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-medium transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Boards</span>
        </button>

        <div className="flex items-center space-x-2 text-xs font-mono text-zinc-500">
          <span>Board ID:</span>
          <span className="text-zinc-400 font-bold">{board.id.slice(0, 8)}...</span>
        </div>
      </div>

      {/* Hero Board Banner */}
      <div className="rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl bg-zinc-950">
        {/* Banner Cover Gradient */}
        <div className={`h-40 sm:h-48 bg-gradient-to-r ${board.cover_gradient || 'from-emerald-700 via-teal-850 to-zinc-950'} p-6 sm:p-8 flex flex-col justify-between relative`}>
          {/* Top Pill Badges */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-2 flex-wrap gap-1.5">
              <span className="text-xs font-bold font-mono tracking-wider uppercase px-3 py-1 rounded-full bg-zinc-950/80 text-emerald-400 backdrop-blur-md border border-emerald-500/30 flex items-center space-x-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>{board.board_type || 'Sync Opportunity'}</span>
              </span>

              {hasEntered && (
                <span className="text-xs font-black font-mono tracking-wider uppercase px-3 py-1 rounded-full bg-emerald-400 text-zinc-950 shadow-md shadow-emerald-500/50 flex items-center space-x-1.5 ring-1 ring-white/50 animate-pulse">
                  <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Entered ({myEnteredTracks.length})</span>
                </span>
              )}

              <span className="text-xs font-medium px-3 py-1 rounded-full bg-zinc-900/80 text-zinc-200 backdrop-blur-md border border-zinc-700/60">
                {board.genre || 'Electronic'}
              </span>
            </div>

            {/* Prize Pool Pill */}
            <div className="px-4 py-1.5 rounded-full bg-zinc-950/85 backdrop-blur-md border border-amber-500/30 text-xs font-mono text-zinc-200 flex items-center space-x-2 shadow-lg">
              <Coins className="w-4 h-4 text-amber-400" />
              <span>Ledger Pool: <strong className="text-emerald-400 font-bold">${board.ledger_balance.toFixed(2)}</strong></span>
            </div>
          </div>

          {/* Title on Banner */}
          <div className="text-white">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight drop-shadow-md">
              {board.title}
            </h1>
          </div>
        </div>

        {/* Board Details Strip */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Description & Overview */}
            <div className="md:col-span-8 space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 font-mono">Opportunity Overview & Sync Brief</h3>
                <p className="text-sm text-zinc-300 mt-1.5 leading-relaxed">
                  {board.description || 'Musicians submit their original productions to compete for curator evaluation, crowd ranking, and placement escalation.'}
                </p>
              </div>

              {/* Unified Scorecard Matrix */}
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                    <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                    <span>50:50 Unified Evaluation Matrix</span>
                  </span>
                  <span className="text-emerald-400 font-semibold">Strict 50% Crowd : 50% Curator</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {board.criteria && board.criteria.length > 0 ? (
                    board.criteria.map((c) => (
                      <div
                        key={c.id}
                        className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300 flex items-center space-x-2"
                      >
                        <span>{c.criterion_name}:</span>
                        <strong className="text-emerald-400 font-bold">{c.weight}%</strong>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-zinc-500 font-mono">Default balanced matrix applied</span>
                  )}
                </div>
              </div>

              {/* Initial Assessment Questions if set */}
              {board.assessment_criteria && board.assessment_criteria.length > 0 && (
                <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-2">
                  <div className="text-xs font-mono uppercase font-bold text-zinc-400 flex items-center space-x-1.5">
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Host Screening Guidelines</span>
                  </div>
                  <div className="space-y-1.5">
                    {board.assessment_criteria.map((a, i) => (
                      <div key={i} className="text-xs text-zinc-300 flex items-start space-x-2">
                        <span className="text-emerald-400 font-mono font-bold">•</span>
                        <span>{a.question} ({a.metric_name} - {a.weight}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Host Profile & Action Card */}
            <div className="md:col-span-4 space-y-4">
              <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
                <div className="flex items-center space-x-3">
                  <div 
                    onClick={() => board.host && onOpenUserProfile?.(board.host.id)}
                    className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center text-base font-bold font-mono cursor-pointer hover:border-emerald-400 hover:scale-105 transition-all shadow-md"
                    title={`View ${board.host?.first_name}'s public profile`}
                  >
                    {board.host?.first_name?.[0] || 'C'}
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 font-mono uppercase font-semibold">Board Curator</div>
                    <div 
                      onClick={() => board.host && onOpenUserProfile?.(board.host.id)}
                      className="text-sm font-bold text-white hover:text-emerald-400 cursor-pointer flex items-center space-x-1 transition-colors"
                      title={`View ${board.host?.first_name}'s public profile`}
                    >
                      <span>{board.host ? `${board.host.first_name} ${board.host.last_name}` : 'Curator Host'}</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
                      Influence: <strong className="text-emerald-400">{board.host?.influence_points || 0} pts</strong>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                  <div>
                    <div className="text-[10px] uppercase font-mono text-zinc-500 font-bold">Curator Skip Fee</div>
                    <div className="text-base font-black text-emerald-400 font-mono mt-0.5">
                      ${board.entry_fee.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-mono text-zinc-500 font-bold">Crowd Pool Entry</div>
                    <div className="text-base font-black text-cyan-400 font-mono mt-0.5">
                      $5.00
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleOpenEnterModal}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>{hasEntered ? 'Enter Another Song' : 'Enter This Board'}</span>
                </button>
              </div>

              {/* Status if user entered */}
              {hasEntered && (
                <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 space-y-2">
                  <div className="text-xs font-bold text-emerald-300 flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>You Have {myEnteredTracks.length} Track{myEnteredTracks.length > 1 ? 's' : ''} in Contention</span>
                  </div>
                  <div className="space-y-1">
                    {myEnteredTracks.map((t) => (
                      <div key={t.id} className="text-xs text-zinc-300 truncate flex items-center justify-between">
                        <span className="truncate">{t.track_title}</span>
                        <span className="font-mono text-emerald-400 font-bold shrink-0 ml-2">
                          {t.final_score > 0 ? `${t.final_score.toFixed(1)} pts` : 'In Review'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Battlefield Submissions & Leaderboard */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <span>Battlefield Contenders</span>
              <span className="text-xs font-mono font-bold text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                {submissions.length} Tracks
              </span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Listen, rate competing submissions on this board's criteria, and monitor 50:50 unified standings.
            </p>
          </div>

          {/* Sort Controls */}
          <div className="flex items-center space-x-1 bg-zinc-900 p-1 rounded-2xl border border-zinc-800 text-xs">
            <button
              onClick={() => setSubmissionSort('score')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                submissionSort === 'score' ? 'bg-zinc-800 text-emerald-400 font-bold shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Top 50:50 Score
            </button>
            <button
              onClick={() => setSubmissionSort('newest')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                submissionSort === 'newest' ? 'bg-zinc-800 text-emerald-400 font-bold shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Newest Entries
            </button>
            <button
              onClick={() => setSubmissionSort('curator_rated')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                submissionSort === 'curator_rated' ? 'bg-zinc-800 text-emerald-400 font-bold shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Curator Reviewed
            </button>
          </div>
        </div>

        {submissions.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-zinc-900/40 border border-dashed border-zinc-800 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
              <Music2 className="w-8 h-8 text-emerald-400" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h3 className="text-base font-bold text-white">No tracks entered in this board yet</h3>
              <p className="text-xs text-zinc-400">
                Be the very first artist to enter this battlefield and command the leaderboard!
              </p>
            </div>
            <button
              onClick={handleOpenEnterModal}
              className="px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs shadow-lg shadow-emerald-500/20 inline-flex items-center space-x-2"
            >
              <Upload className="w-4 h-4" />
              <span>Enter Your Music Now</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            {sortedSubmissions.map((sub, idx) => {
              const isPlayingThis = currentTrackId === sub.id && isPlaying;
              const isMyTrack = sub.owner_id === currentUser.id;
              const isCuratorRated = sub.curator_rating !== null;
              const isCrowdRatingOpen = activeRatingTrackId === sub.id;
              const isCuratorGradingOpen = curatorGradingTrackId === sub.id;

              return (
                <div
                  key={sub.id}
                  className={`rounded-2xl border transition-all p-4 space-y-3.5 ${
                    isMyTrack
                      ? 'bg-zinc-900/90 border-emerald-500/40 shadow-lg shadow-emerald-950/20 ring-1 ring-emerald-500/20'
                      : 'bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  {/* Track Header Line */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center space-x-3.5 min-w-0">
                      {/* Rank */}
                      <span className={`w-6 text-center text-sm font-mono font-bold shrink-0 ${
                        idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-zinc-300' : idx === 2 ? 'text-amber-600' : 'text-zinc-500'
                      }`}>
                        #{idx + 1}
                      </span>

                      {/* Play Button */}
                      <button
                        type="button"
                        onClick={() => onPlayTrack(sub)}
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-md shrink-0 ${
                          isPlayingThis
                            ? 'bg-emerald-500 text-zinc-950 shadow-emerald-500/30'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-emerald-400 border border-zinc-700/60'
                        }`}
                      >
                        {isPlayingThis ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5 fill-current" />}
                      </button>

                      {/* Title & Metadata */}
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2 flex-wrap gap-1">
                          <h3 className="text-sm font-bold text-white hover:text-emerald-400 transition-colors truncate">
                            {sub.track_title}
                          </h3>
                          {isMyTrack && (
                            <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                              Your Track
                            </span>
                          )}
                          <span className="text-[10px] font-mono px-2 py-0.2 rounded-md bg-zinc-800 text-zinc-400">
                            {sub.genre || 'Electronic'}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2 text-xs text-zinc-400 mt-1">
                          <div 
                            onClick={() => sub.owner && onOpenUserProfile?.(sub.owner.id)}
                            className="inline-flex items-center space-x-1.5 cursor-pointer group"
                            title={`View ${sub.owner ? `${sub.owner.first_name} ${sub.owner.last_name}` : 'Artist'}'s profile`}
                          >
                            <div className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[9px] font-bold text-zinc-300 group-hover:border-emerald-500 group-hover:text-emerald-400 transition-colors">
                              {sub.owner?.first_name?.[0] || 'A'}
                            </div>
                            <span className="group-hover:text-emerald-400 font-medium text-zinc-300 transition-colors">
                              {sub.owner ? `${sub.owner.first_name} ${sub.owner.last_name}` : 'Artist'}
                            </span>
                          </div>
                          <span>•</span>
                          <span className="text-[11px] font-mono text-zinc-500">
                            {sub.entry_mode === 'curator_skip' ? 'Curator Skip Priority' : 'Crowd Pool'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Score Badges & Action CTAs */}
                    <div className="flex items-center space-x-3 self-end md:self-auto shrink-0">
                      {/* Crowd Score */}
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-mono text-zinc-500">Crowd (50%)</div>
                        <div className="text-sm font-mono font-bold text-zinc-300">
                          {sub.crowd_rating !== null ? sub.crowd_rating.toFixed(1) : '—'}
                        </div>
                      </div>

                      {/* Curator Score */}
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-mono text-zinc-500">Curator (50%)</div>
                        <div className={`text-sm font-mono font-bold ${isCuratorRated ? 'text-cyan-400' : 'text-zinc-500'}`}>
                          {isCuratorRated ? sub.curator_rating!.toFixed(1) : 'Pending'}
                        </div>
                      </div>

                      {/* 50:50 Combined Final Score */}
                      <div className="px-3.5 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-right">
                        <div className="text-[9px] uppercase font-mono text-zinc-500 font-bold">50:50 Score</div>
                        <div className="text-base font-mono font-black text-emerald-400">
                          {sub.final_score > 0 ? sub.final_score.toFixed(1) : '0.0'}
                        </div>
                      </div>

                      {/* Rate as Crowd Button */}
                      {!isMyTrack && !isHost && (
                        <button
                          type="button"
                          onClick={() => handleOpenCrowdRating(sub)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                            isCrowdRatingOpen
                              ? 'bg-zinc-800 border-zinc-600 text-white'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700'
                          }`}
                        >
                          <Sliders className="w-3.5 h-3.5 inline mr-1 text-emerald-400" />
                          <span>{isCrowdRatingOpen ? 'Close Rater' : 'Rate Track'}</span>
                        </button>
                      )}

                      {/* Curator Grade Button if logged-in user is host and song is not locked */}
                      {isHost && !sub.is_locked && (
                        <button
                          type="button"
                          onClick={() => handleOpenCuratorGrading(sub)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            isCuratorGradingOpen
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                              : 'bg-cyan-500 hover:bg-cyan-400 text-zinc-950 border-transparent shadow-sm'
                          }`}
                        >
                          <Lock className="w-3.5 h-3.5 inline mr-1" />
                          <span>{isCuratorGradingOpen ? 'Close Console' : 'Curator Grade'}</span>
                        </button>
                      )}

                      {isHost && sub.is_locked && (
                        <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Finalized &amp; Locked</span>
                        </span>
                      )}

                      {/* Song Profile Link */}
                      <button
                        type="button"
                        onClick={() => onOpenSongProfile(sub.song_id || sub.id)}
                        className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
                        title="Open Song Profile"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                      </button>
                    </div>
                  </div>

                  {/* About the Track Description if present */}
                  {sub.about_track && (
                    <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 text-xs text-zinc-300 flex items-start space-x-2">
                      <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-zinc-400 font-mono text-[10px] uppercase mr-1">About the track:</strong>
                        <span className="italic">{sub.about_track}</span>
                      </div>
                    </div>
                  )}

                  {/* Lyrics preview if present */}
                  {sub.lyrics && (
                    <div className="px-3 py-2 rounded-xl bg-zinc-950/40 border border-zinc-800/60 text-[11px] font-mono text-zinc-400 italic line-clamp-2">
                      "{sub.lyrics.split('\n').filter(Boolean).slice(0, 2).join(' / ')}"
                    </div>
                  )}

                  {/* Interactive Crowd Rating Console */}
                  {isCrowdRatingOpen && (
                    <div className="p-4 rounded-2xl bg-zinc-950 border border-emerald-500/30 space-y-4 animate-in fade-in">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-emerald-400 font-mono uppercase flex items-center space-x-1.5">
                          <Sliders className="w-4 h-4" />
                          <span>Score Track According to Board Matrix</span>
                        </span>
                        <span className="text-[11px] text-zinc-400 font-mono">
                          Earn influence by providing accurate evaluation
                        </span>
                      </div>

                      {ratingSuccessId === sub.id && (
                        <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs text-center font-bold">
                          Your rating has been recorded and factored into the crowd average!
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {(board.criteria || []).map((c) => {
                          const val = ratingScores[c.id] ?? 75;
                          return (
                            <div key={c.id} className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-zinc-200">{c.criterion_name}</span>
                                <span className="font-mono text-emerald-400 font-bold">{val} / 100</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={val}
                                onChange={(e) => {
                                  setRatingScores({
                                    ...ratingScores,
                                    [c.id]: Number(e.target.value),
                                  });
                                }}
                                className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                              />
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-end space-x-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setActiveRatingTrackId(null)}
                          className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isSubmittingRating}
                          onClick={() => handleSubmitCrowdRating(sub.id)}
                          className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs shadow-md shadow-emerald-500/20"
                        >
                          {isSubmittingRating ? 'Recording...' : 'Submit Crowd Rating'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Curator Host Scoring Console */}
                  {isCuratorGradingOpen && (
                    <div className="p-4 rounded-2xl bg-zinc-950 border border-cyan-500/40 space-y-4 animate-in fade-in">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-cyan-400 font-mono uppercase flex items-center space-x-1.5">
                          <Lock className="w-4 h-4" />
                          <span>Curator Official Grading Console</span>
                        </span>
                        <span className="text-[11px] text-zinc-400 font-mono">
                          Locks permanently into the 50:50 unified score
                        </span>
                      </div>

                      {curatorSuccessId === sub.id && (
                        <div className="p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs text-center font-bold">
                          Curator grade locked! Final 50:50 score recalculated.
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {(board.criteria || []).map((c) => {
                          const val = curatorScores[c.id] ?? 85;
                          return (
                            <div key={c.id} className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-zinc-200">{c.criterion_name}</span>
                                <span className="font-mono text-cyan-400 font-bold">{val} / 100</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={val}
                                onChange={(e) => {
                                  setCuratorScores({
                                    ...curatorScores,
                                    [c.id]: Number(e.target.value),
                                  });
                                }}
                                className="w-full accent-cyan-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                              />
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-end space-x-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setCuratorGradingTrackId(null)}
                          className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isSubmittingCuratorGrade}
                          onClick={() => handleSubmitCuratorGrade(sub.id)}
                          className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs shadow-md shadow-cyan-500/20"
                        >
                          {isSubmittingCuratorGrade ? 'Locking Grade...' : 'Lock Official Curator Grade'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Enter Board Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2">
                <Upload className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Enter {board.title}</h3>
              </div>
              <button
                onClick={() => {
                  setIsSubmitModalOpen(false);
                  handleRemoveSubmitFile();
                }}
                className="text-zinc-500 hover:text-zinc-300 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {submitError && (
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {submitSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2 font-bold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{submitSuccess}</span>
              </div>
            )}

            <form onSubmit={handleExecuteSubmit} className="space-y-4">
              {/* Option Switcher: Choose from Studio vs Upload at the spot */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">Track Source</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSubmitSourceType('studio')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                      submitSourceType === 'studio'
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Choose from Studio ({userStudioCatalog.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSubmitSourceType('upload')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                      submitSourceType === 'upload'
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
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
                    <span>Select Track from Studio:</span>
                    {onNavigateToStudio && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsSubmitModalOpen(false);
                          onNavigateToStudio();
                        }}
                        className="text-emerald-400 hover:underline text-[11px]"
                      >
                        Manage Studio &rarr;
                      </button>
                    )}
                  </div>

                  {loadingStudioCatalog ? (
                    <div className="p-6 text-center text-xs text-zinc-500 font-mono">Loading studio catalog...</div>
                  ) : userStudioCatalog.length === 0 ? (
                    <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-center space-y-2">
                      <div className="text-xs text-zinc-300 font-semibold">No tracks in your Studio yet</div>
                      <p className="text-[11px] text-zinc-500">
                        Switch to "Upload at the Spot" to upload your audio file right now!
                      </p>
                      <button
                        type="button"
                        onClick={() => setSubmitSourceType('upload')}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 text-xs font-bold"
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
                    <span>Automatically creates a song profile in your Music Studio.</span>
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
                        <div className="text-xs font-semibold text-zinc-200">Click or drop audio track here</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">Real audio file playback supported across app</div>
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
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold flex items-center space-x-1"
                          >
                            {isSubmitAudioPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
                            <span>{isSubmitAudioPlaying ? 'Pause' : 'Preview'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveSubmitFile}
                            className="p-1.5 rounded-xl bg-zinc-800 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Track Title & Genre */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        placeholder="e.g. Electronic, Synthwave..."
                        className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* About the Track */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                      <span>About the Track</span>
                      <span className="text-[10px] text-zinc-500 font-mono">Optional</span>
                    </label>
                    <textarea
                      value={submitAboutTrack}
                      onChange={(e) => setSubmitAboutTrack(e.target.value)}
                      rows={2}
                      placeholder="Inspiration, production context, equipment, mood..."
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Lyrics */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                      <span>Lyrics / Liner Notes</span>
                      <span className="text-[10px] text-zinc-500 font-mono">Optional</span>
                    </label>
                    <textarea
                      value={submitLyrics}
                      onChange={(e) => setSubmitLyrics(e.target.value)}
                      rows={2}
                      placeholder="Song lyrics or placement notes..."
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
                      Crowd rates first. Reaching threshold unlocks curator escalation.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSubmitEntryMode('curator_skip')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      submitEntryMode === 'curator_skip'
                        ? 'bg-cyan-500/10 border-cyan-500 text-white'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Curator Skip</span>
                      <span className="text-xs font-black text-cyan-400">${board.entry_fee.toFixed(2)}</span>
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-1 leading-tight">
                      Fast-track directly to curator queue for priority review.
                    </div>
                  </button>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-zinc-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsSubmitModalOpen(false);
                    handleRemoveSubmitFile();
                  }}
                  className="px-4 py-2 text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold text-xs shadow-lg shadow-emerald-500/20"
                >
                  {isSubmitting ? 'Entering Board...' : `Confirm & Enter Board ($${submitEntryMode === 'curator_skip' ? board.entry_fee.toFixed(2) : '5.00'})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
