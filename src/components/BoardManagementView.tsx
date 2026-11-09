import React, { useState } from 'react';
import { Board, Submission, User } from '../types/schema';
import { apiClient } from '../services/apiClient';
import {
  rebalanceCriteriaWeights,
  addCriterionWithRebalance,
  removeCriterionWithRebalance,
} from '../services/mathEngine';
import { 
  Disc, 
  Plus, 
  Sliders, 
  Play, 
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
  Upload,
  Coins,
  ArrowRight
} from 'lucide-react';
import { 
  BOARD_CREATION_THRESHOLD, 
  calculateCuratorEntryFee, 
  canUserCreateBoard 
} from '../services/mathEngine';

interface BoardManagementViewProps {
  boards: Board[];
  currentUser: User;
  onRefreshBoards: () => void;
  onPlayTrack: (submission: Submission) => void;
  selectedBoardId?: string | null;
  onNavigateToSubmit?: (boardId: string) => void;
}

export const BoardManagementView: React.FC<BoardManagementViewProps> = ({
  boards,
  currentUser,
  onRefreshBoards,
  onPlayTrack,
  selectedBoardId: initialSelectedBoardId,
  onNavigateToSubmit,
}) => {
  const [activeBoardId, setActiveBoardId] = useState<string>(initialSelectedBoardId || boards[0]?.id || '');
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);

  // Quick Track Submission state for non-curator users
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [targetSubmitBoardId, setTargetSubmitBoardId] = useState<string | null>(null);
  const [submitTrackTitle, setSubmitTrackTitle] = useState('Sonic Vanguard (Single)');
  const [submitPreset, setSubmitPreset] = useState('cyber_bass');
  const [submitEntryMode, setSubmitEntryMode] = useState<'crowd_pool' | 'curator_skip'>('crowd_pool');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccessNotice, setSubmitSuccessNotice] = useState<string | null>(null);

  const presets = [
    { id: 'cyber_bass', name: 'Cyber Sub-Bass 128 BPM', genre: 'Industrial / Club', desc: 'Punchy transient side-chain compression' },
    { id: 'analog_soul', name: 'Analog Rhodes Soul 92 BPM', genre: 'Neo-Soul / Lo-Fi', desc: 'Warm acoustic dynamic chords' },
    { id: 'hyper_drill', name: 'Hyper Drill 808 Glide 142 BPM', genre: 'Drill / Trap', desc: 'Rapid hats and subterranean slides' },
    { id: 'modular_hook', name: 'Modular Arpeggiator Lead', genre: 'Synthwave', desc: 'Melodic commercial hook stickiness' },
    { id: 'ambient_void', name: 'Quantum Spatial Void', genre: 'Cinematic / Sync', desc: 'Sync cinematic drone textures' },
  ];

  // Scofen Engine Invariants: Fixed Fee = Influence Points * 0.1, Min 100 pts for creation
  const canCreate = canUserCreateBoard(currentUser.influence_points);
  const fixedCuratorFee = calculateCuratorEntryFee(currentUser.influence_points);

  // New Board Form
  const [newTitle, setNewTitle] = useState('Apex Metro: Future Club & Synthwave');
  const [newGenre, setNewGenre] = useState('Electronic / Synthwave');
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

  React.useEffect(() => {
    if (activeBoardId) {
      fetchBoardDetail(activeBoardId);
    }
  }, [activeBoardId]);

  const handleAddCriterion = () => {
    setNewCriteria(addCriterionWithRebalance(newCriteria, { criterion_name: 'New Custom Dimension', weight: 20 }));
  };

  const handleRemoveCriterion = (index: number) => {
    if (newCriteria.length <= 1) return;
    setNewCriteria(removeCriterionWithRebalance(newCriteria, index));
  };

  const handleUpdateCriterion = (index: number, field: 'criterion_name' | 'weight', value: string | number) => {
    if (field === 'weight') {
      const parsed = value === '' ? 0 : parseInt(String(value), 10);
      setNewCriteria(rebalanceCriteriaWeights(newCriteria, index, Number.isNaN(parsed) ? 0 : parsed));
    } else {
      const updated = [...newCriteria];
      updated[index] = { ...updated[index], criterion_name: String(value) };
      setNewCriteria(updated);
    }
  };

  const handleCreateBoardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate) {
      alert(`Authority Gate Locked: You currently have ${currentUser.influence_points} Influence Points. A minimum of ${BOARD_CREATION_THRESHOLD} points is strictly required to establish a new board.`);
      return;
    }
    if (!newTitle.trim()) return;

    try {
      const created = await apiClient.createBoard(currentUser.id, newTitle, newCriteria, newGenre);
      setIsCreatingBoard(false);
      onRefreshBoards();
      setActiveBoardId(created.id);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to launch board');
    }
  };

  const handleOpenScoring = (sub: Submission) => {
    setScoringSubmissionId(sub.id);
    const initialInputs: Record<string, number> = {};
    if (sub.scores) {
      sub.scores.forEach((sc) => {
        initialInputs[sc.criterion_id] = sc.raw_score;
      });
    }
    setRawScoreInputs(initialInputs);
  };

  // Curator instant rating & 50:50 lock execution
  const handleScoreChange = async (criterionId: string, val: number) => {
    if (!scoringSubmissionId) return;
    const clamped = Math.max(0, Math.min(100, val));
    const nextInputs = { ...rawScoreInputs, [criterionId]: clamped };
    setRawScoreInputs(nextInputs);

    try {
      const result = await apiClient.rateSongAsCurator(scoringSubmissionId, currentUser.id, nextInputs);
      setScoringNotice(`Curator 50:50 Score Locked: ${result.finalCombinedScore.toFixed(1)} / 100 (${result.formula})`);

      if (activeBoardId) {
        fetchBoardDetail(activeBoardId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenSubmitModal = (boardId?: string) => {
    const bId = boardId || activeBoardId || boards[0]?.id;
    setTargetSubmitBoardId(bId);
    setSubmitError(null);
    setIsSubmitModalOpen(true);
  };

  const handleExecuteSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    const boardId = targetSubmitBoardId || activeBoardId;
    const boardToSubmit = boards.find((b) => b.id === boardId) || activeBoard;
    if (!boardToSubmit || !submitTrackTitle.trim()) return;

    setSubmitLoading(true);
    setSubmitError(null);
    try {
      const sub = await apiClient.createSubmission(
        boardToSubmit.id,
        currentUser.id,
        submitTrackTitle,
        submitEntryMode,
        submitPreset
      );

      if (submitEntryMode === 'curator_skip') {
        await apiClient.enterCuratorSkip(sub.id, currentUser.id);
        setSubmitSuccessNotice(
          `Track "${submitTrackTitle}" entered via Curator Skip ($${boardToSubmit.entry_fee.toFixed(2)})! Direct to curator scorecard.`
        );
      } else {
        await apiClient.enterCrowdPool(sub.id, currentUser.id);
        setSubmitSuccessNotice(
          `Track "${submitTrackTitle}" entered into $5.00 Crowd Pool battlefield! ($3.50 held in board pool ledger).`
        );
      }

      onRefreshBoards();
      if (activeBoardId) {
        fetchBoardDetail(activeBoardId);
      }
      setIsSubmitModalOpen(false);
      setTimeout(() => setSubmitSuccessNotice(null), 6000);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Track submission failed');
    } finally {
      setSubmitLoading(false);
    }
  };

  const activeBoard = boardDetail?.board || boards.find((b) => b.id === activeBoardId);
  const isHost = activeBoard?.host_id === currentUser.id;
  const targetSubmitBoard = boards.find((b) => b.id === targetSubmitBoardId) || activeBoard;
  const targetCuratorFee = targetSubmitBoard?.entry_fee ?? 10;

  return (
    <div className="space-y-8 pb-16">
      {/* Header Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800/80 p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                A&R Curator Rooms
              </span>
              <span className="text-xs text-zinc-400">Custom Scoring Dimensions & Direct Submissions</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Curator Boards & Judging Deck
            </h1>
            <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
              Curators host submission rooms with custom weighted grading matrices.
              Entry fees are strictly programmatically fixed to host influence points (Points × 0.1).
              A minimum of 100 Influence Points is required to launch a board battlefield.
            </p>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <button
              onClick={() => setIsCreatingBoard(true)}
              disabled={!canCreate}
              className={`px-5 py-3 rounded-full font-bold text-xs flex items-center space-x-2 transition-all shrink-0 ${
                canCreate
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/60'
              }`}
              title={
                !canCreate
                  ? `Requires minimum ${BOARD_CREATION_THRESHOLD} Influence Points (Current: ${currentUser.influence_points} PTS)`
                  : `Launch board with fixed $${fixedCuratorFee.toFixed(2)} entry fee`
              }
            >
              {canCreate ? <Plus className="w-4 h-4" /> : <Lock className="w-4 h-4 text-zinc-500" />}
              <span>Launch Curator Board</span>
            </button>
            {!canCreate ? (
              <span className="text-[11px] font-mono text-amber-400/90 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Requires ≥100 PTS ({currentUser.influence_points}/100)
              </span>
            ) : (
              <span className="text-[11px] font-mono text-emerald-400/80">
                Fixed Fee: ${fixedCuratorFee.toFixed(2)} ({currentUser.influence_points} PTS × 0.1)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Create Board Modal */}
      {isCreatingBoard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 relative shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsCreatingBoard(false)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <Disc className="w-5 h-5 text-emerald-400" />
                <span>Launch New Curator Board</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Configure your domain criteria weights. Entry fee is mathematically fixed to your active influence points.
              </p>
            </div>

            {!canCreate && (
              <div className="p-4 bg-red-950/40 border border-red-800/60 rounded-2xl flex items-start space-x-3 text-red-300">
                <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <div className="font-bold text-red-200">Board Creation Invariant Locked</div>
                  <div>
                    A user must possess a minimum of {BOARD_CREATION_THRESHOLD} influence points to create a new board.
                    Your current balance is <strong>{currentUser.influence_points} PTS</strong>.
                    Complete an initial assessment or participate in crowd evaluation to establish authority.
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleCreateBoardSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Board / Contest Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Modern Soul Invitational"
                  required
                  disabled={!canCreate}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Scene / Genre Scope</label>
                <input
                  type="text"
                  value={newGenre}
                  onChange={(e) => setNewGenre(e.target.value)}
                  placeholder="e.g. Electronic / Synthwave"
                  required
                  disabled={!canCreate}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                />
              </div>

              {/* NON-EDITABLE FIXED ENTRY FEE (STRICTLY INFLUENCE POINTS * 0.1) */}
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                      <span>Curator Entry Fee (Fixed Amount)</span>
                    </span>
                    <span className="text-[11px] text-zinc-400 block mt-0.5 font-mono">
                      Strictly tied to curator influence points: Points × 0.1
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-extrabold text-emerald-400 font-mono">
                      ${fixedCuratorFee.toFixed(2)} USD
                    </div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                      Non-Editable Invariant
                    </div>
                  </div>
                </div>

                <div className="p-2.5 bg-zinc-950/70 rounded-xl border border-zinc-800/80 text-[11px] text-zinc-400 flex items-center justify-between">
                  <span>Host Influence Authority:</span>
                  <span className="font-mono text-zinc-200 font-bold">
                    {currentUser.influence_points} Influence Points (Fee = {currentUser.influence_points} × 0.1)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400">
                  <div className="bg-zinc-950/70 p-2.5 rounded-xl border border-zinc-800/60">
                    <span className="block text-[10px] text-zinc-500 uppercase font-semibold">Host / Board Ledger (70%)</span>
                    <strong className="text-emerald-400 font-mono">+${(fixedCuratorFee * 0.7).toFixed(2)} USD</strong>
                  </div>
                  <div className="bg-zinc-950/70 p-2.5 rounded-xl border border-zinc-800/60">
                    <span className="block text-[10px] text-zinc-500 uppercase font-semibold">Platform Margin (30%)</span>
                    <strong className="text-zinc-300 font-mono">+${(fixedCuratorFee * 0.3).toFixed(2)} USD</strong>
                  </div>
                </div>
              </div>

              {/* Criteria list */}
              <div className="space-y-2 pt-2 border-t border-zinc-900">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-300">
                    Custom Board Criteria & Weights (0–100)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddCriterion}
                    disabled={!canCreate}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center space-x-1 disabled:opacity-40"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Dimension</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {newCriteria.map((c, idx) => (
                    <div key={idx} className="flex items-center space-x-2 bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800">
                      <input
                        type="text"
                        value={c.criterion_name}
                        onChange={(e) => handleUpdateCriterion(idx, 'criterion_name', e.target.value)}
                        placeholder="Dimension name"
                        disabled={!canCreate}
                        className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                      />
                      <div className="flex items-center space-x-1.5 w-24">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={c.weight}
                          onChange={(e) => handleUpdateCriterion(idx, 'weight', parseInt(e.target.value, 10) || 0)}
                          disabled={!canCreate}
                          className="w-14 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-white text-center focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                        />
                        <span className="text-xs text-zinc-500">wt%</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCriterion(idx)}
                        disabled={!canCreate || newCriteria.length <= 1}
                        className="p-1.5 text-zinc-500 hover:text-rose-400 disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={!canCreate}
                className={`w-full py-3 rounded-xl font-bold text-xs shadow-lg transition-all ${
                  canCreate
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/60'
                }`}
              >
                {canCreate
                  ? `Launch Curator Board ($${fixedCuratorFee.toFixed(2)} Fixed Fee)`
                  : `Creation Locked (Requires ≥100 PTS • Current: ${currentUser.influence_points})`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Main Boards Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Active Boards List */}
        <div className="lg:col-span-4 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 px-1">
            Active Curator Boards ({boards.length})
          </h2>

          <div className="space-y-2.5">
            {boards.map((b) => {
              const isSelected = b.id === activeBoardId;
              const isUserHost = b.host_id === currentUser.id;
              return (
                <div
                  key={b.id}
                  onClick={() => setActiveBoardId(b.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-zinc-900 border-emerald-500/50 shadow-lg shadow-emerald-950/20'
                      : 'bg-zinc-900/50 border-zinc-800/80 hover:bg-zinc-900/80 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-white leading-snug">
                      {b.title}
                    </span>
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/30 shrink-0">
                      ${b.entry_fee.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-400 mt-2">
                    <span>Host: {b.host ? `${b.host.first_name} ${b.host.last_name}` : 'Curator'}</span>
                    {isUserHost ? (
                      <span className="text-amber-400 font-bold text-[11px]">Your Board</span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveBoardId(b.id);
                          handleOpenSubmitModal(b.id);
                        }}
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all"
                      >
                        <Upload className="w-3 h-3" />
                        <span>Submit</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Board Studio & Submissions Deck */}
        <div className="lg:col-span-8 space-y-6">
          {activeBoard && (
            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-3xl p-6 space-y-6">
              {/* Board Header Details */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-xl font-bold text-white">{activeBoard.title}</h2>
                    {isHost ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        CURATOR HOST
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center space-x-1">
                        <Sparkles className="w-3 h-3" />
                        <span>OPEN FOR SUBMISSIONS</span>
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">
                    Curated by <strong className="text-zinc-200">{activeBoard.host?.first_name} {activeBoard.host?.last_name}</strong> ({activeBoard.host?.influence_points || 0} PTS) • Curator Skip: <strong className="text-emerald-400">${activeBoard.entry_fee.toFixed(2)} USD</strong> • Crowd Pool: <strong className="text-zinc-200">$5.00 USD</strong>
                  </div>
                </div>

                {/* Any user who is not the curator of this board will see the option to submit music */}
                {!isHost && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleOpenSubmitModal(activeBoard.id)}
                      className="px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center space-x-2 shadow-lg shadow-emerald-500/25 transition-all"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Submit Music to this Board</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Criteria Weight Allocation Cards */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center space-x-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Curator Evaluation Dimensions</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {activeBoard.criteria?.map((c) => (
                    <div key={c.id} className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800/90">
                      <div className="text-xs font-semibold text-zinc-200 truncate">
                        {c.criterion_name}
                      </div>
                      <div className="flex items-center justify-between text-xs mt-1.5">
                        <span className="text-zinc-500 text-[11px]">Weight</span>
                        <span className="text-emerald-400 font-bold">{c.weight}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submissions Section */}
              <div className="space-y-4 pt-4 border-t border-zinc-800/80">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Track Submissions ({boardDetail?.submissions.length || 0})
                  </h3>
                  {isHost ? (
                    <span className="text-xs text-zinc-500 font-medium">
                      Curator grading unlocked
                    </span>
                  ) : (
                    <button
                      onClick={() => handleOpenSubmitModal(activeBoard.id)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-400 text-xs font-bold flex items-center space-x-1.5 transition-all"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Submit Track</span>
                    </button>
                  )}
                </div>

                {submitSuccessNotice && (
                  <div className="p-3.5 rounded-2xl bg-emerald-950/50 border border-emerald-500/50 text-xs text-emerald-300 flex items-center space-x-2 font-medium shadow-md">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{submitSuccessNotice}</span>
                  </div>
                )}

                {scoringNotice && (
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-300 flex items-center space-x-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{scoringNotice}</span>
                  </div>
                )}

                {loadingBoard ? (
                  <div className="text-center py-10 text-xs text-zinc-500">Loading submissions...</div>
                ) : boardDetail?.submissions.length === 0 ? (
                  <div className="bg-zinc-950 p-8 rounded-2xl border border-zinc-800/80 text-center space-y-3">
                    <Disc className="w-8 h-8 text-zinc-600 mx-auto" />
                    <div className="text-sm font-semibold text-zinc-300">
                      No submissions entered for this board yet.
                    </div>
                    <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                      {isHost
                        ? 'Your curator battlefield is live. Tracks submitted by musicians will appear here for grading.'
                        : `Be the first artist to submit music to ${activeBoard.title}! Enter the $5.00 Crowd Pool or choose Curator Skip.`}
                    </p>
                    {!isHost && (
                      <button
                        onClick={() => handleOpenSubmitModal(activeBoard.id)}
                        className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold inline-flex items-center space-x-2 shadow-md transition-all"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Submit the First Track</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {boardDetail?.submissions.map((sub) => {
                      const isScoringActive = scoringSubmissionId === sub.id;
                      const isPaid = sub.payment_status === 'confirmed';

                      return (
                        <div
                          key={sub.id}
                          className={`bg-zinc-950 rounded-2xl border p-4 transition-all ${
                            isScoringActive ? 'border-emerald-500/60 shadow-lg shadow-emerald-950/30' : 'border-zinc-800/80'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center space-x-3.5">
                              <button
                                onClick={() => onPlayTrack(sub)}
                                className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 flex items-center justify-center text-zinc-300 hover:text-emerald-400 shrink-0 shadow-sm"
                              >
                                <Play className="w-4 h-4 fill-current ml-0.5" />
                              </button>
                              <div>
                                <div className="text-sm font-semibold text-white flex items-center space-x-2">
                                  <span>{sub.track_title}</span>
                                  {isPaid ? (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium">
                                      PAID
                                    </span>
                                  ) : (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-medium">
                                      PENDING
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-zinc-400 mt-0.5">
                                  By {sub.owner ? `${sub.owner.first_name} ${sub.owner.last_name}` : 'Artist'}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-4 justify-between sm:justify-end">
                              <div className="text-right">
                                <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Score</div>
                                <div className="text-lg font-bold text-emerald-400">
                                  {sub.final_score.toFixed(1)}
                                </div>
                              </div>

                              {isHost && isPaid && (
                                <button
                                  onClick={() => handleOpenScoring(sub)}
                                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${
                                    isScoringActive
                                      ? 'bg-emerald-500 text-zinc-950 border-emerald-400'
                                      : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-700'
                                  }`}
                                >
                                  {isScoringActive ? 'Editing Grades' : 'Grade Track'}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Mixing Desk Grade Sliders for Host */}
                          {isScoringActive && isHost && activeBoard.criteria && (
                            <div className="mt-4 pt-4 border-t border-zinc-850 space-y-4 bg-zinc-900/60 p-4 rounded-xl">
                              <div className="flex items-center justify-between text-xs text-zinc-200">
                                <span className="font-bold flex items-center space-x-1.5">
                                  <Sliders className="w-4 h-4 text-emerald-400" />
                                  <span>Curator Mixing Desk (Calculates Final Score Instantly)</span>
                                </span>
                                <span className="text-xs text-emerald-400 font-bold">
                                  Live Sync
                                </span>
                              </div>

                              <div className="space-y-3">
                                {activeBoard.criteria.map((c) => {
                                  const currentVal = rawScoreInputs[c.id] ?? 0;
                                  return (
                                    <div key={c.id} className="space-y-1.5">
                                      <div className="flex justify-between items-center text-xs">
                                        <span className="text-zinc-300 font-medium">{c.criterion_name} ({c.weight}%)</span>
                                        <span className="text-emerald-400 font-bold text-sm">{currentVal} / 100</span>
                                      </div>
                                      <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={currentVal}
                                        onChange={(e) => handleScoreChange(c.id, parseInt(e.target.value, 10))}
                                        className="w-full accent-emerald-500 bg-zinc-800 h-2 rounded-full cursor-pointer"
                                      />
                                    </div>
                                  );
                                })}
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
          )}
        </div>
      </div>

      {/* Submit Music Modal for Non-Curators */}
      {isSubmitModalOpen && targetSubmitBoard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 relative shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setIsSubmitModalOpen(false)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center space-x-2">
                <span className="p-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <Upload className="w-4 h-4" />
                </span>
                <h2 className="text-base font-bold text-white">
                  Submit Music to {targetSubmitBoard.title}
                </h2>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Enter your track into this curator battlefield. Choose between crowd pool competition or direct curator skip.
              </p>
            </div>

            {submitError && (
              <div className="bg-rose-950/40 border border-rose-800/60 p-3 rounded-2xl text-xs text-rose-300 font-medium">
                {submitError}
              </div>
            )}

            <div className="bg-zinc-900/60 p-3.5 rounded-2xl border border-zinc-800 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">Curator Host:</span>
                <span className="text-white font-semibold">
                  {targetSubmitBoard.host ? `${targetSubmitBoard.host.first_name} ${targetSubmitBoard.host.last_name}` : 'Curator'}
                  <span className="text-zinc-500 ml-1 font-mono">({targetSubmitBoard.host?.influence_points || 0} PTS)</span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Curator Skip Fee:</span>
                <span className="text-emerald-400 font-mono font-bold">${targetSubmitBoard.entry_fee.toFixed(2)} USD</span>
              </div>
            </div>

            {/* Entry Mode Selection Tabs */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-300">Select Entry Funnel</label>
              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() => setSubmitEntryMode('crowd_pool')}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    submitEntryMode === 'crowd_pool'
                      ? 'bg-zinc-900 border-emerald-500 shadow-md shadow-emerald-950/40'
                      : 'bg-zinc-950 border-zinc-850 hover:border-zinc-700 opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white">Crowd Pool Entry</span>
                    <span className="text-xs font-bold text-emerald-400 font-mono">$5.00</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 leading-relaxed">
                    $3.50 (70%) into board pool ledger. Escalates to curator when consensus reaches ≥100 PTS and pool covers curator fee.
                  </div>
                </div>

                <div
                  onClick={() => setSubmitEntryMode('curator_skip')}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    submitEntryMode === 'curator_skip'
                      ? 'bg-zinc-900 border-emerald-500 shadow-md shadow-emerald-950/40'
                      : 'bg-zinc-950 border-zinc-850 hover:border-zinc-700 opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white">Curator Skip</span>
                    <span className="text-xs font-bold text-emerald-400 font-mono">
                      ${targetSubmitBoard.entry_fee.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-400 leading-relaxed">
                    Bypasses crowd pool directly to curator for official 50:50 score evaluation. Fee tied to curator's influence.
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleExecuteSubmission} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Track Title</label>
                <input
                  type="text"
                  value={submitTrackTitle}
                  onChange={(e) => setSubmitTrackTitle(e.target.value)}
                  placeholder="e.g. Midnight Cyberpunk (Radio Edit)"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Audio Master Preset</label>
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-1">
                  {presets.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setSubmitPreset(p.id)}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        submitPreset === p.id
                          ? 'bg-zinc-900 border-emerald-500 text-white'
                          : 'bg-zinc-950 border-zinc-850 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-zinc-200">{p.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-emerald-400">
                          {p.genre}
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">{p.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fee summary */}
              <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800 text-xs flex justify-between items-center">
                <span className="text-zinc-400">Total Entry Charge:</span>
                <span className="text-emerald-400 font-bold font-mono text-sm">
                  ${submitEntryMode === 'curator_skip' ? targetSubmitBoard.entry_fee.toFixed(2) : '5.00'} USD
                </span>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  disabled={submitLoading || !submitTrackTitle.trim()}
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  <span>
                    {submitLoading
                      ? 'Processing Submission & Entry...'
                      : `Submit Track (${submitEntryMode === 'curator_skip' ? `$${targetSubmitBoard.entry_fee.toFixed(2)} Skip` : '$5.00 Crowd Pool'})`}
                  </span>
                </button>

                {onNavigateToSubmit && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsSubmitModalOpen(false);
                      onNavigateToSubmit(targetSubmitBoard.id);
                    }}
                    className="w-full py-2 rounded-xl text-zinc-400 hover:text-zinc-200 text-xs flex items-center justify-center space-x-1"
                  >
                    <span>Prefer advanced release studio? Open Studio</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
