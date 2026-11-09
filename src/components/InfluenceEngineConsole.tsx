import React, { useState, useEffect } from 'react';
import { 
  User, 
  Board, 
  Submission, 
  CrowdRatingVote, 
  InfluencePointEvent 
} from '../types/schema';
import { apiClient } from '../services/apiClient';
import { 
  BOARD_CREATION_THRESHOLD,
  CROWD_POOL_ENTRY_FEE,
  STREAMING_SUBSCRIPTION_FEE,
  calculateCuratorEntryFee,
  evaluateCrowdEscalationTrigger,
  computeFinalCombinedScore,
  getRoyaltySplitMatrix,
  canUserCreateBoard
} from '../services/mathEngine';
import { 
  Cpu, 
  ShieldCheck, 
  Coins, 
  Scale, 
  Flame, 
  Radio, 
  Award, 
  Lock, 
  Unlock, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Layers, 
  TrendingUp, 
  TrendingDown,
  Play,
  RotateCcw,
  Plus
} from 'lucide-react';

interface InfluenceEngineConsoleProps {
  currentUser: User;
  allUsers: User[];
  boards: Board[];
  onPlayTrack?: (track: Submission) => void;
  onRefreshData?: () => void;
}

export const InfluenceEngineConsole: React.FC<InfluenceEngineConsoleProps> = ({
  currentUser,
  allUsers,
  boards,
  onPlayTrack,
  onRefreshData,
}) => {
  const [selectedBoardId, setSelectedBoardId] = useState<string>(boards[0]?.id || '');
  const [selectedTrackId, setSelectedTrackId] = useState<string>('');
  const [boardTracks, setBoardTracks] = useState<Submission[]>([]);
  const [boardVotes, setBoardVotes] = useState<CrowdRatingVote[]>([]);
  const [influenceEvents, setInfluenceEvents] = useState<InfluencePointEvent[]>([]);
  const [escalationStatus, setEscalationStatus] = useState<any>(null);

  // Active navigation sub-tab corresponding to the 6 Manual Sections
  const [activeSection, setActiveSection] = useState<'identity' | 'financial' | 'matrix' | 'escalation' | 'streaming' | 'influence'>('escalation');

  // Rating forms
  const [dimensionScores, setDimensionScores] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New Board Modal state
  const [showCreateBoardModal, setShowCreateBoardModal] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [newBoardGenre, setNewBoardGenre] = useState('Cyberpunk / Synth');

  // Initial Assessment state
  const [assessmentScore1, setAssessmentScore1] = useState(85);
  const [assessmentScore2, setAssessmentScore2] = useState(90);
  const [assessmentScore3, setAssessmentScore3] = useState(80);

  const selectedBoard = boards.find((b) => b.id === selectedBoardId) || boards[0];
  const selectedTrack = boardTracks.find((t) => t.id === selectedTrackId) || boardTracks[0];
  const hostUser = selectedBoard?.host;
  const curatorFee = calculateCuratorEntryFee(hostUser ? hostUser.influence_points : 100);

  // Load Board data
  const loadBoardDetails = async (boardId: string) => {
    try {
      const data = await apiClient.getBoard(boardId);
      setBoardTracks(data.submissions);
      if (data.submissions.length > 0) {
        setSelectedTrackId(data.submissions[0].id);
      }

      const esc = await apiClient.getBoardEscalationStatus(boardId);
      setEscalationStatus(esc);

      const events = await apiClient.getInfluenceEvents(currentUser.id);
      setInfluenceEvents(events);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedBoardId) {
      loadBoardDetails(selectedBoardId);
    }
  }, [selectedBoardId, currentUser.id]);

  // Load Track Votes
  const loadTrackVotes = async (trackId: string) => {
    if (!trackId) return;
    try {
      const votes = await apiClient.getTrackVotes(trackId);
      setBoardVotes(votes);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedTrackId) {
      loadTrackVotes(selectedTrackId);
    }
  }, [selectedTrackId]);

  // Initialize dimension scores from board criteria
  useEffect(() => {
    if (selectedBoard?.criteria) {
      const init: Record<string, number> = {};
      selectedBoard.criteria.forEach((c) => {
        init[c.id] = 85;
      });
      setDimensionScores(init);
    }
  }, [selectedBoardId]);

  // 1. Submit Initial Assessment
  const handleCompleteAssessment = async () => {
    try {
      setIsSubmitting(true);
      const res = await apiClient.submitInitialAssessment(currentUser.id, selectedBoardId, [
        { score: assessmentScore1, weight: 40 },
        { score: assessmentScore2, weight: 35 },
        { score: assessmentScore3, weight: 25 },
      ]);
      setFeedbackMsg({
        type: 'success',
        text: `Initial assessment certified! Baseline influence points established at ${res.baselineInfluence} PTS.`,
      });
      if (onRefreshData) onRefreshData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Assessment failed';
      setFeedbackMsg({ type: 'error', text: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. Create Board
  const handleCreateBoard = async () => {
    if (!canUserCreateBoard(currentUser.influence_points)) {
      setFeedbackMsg({
        type: 'error',
        text: `Board Creation Threshold: You have ${currentUser.influence_points} points. Minimum ${BOARD_CREATION_THRESHOLD} points required.`,
      });
      return;
    }
    try {
      setIsSubmitting(true);
      await apiClient.createBoard(currentUser.id, newBoardTitle, [
        { criterion_name: 'Sound Design & Textures', weight: 40 },
        { criterion_name: 'Dynamic Mixdown', weight: 30 },
        { criterion_name: 'Hook Memorability', weight: 30 },
      ], newBoardGenre);
      setShowCreateBoardModal(false);
      setFeedbackMsg({ type: 'success', text: `Board "${newBoardTitle}" created successfully!` });
      if (onRefreshData) onRefreshData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Board creation failed';
      setFeedbackMsg({ type: 'error', text: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Financial Entry: Crowd Pool ($5)
  const handleEnterCrowdPool = async () => {
    if (!selectedTrackId) return;
    try {
      setIsSubmitting(true);
      await apiClient.enterCrowdPool(selectedTrackId, currentUser.id);
      setFeedbackMsg({
        type: 'success',
        text: 'Crowd Pool Entry confirmed! $1.50 (30%) routed to Scofen, $3.50 (70%) credited to Board Ledger.',
      });
      await loadBoardDetails(selectedBoardId);
      if (onRefreshData) onRefreshData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Entry failed';
      setFeedbackMsg({ type: 'error', text: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Financial Entry: Curator Skip
  const handleEnterCuratorSkip = async () => {
    if (!selectedTrackId) return;
    try {
      setIsSubmitting(true);
      await apiClient.enterCuratorSkip(selectedTrackId, currentUser.id);
      setFeedbackMsg({
        type: 'success',
        text: `Curator Skip confirmed! Paid $${curatorFee.toFixed(2)} upfront directly to Curator. Track escalated directly to Curator queue.`,
      });
      await loadBoardDetails(selectedBoardId);
      if (onRefreshData) onRefreshData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Curator skip failed';
      setFeedbackMsg({ type: 'error', text: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Rate as Crowd
  const handleRateAsCrowd = async () => {
    if (!selectedTrackId) return;
    try {
      setIsSubmitting(true);
      const res = await apiClient.rateSongAsCrowd(selectedTrackId, currentUser.id, dimensionScores);
      setFeedbackMsg({
        type: 'success',
        text: `Crowd rating submitted: ${res.vote.composite_score.toFixed(1)}. New active crowd average: ${res.crowdRating.toFixed(1)}.`,
      });
      await loadBoardDetails(selectedBoardId);
      await loadTrackVotes(selectedTrackId);
      if (onRefreshData) onRefreshData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Crowd rating failed';
      setFeedbackMsg({ type: 'error', text: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Rate as Curator
  const handleRateAsCurator = async () => {
    if (!selectedTrackId) return;
    try {
      setIsSubmitting(true);
      const res = await apiClient.rateSongAsCurator(selectedTrackId, currentUser.id, dimensionScores);
      setFeedbackMsg({
        type: 'success',
        text: `Curator rating submitted! Final Combined Score: ${res.finalCombinedScore.toFixed(1)} (${res.formula}). Ratings are permanently LOCKED.`,
      });
      await loadBoardDetails(selectedBoardId);
      await loadTrackVotes(selectedTrackId);
      if (onRefreshData) onRefreshData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Curator rating failed';
      setFeedbackMsg({ type: 'error', text: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Execute Crowd Escalation
  const handleExecuteEscalation = async () => {
    try {
      setIsSubmitting(true);
      const res = await apiClient.executeCrowdEscalation(selectedBoardId);
      setFeedbackMsg({
        type: 'success',
        text: `Escalation executed! Top track "${res.escalatedSubmission.track_title}" promoted to Curator with $${res.curatorFeePaid.toFixed(2)} paid from Board Ledger. Voter snapshot locked.`,
      });
      await loadBoardDetails(selectedBoardId);
      if (onRefreshData) onRefreshData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Escalation failed';
      setFeedbackMsg({ type: 'error', text: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Submit to Scofen Pipeline
  const handleSubmitToScofen = async () => {
    if (!selectedTrackId) return;
    try {
      setIsSubmitting(true);
      await apiClient.submitTrackToScofenPipeline(selectedTrackId, currentUser.id);
      setFeedbackMsg({
        type: 'success',
        text: 'Track submitted to Scofen Streaming Sector Pipeline for handpicked review.',
      });
      await loadBoardDetails(selectedBoardId);
      if (onRefreshData) onRefreshData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Pipeline submission failed';
      setFeedbackMsg({ type: 'error', text: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Scofen Handpicking Approval
  const handleApproveStreaming = async () => {
    if (!selectedTrackId) return;
    try {
      setIsSubmitting(true);
      const res = await apiClient.approveStreamingSector(selectedTrackId);
      setFeedbackMsg({
        type: 'success',
        text: `Track approved by Scofen for Streaming Sector! Royalty Split: ${res.royaltySplit.artist_pct}% Artist / ${res.royaltySplit.curator_pct}% Curator / ${res.royaltySplit.scofen_pct}% Scofen / ${res.royaltySplit.crowd_pct}% Crowd.`,
      });
      await loadBoardDetails(selectedBoardId);
      if (onRefreshData) onRefreshData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Approval failed';
      setFeedbackMsg({ type: 'error', text: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Engine Banner */}
      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-emerald-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-medium">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span>SCOFEN ENGINE ARCHITECTURE MANUAL SPECIFICATION</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Scofen Battlefields, Scoring & Escalation Loops
            </h1>
            <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
              Decentralized music battlefields with strict authority thresholds (100 pts), unified multi-criteria matrices, strict 50:50 scoring, automated crowd escalation loops, and curator isolation.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl px-4 py-2.5 min-w-[130px]">
              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider font-semibold">
                Your Influence
              </div>
              <div className="text-lg font-mono font-bold text-emerald-400">
                {currentUser.influence_points} <span className="text-xs text-zinc-500">PTS</span>
              </div>
              <div className="text-[10px] text-zinc-400">
                {canUserCreateBoard(currentUser.influence_points) ? 'Board Host Eligible (≥100)' : 'Below 100 Threshold'}
              </div>
            </div>

            <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl px-4 py-2.5 min-w-[130px]">
              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider font-semibold">
                Board Ledger
              </div>
              <div className="text-lg font-mono font-bold text-amber-400">
                ${(selectedBoard?.ledger_balance || 0).toFixed(2)}
              </div>
              <div className="text-[10px] text-zinc-400">
                70% Crowd Pool Share
              </div>
            </div>

            <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl px-4 py-2.5 min-w-[130px]">
              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider font-semibold">
                Curator Fee
              </div>
              <div className="text-lg font-mono font-bold text-cyan-400">
                ${curatorFee.toFixed(2)}
              </div>
              <div className="text-[10px] text-zinc-400">
                Host Pts × 0.1
              </div>
            </div>
          </div>
        </div>

        {/* Board & Track Sandboxed Selection */}
        <div className="mt-6 pt-5 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-mono text-zinc-400 font-semibold uppercase tracking-wider">
              Battlefield Board:
            </span>
            <div className="flex items-center gap-2">
              {boards.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBoardId(b.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    b.id === selectedBoardId
                      ? 'bg-emerald-500 text-zinc-950 font-bold shadow-lg shadow-emerald-500/20'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                >
                  {b.title.split(':')[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-400 font-semibold uppercase tracking-wider">
              Evaluating Track:
            </span>
            <select
              value={selectedTrackId}
              onChange={(e) => setSelectedTrackId(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 font-medium focus:outline-none focus:border-emerald-500"
            >
              {boardTracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.track_title} ({t.entry_mode === 'curator_skip' ? 'Curator Skip' : 'Crowd Pool'} - Score: {t.final_score.toFixed(1)})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Manual Section Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 pb-3">
        <button
          onClick={() => setActiveSection('escalation')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeSection === 'escalation'
              ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <Flame className="w-4 h-4" />
          <span>4. Crowd Escalation Loops</span>
        </button>

        <button
          onClick={() => setActiveSection('matrix')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeSection === 'matrix'
              ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>3. Custom Matrix & 50:50 Scoring</span>
        </button>

        <button
          onClick={() => setActiveSection('financial')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeSection === 'financial'
              ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>2. Financial Entry & Pools</span>
        </button>

        <button
          onClick={() => setActiveSection('streaming')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeSection === 'streaming'
              ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>5. Streaming Sector & Royalties</span>
        </button>

        <button
          onClick={() => setActiveSection('influence')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeSection === 'influence'
              ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>6. Curator Isolation & Dynamics</span>
        </button>

        <button
          onClick={() => setActiveSection('identity')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeSection === 'identity'
              ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>1. Identity & 100 Pt Threshold</span>
        </button>
      </div>

      {/* Global Feedback Banner */}
      {feedbackMsg && (
        <div className={`p-4 rounded-xl text-xs font-mono flex items-center justify-between ${
          feedbackMsg.type === 'success' 
            ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300' 
            : 'bg-rose-500/15 border border-rose-500/40 text-rose-300'
        }`}>
          <span>{feedbackMsg.text}</span>
          <button onClick={() => setFeedbackMsg(null)} className="text-zinc-400 hover:text-white">✕</button>
        </div>
      )}

      {/* SECTION 4: CROWD ESCALATION LOOPS */}
      {activeSection === 'escalation' && (
        <div className="space-y-6">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Flame className="w-5 h-5 text-emerald-400" />
                  <span>Section 4: Curator Promotion Trigger & Escalation Loop</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-1 max-w-3xl leading-relaxed">
                  A song is pushed from the crowd pool to the curator for rating only when <strong>BOTH</strong> conditions are satisfied:<br />
                  1. The crowd pool ledger balance has accumulated enough funds to cover the curator&apos;s entry fee (<strong>${curatorFee.toFixed(2)}</strong>).<br />
                  2. The song has been rated by users whose combined influence points equal or exceed <strong>100</strong>.
                </p>
              </div>

              <button
                onClick={handleExecuteEscalation}
                disabled={isSubmitting || !escalationStatus?.eligibleTracks.some((t: any) => t.isTriggered)}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-40 flex items-center space-x-2"
              >
                <ArrowRight className="w-4 h-4" />
                <span>Execute Top Track Escalation</span>
              </button>
            </div>

            {/* Condition Monitors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-zinc-300">Condition 1: Board Ledger Coverage</span>
                  <span className={`font-mono font-bold ${
                    (selectedBoard?.ledger_balance || 0) >= curatorFee ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    ${(selectedBoard?.ledger_balance || 0).toFixed(2)} / ${curatorFee.toFixed(2)}
                  </span>
                </div>
                <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, ((selectedBoard?.ledger_balance || 0) / curatorFee) * 100)}%` }}
                  />
                </div>
                <div className="text-[11px] text-zinc-500">
                  {(selectedBoard?.ledger_balance || 0) >= curatorFee 
                    ? '✓ Ledger funds fully cover curator entry fee' 
                    : `Shortfall: $${(curatorFee - (selectedBoard?.ledger_balance || 0)).toFixed(2)} more needed in crowd pool`}
                </div>
              </div>

              <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-zinc-300">Condition 2: Combined Voter Influence</span>
                  <span className={`font-mono font-bold ${
                    (escalationStatus?.eligibleTracks[0]?.combinedVoterInfluence || 0) >= 100 ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {escalationStatus?.eligibleTracks[0]?.combinedVoterInfluence || 0} / 100 PTS
                  </span>
                </div>
                <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-cyan-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, ((escalationStatus?.eligibleTracks[0]?.combinedVoterInfluence || 0) / 100) * 100)}%` }}
                  />
                </div>
                <div className="text-[11px] text-zinc-500">
                  {(escalationStatus?.eligibleTracks[0]?.combinedVoterInfluence || 0) >= 100 
                    ? '✓ Combined rater authority threshold achieved' 
                    : `Requires ${Math.max(0, 100 - (escalationStatus?.eligibleTracks[0]?.combinedVoterInfluence || 0))} more voter influence points`}
                </div>
              </div>
            </div>
          </div>

          {/* Active Battlefield Tracks in Crowd Pool */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center space-x-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Active Songs in Crowd Pool Battlefield</span>
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-[10px] font-mono uppercase text-zinc-500">
                    <th className="pb-2.5">Track Title</th>
                    <th className="pb-2.5">Crowd Score</th>
                    <th className="pb-2.5">Voter Influence Sum</th>
                    <th className="pb-2.5">Escalation Status</th>
                    <th className="pb-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 font-mono">
                  {escalationStatus?.eligibleTracks.map((item: any) => (
                    <tr key={item.submission.id} className="hover:bg-zinc-900/40">
                      <td className="py-3 font-sans font-medium text-zinc-200">
                        {item.submission.track_title}
                      </td>
                      <td className="py-3 text-cyan-400 font-bold">
                        {item.submission.crowd_rating ? item.submission.crowd_rating.toFixed(1) : 'Unrated'}
                      </td>
                      <td className="py-3 text-zinc-300">
                        {item.combinedVoterInfluence} / 100 PTS
                      </td>
                      <td className="py-3">
                        {item.isTriggered ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                            TRIGGER READY
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[10px]">
                            ACCUMULATING
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        {onPlayTrack && (
                          <button
                            onClick={() => onPlayTrack(item.submission)}
                            className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-[11px]"
                          >
                            Play Track
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: CUSTOM EVALUATION MATRIX & SCORING */}
      {activeSection === 'matrix' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Track Summary & Unified Scorecard Details */}
          <div className="lg:col-span-1 bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-5">
            <div>
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider font-semibold">
                Unified Scorecard
              </span>
              <h3 className="text-base font-bold text-white mt-1">
                {selectedTrack?.track_title || 'Selected Track'}
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Both crowd and curator grade using this exact custom weight matrix.
              </p>
            </div>

            {/* Scorecard Display: Crowd vs Curator vs 50:50 Combined */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Crowd Rating:</span>
                <span className="text-cyan-400 font-bold">
                  {selectedTrack?.crowd_rating !== null && selectedTrack?.crowd_rating !== undefined
                    ? selectedTrack.crowd_rating.toFixed(1)
                    : 'N/A (Skipped / Pending)'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Curator Rating:</span>
                <span className="text-emerald-400 font-bold">
                  {selectedTrack?.curator_rating !== null && selectedTrack?.curator_rating !== undefined
                    ? selectedTrack.curator_rating.toFixed(1)
                    : 'Pending Curator'}
                </span>
              </div>
              <div className="pt-2 border-t border-zinc-800 flex justify-between items-center">
                <span className="text-white font-semibold">Final Combined Score (50:50):</span>
                <span className="text-emerald-300 font-extrabold text-sm">
                  {selectedTrack?.final_score.toFixed(1)}
                </span>
              </div>
              <div className="text-[10px] text-zinc-500 font-sans">
                {computeFinalCombinedScore(selectedTrack?.curator_rating || null, selectedTrack?.crowd_rating || null).formula}
              </div>
            </div>

            {/* Rating Lock Status */}
            <div className="p-3.5 rounded-xl border flex items-center space-x-3 text-xs font-mono font-medium bg-zinc-900/60 border-zinc-800">
              {selectedTrack?.is_locked ? (
                <>
                  <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-amber-300">
                    RATING LOCK ENFORCED: Curator finished rating. Track is permanently locked.
                  </span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-emerald-300">
                    ACTIVE: Open for ratings on this battlefield.
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Interactive Rating Matrix */}
          <div className="lg:col-span-2 bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-5">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Scale className="w-4 h-4 text-emerald-400" />
                <span>Custom Board Criteria & Unified Evaluation</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Configure dimensional scores to submit ratings as either a Crowd Rater or Board Curator.
              </p>
            </div>

            <div className="space-y-3.5">
              {selectedBoard?.criteria?.map((c) => (
                <div key={c.id} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-zinc-200">{c.criterion_name}</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {dimensionScores[c.id] || 80} / 100
                      <span className="text-zinc-500 ml-1.5 font-normal">({c.weight}% Weight)</span>
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    disabled={selectedTrack?.is_locked}
                    value={dimensionScores[c.id] || 80}
                    onChange={(e) =>
                      setDimensionScores((prev) => ({ ...prev, [c.id]: Number(e.target.value) }))
                    }
                    className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer disabled:opacity-40"
                  />
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={handleRateAsCrowd}
                disabled={isSubmitting || selectedTrack?.is_locked}
                className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors disabled:opacity-40"
              >
                Submit as Crowd Rater
              </button>

              <button
                onClick={handleRateAsCurator}
                disabled={isSubmitting || selectedTrack?.is_locked || selectedBoard?.host_id !== currentUser.id}
                title={selectedBoard?.host_id !== currentUser.id ? 'Only Board Curator can submit curator ratings' : ''}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-40"
              >
                Submit as Curator (50:50 Split & Permanent Lock)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: FINANCIAL ENTRY & POOL MECHANICS */}
      {activeSection === 'financial' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Option A: Crowd Pool Entry */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center space-x-2">
              <Coins className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white">Crowd Pool Entry ($5.00)</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Standard entry path for musicians to compete on the battlefield.<br />
              • <strong>30% ($1.50)</strong> goes directly to Scofen platform treasury.<br />
              • <strong>70% ($3.50)</strong> held in board ledger until crowd rating concludes.
            </p>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-zinc-400">
                <span>Total Entry Fee:</span>
                <span className="text-white font-bold">$5.00</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Scofen Margin (30%):</span>
                <span className="text-emerald-400 font-bold">$1.50</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Board Ledger Pool (70%):</span>
                <span className="text-amber-400 font-bold">$3.50</span>
              </div>
            </div>

            <button
              onClick={handleEnterCrowdPool}
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-colors shadow-lg shadow-amber-500/20"
            >
              Enter Crowd Pool ($5.00)
            </button>
          </div>

          {/* Option B: Curator Skip Option */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-bold text-white">Curator Skip Option</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Musicians can choose to pay the full entry fee upfront to skip the crowd pool entirely and go directly to the curator for rating.<br />
              • <strong>Curator Pricing Rule:</strong> Fee = Host Influence Points × 0.1.<br />
              • Current Curator Fee: <strong>${curatorFee.toFixed(2)}</strong> ({hostUser?.influence_points} pts × 0.1).
            </p>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-zinc-400">
                <span>Curator Authority Points:</span>
                <span className="text-white font-bold">{hostUser?.influence_points} PTS</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Programmed Pricing Formula:</span>
                <span className="text-cyan-400 font-bold">Pts × 0.1</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Full Curator Upfront Fee:</span>
                <span className="text-emerald-400 font-bold">${curatorFee.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handleEnterCuratorSkip}
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-colors shadow-lg shadow-emerald-500/20"
            >
              Pay Curator Skip (${curatorFee.toFixed(2)})
            </button>
          </div>
        </div>
      )}

      {/* SECTION 5: STREAMING SECTOR & ROYALTY SPLITS */}
      {activeSection === 'streaming' && (
        <div className="space-y-6">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Radio className="w-5 h-5 text-emerald-400" />
                  <span>Section 5: Streaming Sector Gating & Royalty Splits</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-1 max-w-3xl leading-relaxed">
                  The curator has no direct access or authority to elevate a song to commercial distribution. The right to elevate a track to the downstream consumer catalog is reserved <strong>exclusively by Scofen</strong>. On this producer workstation, all audio playback is unrestricted for producers and curators.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSubmitToScofen}
                  disabled={isSubmitting || selectedBoard?.host_id !== currentUser.id}
                  className="px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-200 hover:text-white font-semibold text-xs"
                >
                  Submit to Scofen Pipeline
                </button>
                <button
                  onClick={handleApproveStreaming}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs shadow-lg shadow-emerald-500/20"
                >
                  Approve for Streaming Sector
                </button>
              </div>
            </div>

            {/* Split Comparison Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Split A: Crowd-Escalated */}
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Crowd-Escalated Split (Locked Snapshot)</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300">
                    Via Board Ledger
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
                  <div className="p-2 rounded bg-zinc-800/80">
                    <div className="text-emerald-400 font-bold text-base">70%</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">Artist</div>
                  </div>
                  <div className="p-2 rounded bg-zinc-800/80">
                    <div className="text-cyan-400 font-bold text-base">10%</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">Curator</div>
                  </div>
                  <div className="p-2 rounded bg-zinc-800/80">
                    <div className="text-purple-400 font-bold text-base">10%</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">Scofen</div>
                  </div>
                  <div className="p-2 rounded bg-zinc-800/80">
                    <div className="text-amber-400 font-bold text-base">10%</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">Crowd Raters</div>
                  </div>
                </div>
                <p className="text-[11px] text-zinc-500">
                  10% crowd allocation divided among fixed snapshot of accurate raters locked at escalation.
                </p>
              </div>

              {/* Split B: Self-Funded Skip */}
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Self-Funded Skip Split</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300">
                    Curator Skip Direct
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                  <div className="p-2 rounded bg-zinc-800/80">
                    <div className="text-emerald-400 font-bold text-base">80%</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">Artist (+10% retained)</div>
                  </div>
                  <div className="p-2 rounded bg-zinc-800/80">
                    <div className="text-cyan-400 font-bold text-base">10%</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">Curator</div>
                  </div>
                  <div className="p-2 rounded bg-zinc-800/80">
                    <div className="text-purple-400 font-bold text-base">10%</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">Scofen</div>
                  </div>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Since the artist paid curator fee upfront, no crowd snapshot exists; 10% crowd allocation is retained entirely by the creator.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 6: INFLUENCE DYNAMICS & CURATOR ISOLATION */}
      {activeSection === 'influence' && (
        <div className="space-y-6">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-bold text-white">
                Curator Isolation Invariant & Crowd Point Dynamics
              </h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-3xl">
              • <strong>Curator Isolation Invariant:</strong> The curator is completely isolated from the influence point reward and penalty mechanics within their own board. Their score is immutable to the algorithmic fluctuations of the crowd games, ensuring their entry fee remains stable.<br />
              • <strong>Consensus Reward:</strong> Any user whose individual rating falls within <strong>10%</strong> of the final combined score receives <strong>+1 influence point</strong>.<br />
              • <strong>Absolute Extreme Penalty:</strong> Penalty of <strong>-1 influence point</strong> triggers based on an absolute minimum distance (≥ 25.0 points) when consensus forms, rather than a flat percentage of users.
            </p>
          </div>

          {/* Influence Events Audit Table */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <h4 className="text-sm font-bold text-white">Your Influence Ledger Events (+1 / -1)</h4>

            {influenceEvents.length === 0 ? (
              <div className="text-xs text-zinc-500 py-4 text-center">
                No influence point events recorded yet. Rate tracks on battlefields to earn +1 consensus rewards!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-[10px] font-mono uppercase text-zinc-500">
                      <th className="pb-2.5">Event Type</th>
                      <th className="pb-2.5">Delta</th>
                      <th className="pb-2.5">Detailed Architectural Rationale</th>
                      <th className="pb-2.5 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 font-mono">
                    {influenceEvents.map((evt, idx) => (
                      <tr key={idx} className="hover:bg-zinc-900/40">
                        <td className="py-2.5">
                          {evt.type === 'CONSENSUS_REWARD' ? (
                            <span className="text-emerald-400 font-bold flex items-center space-x-1">
                              <TrendingUp className="w-3.5 h-3.5" />
                              <span>CONSENSUS REWARD</span>
                            </span>
                          ) : (
                            <span className="text-rose-400 font-bold flex items-center space-x-1">
                              <TrendingDown className="w-3.5 h-3.5" />
                              <span>EXTREME PENALTY</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 font-bold">
                          {evt.point_delta > 0 ? `+${evt.point_delta}` : evt.point_delta} PTS
                        </td>
                        <td className="py-2.5 font-sans text-zinc-300">
                          {evt.reason}
                        </td>
                        <td className="py-2.5 text-right text-zinc-500">
                          {new Date(evt.timestamp).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 1: IDENTITY & 100 PT THRESHOLD */}
      {activeSection === 'identity' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Board Creation Threshold Guard */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center space-x-2">
              <Award className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-bold text-white">Board Creation Threshold (100 PTS)</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              A user must possess a minimum of 100 influence points to create a new board. This ensures all board hosts have established architectural authority before opening a battlefield. Any user who meets this threshold can create their own decentralized boards.
            </p>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-zinc-400">
                <span>Your Influence Balance:</span>
                <span className={`font-bold ${currentUser.influence_points >= 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {currentUser.influence_points} PTS
                </span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Required Creation Threshold:</span>
                <span className="text-white font-bold">100 PTS</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Status:</span>
                <span className={`font-bold ${currentUser.influence_points >= 100 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {currentUser.influence_points >= 100 ? 'AUTHORITY CONFIRMED' : 'LOCKED (INSUFFICIENT AUTHORITY)'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowCreateBoardModal(true)}
              disabled={!canUserCreateBoard(currentUser.influence_points)}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-40 flex items-center justify-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Battlefield Board</span>
            </button>
          </div>

          {/* Initial Assessment Vetting Review Form */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              <h3 className="text-base font-bold text-white">Host Initial Assessment Vetting Form</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Every user must go through an initial assessment to determine their baseline influence point. The host of a board has the unique capability to set up their own criteria and review form for this assessment to vet incoming users.
            </p>

            <div className="space-y-3">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-300">Acoustic & Dynamic Range Ear (40%):</span>
                  <span className="font-mono text-emerald-400 font-bold">{assessmentScore1}</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={assessmentScore1}
                  onChange={(e) => setAssessmentScore1(Number(e.target.value))}
                  className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                />
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-300">Harmonic & Arrangement Vetting (35%):</span>
                  <span className="font-mono text-emerald-400 font-bold">{assessmentScore2}</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={assessmentScore2}
                  onChange={(e) => setAssessmentScore2(Number(e.target.value))}
                  className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                />
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-300">Genre Structural Discipline (25%):</span>
                  <span className="font-mono text-emerald-400 font-bold">{assessmentScore3}</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={assessmentScore3}
                  onChange={(e) => setAssessmentScore3(Number(e.target.value))}
                  className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            <button
              onClick={handleCompleteAssessment}
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors"
            >
              Complete Initial Assessment Vetting
            </button>
          </div>
        </div>
      )}

      {/* Create Board Modal */}
      {showCreateBoardModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Create New Battlefield Board</h3>
            <p className="text-xs text-zinc-400">
              Authority verified: You have {currentUser.influence_points} points (≥ 100).
            </p>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 text-xs flex justify-between items-center">
              <div>
                <span className="text-zinc-400 block text-[11px]">Curator Entry Fee (Fixed Amount):</span>
                <span className="font-mono text-zinc-300 text-[10px]">Host Influence Points × 0.1</span>
              </div>
              <span className="font-mono text-emerald-400 font-bold text-sm">
                ${(currentUser.influence_points * 0.1).toFixed(2)} USD
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-400 block mb-1">Board Battlefield Title</label>
                <input
                  type="text"
                  placeholder="e.g. Sub-Zero Drill Colosseum"
                  value={newBoardTitle}
                  onChange={(e) => setNewBoardTitle(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Genre Category</label>
                <input
                  type="text"
                  placeholder="e.g. Cyberpunk / Club Synth"
                  value={newBoardGenre}
                  onChange={(e) => setNewBoardGenre(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowCreateBoardModal(false)}
                className="px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBoard}
                disabled={!newBoardTitle.trim() || isSubmitting}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs"
              >
                Establish Board
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
