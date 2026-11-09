import React, { useState, useEffect } from 'react';
import { Board, Submission, User, BoardCriterion, InitialAssessmentCriteria } from '../types/schema';
import { apiClient } from '../services/apiClient';
import {
  rebalanceCriteriaWeights,
  addCriterionWithRebalance,
  removeCriterionWithRebalance,
} from '../services/mathEngine';
import { 
  Sliders, 
  Plus, 
  Play, 
  Pause, 
  CheckCircle2, 
  DollarSign, 
  Trash2, 
  X, 
  Sparkles, 
  Award, 
  Layers, 
  Music, 
  Radio, 
  SlidersHorizontal, 
  Lock, 
  ShieldAlert, 
  Coins, 
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  Film,
  Mic2,
  Gamepad2,
  Flame,
  FileText,
  Edit3,
  ExternalLink,
  Compass,
  FileAudio,
  Volume2
} from 'lucide-react';
import { 
  BOARD_CREATION_THRESHOLD, 
  calculateCuratorEntryFee, 
  canUserCreateBoard 
} from '../services/mathEngine';

interface MyBoardsViewProps {
  currentUser: User;
  boards: Board[];
  onRefreshBoards: () => void;
  onPlayTrack: (submission: Submission) => void;
  currentTrackId?: string;
  isPlaying?: boolean;
  onNavigateToDiscovery?: () => void;
  userSubmissions?: Submission[];
  onOpenSongProfile?: (songId: string) => void;
  onNavigateToStudio?: () => void;
  onOpenBoard?: (boardId: string) => void;
  onOpenUserProfile?: (userId: string) => void;
}

export const MyBoardsView: React.FC<MyBoardsViewProps> = ({
  currentUser,
  boards,
  onRefreshBoards,
  onPlayTrack,
  currentTrackId,
  isPlaying,
  onNavigateToDiscovery,
  userSubmissions,
  onOpenSongProfile,
  onNavigateToStudio,
  onOpenBoard,
  onOpenUserProfile,
}) => {
  // Boards where current user is host
  const myHostedBoards = boards.filter((b) => b.host_id === currentUser.id);

  const [subTab, setSubTab] = useState<'hosted' | 'entered'>('hosted');
  const [localUserSubmissions, setLocalUserSubmissions] = useState<Submission[]>(userSubmissions || []);

  const refreshSubmissions = async () => {
    try {
      const profile = await apiClient.getUserProfile(currentUser.id);
      if (profile?.submittedTracks) {
        setLocalUserSubmissions(profile.submittedTracks);
      }
    } catch {}
  };

  useEffect(() => {
    if (userSubmissions && userSubmissions.length > 0) {
      setLocalUserSubmissions(userSubmissions);
    } else if (currentUser?.id) {
      refreshSubmissions();
    }
  }, [userSubmissions, currentUser?.id]);

  // Boards the user entered with corresponding submitted tracks
  const enteredBoardsWithTracks = React.useMemo(() => {
    const list: { board: Board; submissions: Submission[] }[] = [];
    boards.forEach((b) => {
      const matchingSubs = localUserSubmissions.filter((s) => s.board_id === b.id);
      if (matchingSubs.length > 0) {
        list.push({ board: b, submissions: matchingSubs });
      }
    });
    return list;
  }, [boards, localUserSubmissions]);

  const [activeBoardId, setActiveBoardId] = useState<string>(myHostedBoards[0]?.id || '');
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);

  // Sync active board if list changes
  useEffect(() => {
    if (!activeBoardId && myHostedBoards.length > 0) {
      setActiveBoardId(myHostedBoards[0].id);
    } else if (activeBoardId && !myHostedBoards.some((b) => b.id === activeBoardId)) {
      setActiveBoardId(myHostedBoards[0]?.id || '');
    }
  }, [myHostedBoards, activeBoardId]);

  // Scofen Engine Invariants: Fixed Fee = Influence Points * 0.1, Min 100 pts for creation
  const canCreate = canUserCreateBoard(currentUser.influence_points);
  const fixedCuratorFee = calculateCuratorEntryFee(currentUser.influence_points);

  // New Board Form
  const [newTitle, setNewTitle] = useState('Apex Studio: Sound & Sync Battlefield');
  const [newBoardType, setNewBoardType] = useState('Sync for action movie');
  const [newDescription, setNewDescription] = useState('Curating high-intensity tracks for movie trailer sync and licensing.');
  const [newGenre, setNewGenre] = useState('Electronic / Cinematic');
  const [newCriteria, setNewCriteria] = useState<{ criterion_name: string; weight: number }[]>([
    { criterion_name: 'Vocal Precision', weight: 25 },
    { criterion_name: 'Production Quality', weight: 35 },
    { criterion_name: 'Hook Stickiness', weight: 25 },
    { criterion_name: 'Arrangement & Flow', weight: 15 },
  ]);

  // Scoring console state
  const [scoringSubmissionId, setScoringSubmissionId] = useState<string | null>(null);
  const [rawScoreInputs, setRawScoreInputs] = useState<Record<string, number>>({});
  const [scoringNotice, setScoringNotice] = useState<string | null>(null);

  // Board details
  const [boardDetail, setBoardDetail] = useState<{ board: Board; submissions: Submission[] } | null>(null);
  const [loadingBoard, setLoadingBoard] = useState(false);

  const fetchBoardDetail = async (id: string) => {
    setLoadingBoard(true);
    try {
      const data = await apiClient.getBoard(id);
      setBoardDetail(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBoard(false);
    }
  };

  useEffect(() => {
    if (activeBoardId) {
      fetchBoardDetail(activeBoardId);
    } else {
      setBoardDetail(null);
    }
  }, [activeBoardId]);

  const activeBoard = boardDetail?.board || myHostedBoards.find((b) => b.id === activeBoardId);

  // Handle Board Creation
  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate) {
      alert(`Threshold locked: You need at least ${BOARD_CREATION_THRESHOLD} influence points to create a board.`);
      return;
    }

    const totalWeight = newCriteria.reduce((sum, c) => sum + Number(c.weight || 0), 0);
    if (totalWeight !== 100) {
      alert(`Evaluation Matrix weights must sum to exactly 100. Current total: ${totalWeight}`);
      return;
    }

    try {
      const created = await apiClient.createBoard(
        currentUser.id,
        newTitle,
        newCriteria,
        newGenre,
        'from-emerald-600 via-teal-800 to-zinc-950',
        [
          { question: 'Dynamic range mixdown clarity', metric_name: 'Mixdown Analysis', weight: 40 },
          { question: 'Hook stickiness and harmonic originality', metric_name: 'Melodic Hook Ear', weight: 35 },
          { question: 'Vocal arrangement depth', metric_name: 'Vocal Stems Inspection', weight: 25 },
        ],
        newBoardType,
        newDescription
      );
      onRefreshBoards();
      setIsCreatingBoard(false);
      setActiveBoardId(created.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create board';
      alert(message);
    }
  };

  // Add / remove criterion
  const handleAddCriterion = () => {
    if (newCriteria.length >= 6) return;
    setNewCriteria(addCriterionWithRebalance(newCriteria, { criterion_name: 'Sonic Identity', weight: 10 }));
  };

  const handleRemoveCriterion = (index: number) => {
    if (newCriteria.length <= 1) return;
    setNewCriteria(removeCriterionWithRebalance(newCriteria, index));
  };

  const handleUpdateCriterion = (index: number, field: 'criterion_name' | 'weight', value: any) => {
    if (field === 'weight') {
      const parsed = value === '' ? 0 : parseInt(String(value), 10);
      setNewCriteria(rebalanceCriteriaWeights(newCriteria, index, Number.isNaN(parsed) ? 0 : parsed));
    } else {
      const updated = [...newCriteria];
      updated[index] = { ...updated[index], criterion_name: String(value) };
      setNewCriteria(updated);
    }
  };

  // Open scoring console for a submission
  const handleOpenScoring = (sub: Submission) => {
    setScoringSubmissionId(sub.id);
    setScoringNotice(null);
    const initialInputs: Record<string, number> = {};
    if (activeBoard?.criteria) {
      activeBoard.criteria.forEach((c) => {
        initialInputs[c.id] = 85;
      });
    }
    setRawScoreInputs(initialInputs);
  };

  // Submit curator ratings for track
  const handleSubmitCuratorScore = async (submissionId: string) => {
    if (!activeBoard?.criteria) return;

    const dimensionScores: Record<string, number> = {};
    activeBoard.criteria.forEach((c) => {
      dimensionScores[c.id] = rawScoreInputs[c.id] !== undefined ? rawScoreInputs[c.id] : 80;
    });

    try {
      await apiClient.rateSongAsCurator(submissionId, currentUser.id, dimensionScores);
      setScoringNotice('Curator rating submitted and permanently locked! (Strict 50:50 score applied)');
      if (activeBoardId) {
        fetchBoardDetail(activeBoardId);
      }
      onRefreshBoards();
      setTimeout(() => {
        setScoringSubmissionId(null);
        setScoringNotice(null);
      }, 1800);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Scoring submission failed';
      alert(msg);
    }
  };

  // Calculate live weighted score in console
  const liveCuratorScore = React.useMemo(() => {
    if (!activeBoard?.criteria || activeBoard.criteria.length === 0) return 0;
    let total = 0;
    activeBoard.criteria.forEach((c) => {
      const score = rawScoreInputs[c.id] !== undefined ? rawScoreInputs[c.id] : 80;
      total += score * (c.weight / 100);
    });
    return Number(total.toFixed(1));
  }, [activeBoard, rawScoreInputs]);

  return (
    <div className="space-y-8 pb-20">
      {/* Curator Authority Status Card */}
      <div className="rounded-3xl bg-zinc-950 border border-zinc-800/80 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                <Sliders className="w-5 h-5 text-cyan-400 stroke-[2.2]" />
              </span>
              <span className="text-xs font-mono font-bold tracking-wider text-cyan-400 uppercase">
                Curator Host Control Deck
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              My Battlefield Boards
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Manage your hosted boards, inspect song submissions, score escalated tracks using your custom criteria matrix, and command curator entry fees.
            </p>
          </div>

          {/* Curator Rule Invariant Cards */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
            {/* Host Authority Status */}
            <div className="px-4 py-3 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-center min-w-[130px]">
              <div className="text-[10px] text-zinc-500 uppercase font-mono font-bold">Host Influence</div>
              <div className="text-xl font-black text-emerald-400 font-mono mt-0.5">
                {currentUser.influence_points} pts
              </div>
              <div className="text-[9px] text-zinc-500 font-mono mt-0.5">
                {canCreate ? 'Threshold Met (≥100)' : `Need ${100 - currentUser.influence_points} more`}
              </div>
            </div>

            {/* Programmatic Curator Entry Fee */}
            <div className="px-4 py-3 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-center min-w-[140px]">
              <div className="text-[10px] text-zinc-500 uppercase font-mono font-bold">Curator Entry Fee</div>
              <div className="text-xl font-black text-cyan-400 font-mono mt-0.5">
                ${fixedCuratorFee.toFixed(2)}
              </div>
              <div className="text-[9px] text-zinc-500 font-mono mt-0.5">
                Rule: Influence × 0.1
              </div>
            </div>

            {/* Create Board Trigger */}
            <button
              onClick={() => {
                if (canCreate) {
                  setIsCreatingBoard(true);
                } else {
                  alert(`Board Creation Invariant: You have ${currentUser.influence_points} influence points. You must reach 100 influence points to establish a new board.`);
                }
              }}
              disabled={!canCreate}
              className={`px-5 py-3 rounded-2xl font-bold text-xs flex items-center space-x-2 transition-all shadow-lg ${
                canCreate
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-500/20 cursor-pointer'
                  : 'bg-zinc-800/60 border border-zinc-700/50 text-zinc-500 cursor-not-allowed'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Establish New Board</span>
            </button>
          </div>
        </div>
      </div>

      {/* Board Creation Modal */}
      {isCreatingBoard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center space-x-2">
                <SlidersHorizontal className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">Establish New Curator Battlefield</h3>
              </div>
              <button
                onClick={() => setIsCreatingBoard(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBoard} className="space-y-5">
              {/* Board Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">Board Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  placeholder="e.g. Apex Metro: Cyber-Club Sonic Gauntlet"
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Opportunity Type & Genre */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Opportunity Type</label>
                  <select
                    value={newBoardType}
                    onChange={(e) => setNewBoardType(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Sync for action movie">Sync for action movie</option>
                    <option value="Label A&R signing singer">Label A&R signing singer</option>
                    <option value="Indie Game OST Placement">Indie Game OST Placement</option>
                    <option value="Festival Stage Showcase">Festival Stage Showcase</option>
                    <option value="Club DJ Rotation & Peak Time">Club DJ Rotation & Peak Time</option>
                    <option value="Radio Airplay & Rotation">Radio Airplay & Rotation</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Genre Focus</label>
                  <input
                    type="text"
                    value={newGenre}
                    onChange={(e) => setNewGenre(e.target.value)}
                    placeholder="e.g. Analog Neo-Soul, Drill & Bass"
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">Board Objective & Criteria Description</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={2}
                  placeholder="Explain what kind of music, arrangement, and sync placement opportunities this board is evaluating..."
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Fixed Entry Fee Notice */}
              <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-zinc-200">Automated Curator Entry Fee</div>
                  <div className="text-[11px] text-zinc-400">Derived strictly from your {currentUser.influence_points} Influence Points (Points × 0.1)</div>
                </div>
                <div className="text-sm font-black text-emerald-400 font-mono">
                  ${fixedCuratorFee.toFixed(2)} USD
                </div>
              </div>

              {/* Custom Evaluation Matrix */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-zinc-200">Custom Evaluation Matrix (Unified Scorecard)</label>
                    <p className="text-[11px] text-zinc-400">Both crowd raters and you will use this exact weight matrix. Total must equal 100.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCriterion}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Parameter</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {newCriteria.map((c, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={c.criterion_name}
                        onChange={(e) => handleUpdateCriterion(idx, 'criterion_name', e.target.value)}
                        placeholder="Criterion Name (e.g. Mixing)"
                        className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                      <div className="flex items-center space-x-1 bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={c.weight}
                          onChange={(e) => handleUpdateCriterion(idx, 'weight', e.target.value)}
                          className="w-14 bg-transparent text-xs text-white text-right focus:outline-none font-mono"
                        />
                        <span className="text-xs text-zinc-500 font-mono">%</span>
                      </div>
                      {newCriteria.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCriterion(idx)}
                          className="p-2 text-zinc-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="text-right text-xs font-mono">
                  Total Weight:{' '}
                  <strong className={newCriteria.reduce((sum, c) => sum + Number(c.weight || 0), 0) === 100 ? 'text-emerald-400' : 'text-rose-400'}>
                    {newCriteria.reduce((sum, c) => sum + Number(c.weight || 0), 0)}%
                  </strong>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-zinc-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsCreatingBoard(false)}
                  className="px-4 py-2 text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs shadow-lg shadow-emerald-500/20"
                >
                  Launch Curator Board
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dual Tab Switcher: Boards I Host vs Boards I've Entered */}
      <div className="flex items-center space-x-3 border-b border-zinc-800 pb-4">
        <button
          onClick={() => setSubTab('hosted')}
          className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer ${
            subTab === 'hosted'
              ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
          }`}
        >
          <Sliders className="w-4 h-4 text-cyan-400" />
          <span>Boards I Host</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-zinc-800 text-zinc-300 ml-1">
            {myHostedBoards.length}
          </span>
        </button>

        <button
          onClick={() => setSubTab('entered')}
          className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer ${
            subTab === 'entered'
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Boards I've Entered</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 ml-1">
            {enteredBoardsWithTracks.length}
          </span>
        </button>
      </div>

      {/* SECTION 1: Hosted Boards */}
      {subTab === 'hosted' && (
        <>
          {myHostedBoards.length === 0 ? (
            <div className="rounded-3xl bg-zinc-900/40 border border-dashed border-zinc-800 p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
            <Sliders className="w-8 h-8 text-cyan-400" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-lg font-bold text-white">No Hosted Boards Yet</h3>
            {canCreate ? (
              <p className="text-xs text-zinc-400 leading-relaxed">
                You possess <strong>{currentUser.influence_points} Influence Points</strong>, meeting the 100-point threshold required to establish boards! Create your own battlefield to evaluate songs, set criteria, and collect curator fees.
              </p>
            ) : (
              <p className="text-xs text-zinc-400 leading-relaxed">
                Board creation requires at least <strong>100 Influence Points</strong>. You currently have <strong>{currentUser.influence_points} points</strong>. Earn authority by providing accurate ratings on competing tracks.
              </p>
            )}
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            {canCreate && (
              <button
                onClick={() => setIsCreatingBoard(true)}
                className="px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center space-x-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Establish Your First Board</span>
              </button>
            )}
            {onNavigateToDiscovery && (
              <button
                onClick={onNavigateToDiscovery}
                className="px-5 py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs flex items-center space-x-2 transition-all cursor-pointer"
              >
                <span>Browse All Opportunities</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Selector of User's Hosted Boards */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                My Hosted Boards ({myHostedBoards.length})
              </h2>
              {canCreate && (
                <button
                  onClick={() => setIsCreatingBoard(true)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Board</span>
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {myHostedBoards.map((b) => {
                const isSelected = b.id === activeBoardId;
                return (
                  <div
                    key={b.id}
                    onClick={() => setActiveBoardId(b.id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-zinc-900 border-cyan-500/50 shadow-lg shadow-cyan-950/20'
                        : 'bg-zinc-900/50 border-zinc-800/80 hover:bg-zinc-900/80 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-white leading-snug line-clamp-1">
                        {b.title}
                      </span>
                      <span className="text-xs font-bold text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded-full border border-cyan-500/30 shrink-0 font-mono">
                        ${b.entry_fee.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-zinc-400 mt-2 font-mono">
                      <span>{b.board_type || b.genre || 'General Opportunity'}</span>
                      <span className="text-emerald-400 font-semibold">
                        Pool: ${b.ledger_balance.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Board Management & Curator Scoring Studio */}
          <div className="lg:col-span-8 space-y-6">
            {activeBoard ? (
              <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-3xl p-6 space-y-6">
                {/* Board Overview */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-xl font-bold text-white">{activeBoard.title}</h2>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                        CURATOR HOST
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">
                      {activeBoard.description || 'Evaluating submitted tracks according to custom criteria matrix.'}
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs text-zinc-400 mt-2">
                      <span>Opportunity: <strong className="text-zinc-200">{activeBoard.board_type || 'Sync & Distribution'}</strong></span>
                      <span>•</span>
                      <span>Genre: <strong className="text-zinc-200">{activeBoard.genre || 'Various'}</strong></span>
                      <span>•</span>
                      <span>Your Fee: <strong className="text-cyan-400">${activeBoard.entry_fee.toFixed(2)}</strong></span>
                    </div>
                  </div>

                  {/* Financial Stats Widget */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 text-center min-w-[110px]">
                      <div className="text-[10px] font-mono uppercase text-zinc-500">Board Ledger</div>
                      <div className="text-base font-black text-emerald-400 font-mono mt-0.5">
                        ${activeBoard.ledger_balance.toFixed(2)}
                      </div>
                    </div>
                    <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 text-center min-w-[90px]">
                      <div className="text-[10px] font-mono uppercase text-zinc-500">Tracks</div>
                      <div className="text-base font-black text-white font-mono mt-0.5">
                        {boardDetail?.submissions.length || 0}
                      </div>
                    </div>
                    {onOpenBoard && (
                      <button
                        type="button"
                        onClick={() => onOpenBoard(activeBoard.id)}
                        className="px-3.5 py-3 rounded-2xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 font-bold text-xs flex items-center space-x-1.5 border border-cyan-500/40 transition-all cursor-pointer shrink-0"
                        title="View Public Board Page"
                      >
                        <span>Board Page</span>
                        <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Unified Criteria Matrix Chips */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                    <span>Active Evaluation Scorecard Weights (Total: 100%)</span>
                    <span className="text-[11px] font-mono text-zinc-500">50:50 Crowd & Curator Split</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {activeBoard.criteria && activeBoard.criteria.length > 0 ? (
                      activeBoard.criteria.map((c) => (
                        <div
                          key={c.id}
                          className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center space-x-2 text-xs"
                        >
                          <span className="text-zinc-300">{c.criterion_name}</span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold text-[10px]">
                            {c.weight}%
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-zinc-500">Standard balanced criteria matrix</div>
                    )}
                  </div>
                </div>

                {/* Submissions Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                      <Music className="w-4 h-4 text-emerald-400" />
                      <span>Submitted Tracks & Curator Scorecards</span>
                    </h3>
                    <span className="text-xs text-zinc-500 font-mono">
                      {boardDetail?.submissions.length || 0} tracks entered
                    </span>
                  </div>

                  {loadingBoard ? (
                    <div className="text-center py-12 text-zinc-500 text-xs">
                      Loading board submissions...
                    </div>
                  ) : !boardDetail || boardDetail.submissions.length === 0 ? (
                    <div className="text-center py-12 bg-zinc-950/60 rounded-2xl border border-zinc-800/80 space-y-2">
                      <Music className="w-8 h-8 text-zinc-600 mx-auto" />
                      <div className="text-xs font-semibold text-zinc-300">No tracks submitted to this board yet</div>
                      <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
                        Artists can submit to your board via the Boards directory. Once songs are escalated or enter via Curator Skip, they will appear here for your grading.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {boardDetail.submissions.map((sub) => {
                        const isThisScoring = scoringSubmissionId === sub.id;
                        const isTrackPlaying = currentTrackId === sub.id && isPlaying;

                        return (
                          <div
                            key={sub.id}
                            className={`p-4 rounded-2xl border transition-all ${
                              sub.is_locked
                                ? 'bg-zinc-950/80 border-zinc-800/80'
                                : 'bg-zinc-950/90 border-emerald-500/30 shadow-md shadow-emerald-950/10'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center space-x-3">
                                <button
                                  onClick={() => onPlayTrack(sub)}
                                  className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 hover:bg-emerald-500/30 transition-all cursor-pointer"
                                >
                                  {isTrackPlaying ? (
                                    <Pause className="w-4 h-4" />
                                  ) : (
                                    <Play className="w-4 h-4 ml-0.5" />
                                  )}
                                </button>
                                <div>
                                  <div className="text-sm font-bold text-white flex items-center space-x-2">
                                    <span>{sub.track_title}</span>
                                    {sub.entry_mode === 'curator_skip' && (
                                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                                        CURATOR SKIP
                                      </span>
                                    )}
                                    {sub.is_locked && (
                                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono font-bold flex items-center space-x-1">
                                        <Lock className="w-2.5 h-2.5" />
                                        <span>LOCKED</span>
                                      </span>
                                    )}
                                  </div>
                                  {sub.owner && (
                                    <div 
                                      onClick={() => onOpenUserProfile?.(sub.owner!.id)}
                                      className="inline-flex items-center space-x-1.5 cursor-pointer group mt-0.5"
                                      title={`View ${sub.owner.first_name}'s public profile`}
                                    >
                                      <div className="w-4 h-4 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[8px] font-bold text-zinc-300 group-hover:border-emerald-500 group-hover:text-emerald-400 transition-colors">
                                        {sub.owner.first_name[0]}
                                      </div>
                                      <span className="text-xs text-zinc-400 group-hover:text-emerald-400 transition-colors font-medium">
                                        {sub.owner.first_name} {sub.owner.last_name}
                                      </span>
                                    </div>
                                  )}
                                  <div className="text-xs text-zinc-400 font-mono mt-0.5">
                                    Crowd: {sub.crowd_rating ? sub.crowd_rating.toFixed(1) : '--'} • Curator: {sub.curator_rating ? sub.curator_rating.toFixed(1) : '--'} • Combined (50/50): <strong className="text-emerald-400">{sub.final_score > 0 ? sub.final_score.toFixed(1) : '--'}</strong>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2">
                                {!sub.is_locked ? (
                                  <button
                                    onClick={() => handleOpenScoring(sub)}
                                    className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center space-x-1 shadow-md shadow-emerald-500/20 cursor-pointer"
                                  >
                                    <Sliders className="w-3.5 h-3.5" />
                                    <span>Score Track</span>
                                  </button>
                                ) : (
                                  <span className="text-xs font-mono font-bold text-zinc-500 px-3 py-1 rounded-xl bg-zinc-900 border border-zinc-800">
                                    Rating Finalized
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Curator Scoring Console Panel */}
                            {isThisScoring && (
                              <div className="mt-4 pt-4 border-t border-zinc-800/80 space-y-4 animate-in fade-in">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="text-xs font-bold text-white">Curator Grading Console</div>
                                    <div className="text-[11px] text-zinc-400">
                                      Rate each criterion from 0 to 100. Submitting permanently locks the score.
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-[10px] font-mono text-zinc-500 uppercase">Live Weighted Score</div>
                                    <div className="text-base font-black text-emerald-400 font-mono">
                                      {liveCuratorScore.toFixed(1)} / 100
                                    </div>
                                  </div>
                                </div>

                                {scoringNotice && (
                                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-xs font-medium">
                                    {scoringNotice}
                                  </div>
                                )}

                                <div className="space-y-3 bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800/80">
                                  {activeBoard.criteria?.map((c) => {
                                    const currentVal = rawScoreInputs[c.id] !== undefined ? rawScoreInputs[c.id] : 80;
                                    return (
                                      <div key={c.id} className="space-y-1">
                                        <div className="flex items-center justify-between text-xs">
                                          <span className="text-zinc-200 font-medium">
                                            {c.criterion_name} <span className="text-zinc-500 font-mono">({c.weight}% weight)</span>
                                          </span>
                                          <span className="font-mono font-bold text-emerald-400 text-sm">
                                            {currentVal}
                                          </span>
                                        </div>
                                        <input
                                          type="range"
                                          min="0"
                                          max="100"
                                          value={currentVal}
                                          onChange={(e) => {
                                            setRawScoreInputs({
                                              ...rawScoreInputs,
                                              [c.id]: Number(e.target.value),
                                            });
                                          }}
                                          className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                                        />
                                      </div>
                                    );
                                  })}
                                </div>

                                <div className="flex items-center justify-end space-x-3">
                                  <button
                                    onClick={() => setScoringSubmissionId(null)}
                                    className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleSubmitCuratorScore(sub.id)}
                                    className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer"
                                  >
                                    <Lock className="w-3.5 h-3.5" />
                                    <span>Submit & Permanently Lock Rating</span>
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
              </div>
            ) : null}
          </div>
        </div>
      )}
        </>
      )}

      {/* SECTION 2: Entered Boards */}
      {subTab === 'entered' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Header & Quick stats */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-zinc-900/60 border border-zinc-800/80">
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Active Battlefield Contests</span>
                <span className="text-xs font-mono font-bold text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                  {enteredBoardsWithTracks.length} Boards Entered
                </span>
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Monitor your songs competing for sync, record deals, and playlist placement across curated battlefields.
              </p>
            </div>

            {onNavigateToDiscovery && (
              <button
                onClick={onNavigateToDiscovery}
                className="px-4 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-emerald-500/20 transition-all shrink-0 cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Explore More Boards</span>
              </button>
            )}
          </div>

          {enteredBoardsWithTracks.length === 0 ? (
            <div className="rounded-3xl bg-zinc-900/40 border border-dashed border-zinc-800 p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
                <Music className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="text-lg font-bold text-white">No Board Entries Yet</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  You haven't entered any songs into curator boards yet. Browse opportunities like "Sync for action movie" or "Label A&R signing singer" and enter your studio music directly!
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                {onNavigateToDiscovery && (
                  <button
                    onClick={onNavigateToDiscovery}
                    className="px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center space-x-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                  >
                    <Compass className="w-4 h-4" />
                    <span>Browse Boards & Enter Track</span>
                  </button>
                )}
                {onNavigateToStudio && (
                  <button
                    onClick={onNavigateToStudio}
                    className="px-5 py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs flex items-center space-x-2 transition-all cursor-pointer"
                  >
                    <FileAudio className="w-4 h-4 text-emerald-400" />
                    <span>Manage Music Studio</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {enteredBoardsWithTracks.map(({ board, submissions }) => (
                <div
                  key={board.id}
                  className="rounded-3xl bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 overflow-hidden shadow-xl transition-all"
                >
                  {/* Top Header of Entered Board */}
                  <div 
                    onClick={() => onOpenBoard?.(board.id)}
                    className={`p-5 bg-gradient-to-r ${board.cover_gradient || 'from-emerald-800 to-teal-950'} flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group hover:brightness-105 transition-all`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 flex-wrap gap-1">
                        <span className="text-[10px] font-bold font-mono tracking-wide uppercase px-2.5 py-0.5 rounded-full bg-zinc-950/80 text-emerald-400 backdrop-blur-md border border-emerald-500/30">
                          {board.board_type || 'Sync Opportunity'}
                        </span>
                        <span className="text-[10px] font-black font-mono tracking-wide uppercase px-2.5 py-0.5 rounded-full bg-emerald-400 text-zinc-950 shadow-sm flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3 text-zinc-950 stroke-[3]" />
                          <span>Entered</span>
                        </span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-900/80 text-zinc-300">
                          {board.genre || 'Electronic'}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-white tracking-tight group-hover:text-emerald-300 transition-colors flex items-center space-x-2">
                        <span>{board.title}</span>
                        <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-emerald-300 transition-transform group-hover:translate-x-1" />
                      </h3>
                    </div>

                    <div className="flex items-center space-x-4 shrink-0 text-xs text-white">
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-mono text-emerald-200">Curator Host</div>
                        <div 
                          onClick={() => board.host && onOpenUserProfile?.(board.host.id)}
                          className="font-bold flex items-center justify-end space-x-1.5 cursor-pointer group"
                          title={`View ${board.host?.first_name || 'Curator'}'s public profile`}
                        >
                          <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center text-[9px] font-bold font-mono group-hover:border-emerald-400 transition-colors">
                            {board.host?.first_name?.[0] || 'C'}
                          </div>
                          <span className="group-hover:text-emerald-300 transition-colors">
                            {board.host ? `${board.host.first_name} ${board.host.last_name}` : 'Curator'}
                          </span>
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                        </div>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-zinc-950/60 border border-white/10 font-mono text-center">
                        <div className="text-[9px] uppercase text-zinc-400">Ledger Pool</div>
                        <div className="text-emerald-400 font-bold">${board.ledger_balance.toFixed(2)}</div>
                      </div>

                      {onOpenBoard && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenBoard(board.id);
                          }}
                          className="px-3 py-2 rounded-xl bg-zinc-950/80 hover:bg-zinc-950 text-white font-bold text-xs flex items-center space-x-1.5 border border-white/20 transition-all cursor-pointer shadow-sm"
                        >
                          <span>Board Page</span>
                          <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Body: List of songs the user has entered into this specific board */}
                  <div className="p-6 space-y-4">
                    <div className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                      <span>Your Entered Track{submissions.length > 1 ? 's' : ''} ({submissions.length})</span>
                      <span className="text-zinc-500 font-normal">50/50 Unified Scorecard Status</span>
                    </div>

                    <div className="space-y-4">
                      {submissions.map((track) => {
                        const isPlayingThis = currentTrackId === track.id && isPlaying;
                        return (
                          <div
                            key={track.id}
                            className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 hover:border-zinc-700/80 transition-all space-y-3"
                          >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex items-center space-x-3.5">
                                <button
                                  type="button"
                                  onClick={() => onPlayTrack(track)}
                                  className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-md ${
                                    isPlayingThis
                                      ? 'bg-emerald-500 text-zinc-950 shadow-emerald-500/30'
                                      : 'bg-zinc-900 hover:bg-zinc-800 text-emerald-400 border border-zinc-800'
                                  }`}
                                >
                                  {isPlayingThis ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5 fill-current" />}
                                </button>

                                <div>
                                  <div className="flex items-center space-x-2">
                                    <h4 className="text-sm font-bold text-white hover:text-emerald-400 transition-colors">
                                      {track.track_title}
                                    </h4>
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                      {track.genre || 'Electronic'}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                                    Submitted {new Date(track.created_at).toLocaleDateString()} • {track.entry_mode === 'curator_skip' ? 'Curator Priority Skip ($15)' : 'Crowd Pool Entry ($5)'}
                                  </div>
                                </div>
                              </div>

                              {/* Scores badge */}
                              <div className="flex items-center space-x-4 self-end md:self-auto">
                                <div className="text-right">
                                  <div className="text-[10px] uppercase font-mono text-zinc-500">Crowd Score</div>
                                  <div className="text-sm font-mono font-bold text-zinc-300">
                                    {track.crowd_rating ? track.crowd_rating.toFixed(1) : '—'}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-[10px] uppercase font-mono text-zinc-500">Curator Score</div>
                                  <div className={`text-sm font-mono font-bold ${track.curator_rating ? 'text-cyan-400' : 'text-zinc-500'}`}>
                                    {track.curator_rating ? track.curator_rating.toFixed(1) : 'Pending'}
                                  </div>
                                </div>
                                <div className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-right">
                                  <div className="text-[9px] uppercase font-mono text-zinc-500 font-bold">Combined</div>
                                  <div className="text-base font-mono font-black text-emerald-400">
                                    {track.final_score > 0 ? track.final_score.toFixed(1) : 'In Review'}
                                  </div>
                                </div>

                                {onOpenSongProfile && (
                                  <button
                                    onClick={() => onOpenSongProfile(track.song_id || track.id)}
                                    className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
                                    title="Open Song Profile & Edit"
                                  >
                                    <Edit3 className="w-4 h-4 text-emerald-400" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* About the Track snippet if present */}
                            {track.about_track && (
                              <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-xs text-zinc-300 flex items-start space-x-2">
                                <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                <div>
                                  <strong className="text-zinc-400 font-mono text-[10px] uppercase mr-1">About Track:</strong>
                                  <span className="italic">{track.about_track}</span>
                                </div>
                              </div>
                            )}

                            {/* Lyrics snippet if present */}
                            {track.lyrics && (
                              <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/60 text-[11px] font-mono text-zinc-400 line-clamp-1 italic">
                                "{track.lyrics.split('\n')[0]}"
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
