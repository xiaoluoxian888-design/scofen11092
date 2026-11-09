import { 
  BoardCriterion, 
  RoyaltySplitMatrix, 
  VoterSnapshotEntry 
} from '../types/schema';

// ============================================================================
// SCOFEN ENGINE ARCHITECTURE MANUAL (CORE MATHEMATICAL RULES)
// ============================================================================

export const BOARD_CREATION_THRESHOLD = 100; // Minimum 100 influence points to create a board
export const CROWD_POOL_ENTRY_FEE = 5.00;     // Standard crowd pool entry fee
export const STREAMING_SUBSCRIPTION_FEE = 5.99; // Monthly streaming subscription
export const ESCALATION_INFLUENCE_SUM_TRIGGER = 100; // Combined influence points sum of crowd voters
export const EXTREME_PENALTY_ABSOLUTE_DISTANCE = 25.0; // Absolute deviation threshold for -1 penalty

/**
 * 1. Identity & Structural Definition
 * A user must possess a minimum of 100 influence points to create a new board.
 */
export function canUserCreateBoard(influencePoints: number): boolean {
  return (influencePoints || 0) >= BOARD_CREATION_THRESHOLD;
}

/**
 * 1. Initial Assessment Calculation
 * Calculate baseline influence points based on host vetting review form.
 */
export function calculateBaselineInfluence(
  evaluations: Array<{ score: number; weight: number }>
): number {
  if (!evaluations || evaluations.length === 0) return 100;
  const totalWeight = evaluations.reduce((sum, e) => sum + e.weight, 0) || 100;
  const weightedSum = evaluations.reduce((sum, e) => sum + (e.score * (e.weight / totalWeight)), 0);
  // Scale between 80 and 150 points
  const baseline = Math.round(weightedSum * 1.2);
  return Math.max(50, Math.min(250, baseline));
}

/**
 * 2. Financial Entry & Pool Mechanics
 * Crowd Pool Entry ($5):
 * • 30% goes directly to Scofen ($1.50)
 * • 70% goes into the board ledger ($3.50), held until crowd rating concludes.
 */
export function splitCrowdPoolFee(fee: number = CROWD_POOL_ENTRY_FEE): {
  grossFee: number;
  scofenCut: number;      // 30% = $1.50
  boardLedgerCut: number; // 70% = $3.50
} {
  const grossFee = Number(fee.toFixed(2));
  const scofenCut = Number((grossFee * 0.30).toFixed(2));
  const boardLedgerCut = Number((grossFee * 0.70).toFixed(2));
  return { grossFee, scofenCut, boardLedgerCut };
}

/**
 * 2. Curator Pricing Rule:
 * The entry fee to a curator is programmatically tied to that curator user's
 * influence point multiplied by 0.1 (Fee = Influence Points × 0.1).
 * E.g., 1,000 Points = $100 fee; 650 Points = $65 fee; 450 Points = $45 fee; 100 Points = $10 fee.
 */
export function calculateCuratorEntryFee(curatorInfluencePoints: number): number {
  const points = Math.max(10, curatorInfluencePoints || 100);
  return Number((points * 0.10).toFixed(2));
}

/**
 * 3. Custom Evaluation Matrix & Scoring Structure
 * Unified Scorecard: Evaluates dimensional scores against custom board criteria weights.
 */
export function calculateUnifiedWeightedScore(
  dimensionScores: Record<string, number>,
  criteria: BoardCriterion[]
): number {
  if (!criteria || criteria.length === 0) return 75;
  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0) || 100;
  let weightedSum = 0;

  for (const c of criteria) {
    const raw = dimensionScores[c.id] ?? 75;
    weightedSum += raw * (c.weight / totalWeight);
  }

  return Number(weightedSum.toFixed(2));
}

/**
 * 3. Scoring Structure:
 * The curator rating and the crowd rating are listed on the board separately.
 * The final combined score is calculated using a strict 50:50 weight split of their respective totals.
 */
export function computeFinalCombinedScore(
  curatorRating: number | null,
  crowdRating: number | null
): {
  finalCombinedScore: number;
  formula: string;
} {
  if (curatorRating !== null && crowdRating !== null) {
    const combined = Number(((curatorRating * 0.50) + (crowdRating * 0.50)).toFixed(2));
    const formula = `50:50 Strict Split: (Curator: ${curatorRating.toFixed(1)} × 0.5) + (Crowd: ${crowdRating.toFixed(1)} × 0.5) = ${combined}`;
    return { finalCombinedScore: combined, formula };
  }

  if (curatorRating !== null) {
    return {
      finalCombinedScore: Number(curatorRating.toFixed(2)),
      formula: `100% Curator Direct Rating: ${curatorRating.toFixed(1)}`,
    };
  }

  if (crowdRating !== null) {
    return {
      finalCombinedScore: Number(crowdRating.toFixed(2)),
      formula: `Active Crowd Average: ${crowdRating.toFixed(1)} (Awaiting Curator Promotion)`,
    };
  }

  return { finalCombinedScore: 0, formula: 'Unrated' };
}

/**
 * 4. Crowd Escalation Loops
 * Curator Promotion Trigger: A song is pushed from the crowd pool to the curator
 * for rating only when BOTH of the following conditions are met:
 * 1. The crowd pool ledger has accumulated enough funds to cover the curator's entry fee.
 * 2. The song has been rated by a group of users whose combined influence points equal or exceed a sum of 100.
 */
export function evaluateCrowdEscalationTrigger(
  boardLedgerBalance: number,
  curatorEntryFee: number,
  combinedVoterInfluence: number
): {
  isTriggered: boolean;
  fundsMet: boolean;
  influenceMet: boolean;
  fundsRequired: number;
  influenceRequired: number;
  fundsShortfall: number;
  influenceShortfall: number;
} {
  const fundsMet = boardLedgerBalance >= curatorEntryFee;
  const influenceMet = combinedVoterInfluence >= ESCALATION_INFLUENCE_SUM_TRIGGER;
  const isTriggered = fundsMet && influenceMet;

  return {
    isTriggered,
    fundsMet,
    influenceMet,
    fundsRequired: curatorEntryFee,
    influenceRequired: ESCALATION_INFLUENCE_SUM_TRIGGER,
    fundsShortfall: Math.max(0, Number((curatorEntryFee - boardLedgerBalance).toFixed(2))),
    influenceShortfall: Math.max(0, Number((ESCALATION_INFLUENCE_SUM_TRIGGER - combinedVoterInfluence).toFixed(1))),
  };
}

/**
 * 5. Streaming Distribution & Royalty Splits
 * If Crowd-Escalated: 70% Artist / 10% Curator / 10% Scofen / 10% accurate crowd raters locked at escalation.
 * If Self-Funded Skip: 80% Artist / 10% Curator / 10% Scofen (10% retained entirely by creator).
 */
export function getRoyaltySplitMatrix(entryMode: 'crowd_pool' | 'curator_skip'): RoyaltySplitMatrix {
  if (entryMode === 'curator_skip') {
    return {
      artist_pct: 80,
      curator_pct: 10,
      scofen_pct: 10,
      crowd_pct: 0,
      type: 'self_funded_skip',
    };
  }

  return {
    artist_pct: 70,
    curator_pct: 10,
    scofen_pct: 10,
    crowd_pct: 10,
    type: 'crowd_escalated',
  };
}

/**
 * 6. Influence Point Dynamics & Curator Isolation
 * Curator Isolation Invariant: Curator is completely isolated from rewards/penalties within their own board.
 * The Consensus Reward: Score within 10% of final combined score -> +1 influence point.
 * The Absolute Extreme Penalty: Absolute distance from final combined score >= 25.0 points -> -1 influence point.
 */
export function evaluateVoterInfluenceDelta(
  voterScore: number,
  finalCombinedScore: number
): {
  delta: number;
  reason: string;
  isAccurate: boolean;
  isExtremeDeviation: boolean;
} {
  const absDistance = Math.abs(voterScore - finalCombinedScore);
  const tenPercentThreshold = finalCombinedScore * 0.10;

  // Consensus Reward (+1)
  if (absDistance <= tenPercentThreshold) {
    return {
      delta: 1,
      reason: `Consensus Reward (+1 pt): Rating of ${voterScore.toFixed(1)} was within 10% (±${tenPercentThreshold.toFixed(1)}) of final combined score ${finalCombinedScore.toFixed(1)}.`,
      isAccurate: true,
      isExtremeDeviation: false,
    };
  }

  // Absolute Extreme Penalty (-1)
  if (absDistance >= EXTREME_PENALTY_ABSOLUTE_DISTANCE) {
    return {
      delta: -1,
      reason: `Absolute Extreme Penalty (-1 pt): Rating of ${voterScore.toFixed(1)} deviated by ${absDistance.toFixed(1)} points from consensus baseline ${finalCombinedScore.toFixed(1)} (exceeded absolute distance threshold of ${EXTREME_PENALTY_ABSOLUTE_DISTANCE}).`,
      isAccurate: false,
      isExtremeDeviation: true,
    };
  }

  // Safe middle zone (0)
  return {
    delta: 0,
    reason: `Neutral (0 pts): Rating of ${voterScore.toFixed(1)} deviated by ${absDistance.toFixed(1)} points from final combined score ${finalCombinedScore.toFixed(1)}.`,
    isAccurate: false,
    isExtremeDeviation: false,
  };
}

// Backward-compatible criteria vector helpers
export function normalizeVector(v: { vp: number; pq: number; ph: number; sa: number }) {
  const sum = v.vp + v.pq + v.ph + v.sa;
  if (sum === 0) return { vp: 0.25, pq: 0.25, ph: 0.25, sa: 0.25 };
  return {
    vp: Number((v.vp / sum).toFixed(4)),
    pq: Number((v.pq / sum).toFixed(4)),
    ph: Number((v.ph / sum).toFixed(4)),
    sa: Number((v.sa / sum).toFixed(4)),
  };
}

export function calculateCriteriaScore(scores: any, baselineWeights: any): number {
  const norm = normalizeVector(baselineWeights);
  const composite = (scores.vp * norm.vp) + (scores.pq * norm.pq) + (scores.ph * norm.ph) + (scores.sa * norm.sa);
  return Number(composite.toFixed(2));
}

export function computeAsymmetricCompositeScore(evaluations: any[], baselineWeights: any) {
  if (!evaluations || evaluations.length === 0) return { compositeScore: 0, totalWeight: 0, noiseAbsorbedPercent: 100 };
  let weightedSum = 0;
  let totalWeight = 0;
  for (const e of evaluations) {
    const s = calculateCriteriaScore(e.scores, baselineWeights);
    weightedSum += s * (e.weight || 1);
    totalWeight += (e.weight || 1);
  }
  return {
    compositeScore: totalWeight > 0 ? Number((weightedSum / totalWeight).toFixed(2)) : 0,
    totalWeight,
    noiseAbsorbedPercent: 100,
  };
}

/**
 * 7. Criteria Weight Rebalancing (Always 100%, 1% in turns from top to bottom)
 */
export function rebalanceCriteriaWeights<T extends { weight: number }>(
  criteria: T[],
  changedIndex: number,
  rawNewWeight: number
): T[] {
  if (criteria.length === 0) return [];
  if (criteria.length === 1) {
    return [{ ...criteria[0], weight: 100 }];
  }

  const clamped = Math.max(
    0,
    Math.min(100, Math.round(Number.isFinite(rawNewWeight) ? rawNewWeight : 0))
  );

  const updated = criteria.map((c, idx) => ({
    ...c,
    weight: idx === changedIndex ? clamped : Math.max(0, Math.round(c.weight)),
  }));

  let diff = updated.reduce((sum, c) => sum + c.weight, 0) - 100;

  while (diff > 0) {
    let changed = false;
    for (let i = 0; i < updated.length; i++) {
      if (i !== changedIndex && updated[i].weight > 0) {
        updated[i].weight -= 1;
        diff -= 1;
        changed = true;
        if (diff === 0) break;
      }
    }
    if (!changed) break;
  }

  while (diff < 0) {
    let changed = false;
    for (let i = 0; i < updated.length; i++) {
      if (i !== changedIndex && updated[i].weight < 100) {
        updated[i].weight += 1;
        diff += 1;
        changed = true;
        if (diff === 0) break;
      }
    }
    if (!changed) break;
  }

  return updated;
}

export function addCriterionWithRebalance<T extends { criterion_name: string; weight: number }>(
  criteria: T[],
  newCriterion: T
): T[] {
  const next = [...criteria, { ...newCriterion, weight: 0 }];
  return rebalanceCriteriaWeights(next, next.length - 1, newCriterion.weight);
}

export function removeCriterionWithRebalance<T extends { weight: number }>(
  criteria: T[],
  removeIndex: number
): T[] {
  if (criteria.length <= 1) return criteria;
  const filtered = criteria.filter((_, i) => i !== removeIndex).map((c) => ({ ...c }));
  let diff = filtered.reduce((sum, c) => sum + c.weight, 0) - 100;

  while (diff < 0) {
    let changed = false;
    for (let i = 0; i < filtered.length; i++) {
      if (filtered[i].weight < 100) {
        filtered[i].weight += 1;
        diff += 1;
        changed = true;
        if (diff === 0) break;
      }
    }
    if (!changed) break;
  }

  while (diff > 0) {
    let changed = false;
    for (let i = 0; i < filtered.length; i++) {
      if (filtered[i].weight > 0) {
        filtered[i].weight -= 1;
        diff -= 1;
        changed = true;
        if (diff === 0) break;
      }
    }
    if (!changed) break;
  }

  return filtered;
}

