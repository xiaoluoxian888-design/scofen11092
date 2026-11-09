import { 
  User, 
  Board, 
  BoardCriterion, 
  Submission, 
  SubmissionScore, 
  Follow, 
  LedgerEntry, 
  StreamingAccessResult,
  CrowdRatingVote,
  InfluencePointEvent,
  InitialAssessmentCriteria,
  VoterSnapshotEntry,
  RoyaltySplitMatrix,
  SongProfile,
  SongBoardEntry,
  RatedTrackReportItem,
  UserProfileData,
  AssessmentSubmission,
  EmailNotificationTemplate,
  EmailTemplateEventId,
  ActivityFeedItem
} from '../types/schema';
import { DEFAULT_EMAIL_TEMPLATES } from '../data/emailTemplates';
import { 
  BOARD_CREATION_THRESHOLD,
  canUserCreateBoard,
  splitCrowdPoolFee,
  calculateCuratorEntryFee,
  calculateUnifiedWeightedScore,
  computeFinalCombinedScore,
  evaluateCrowdEscalationTrigger,
  getRoyaltySplitMatrix,
  evaluateVoterInfluenceDelta,
  calculateBaselineInfluence
} from './mathEngine';

// Helper for generating UUIDs
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

class ScofenDatabase {
  private users: Map<string, User> = new Map();
  private boards: Map<string, Board> = new Map();
  private criteria: Map<string, BoardCriterion> = new Map();
  private assessmentCriteria: Map<string, InitialAssessmentCriteria[]> = new Map(); // boardId -> criteria[]
  private submissions: Map<string, Submission> = new Map();
  private submissionScores: Map<string, SubmissionScore> = new Map(); // key: submission_id:criterion_id
  private crowdVotes: Map<string, CrowdRatingVote[]> = new Map(); // submissionId -> votes[]
  private influenceEvents: Map<string, InfluencePointEvent[]> = new Map(); // userId -> events[]
  private follows: Set<string> = new Set(); // follower_id:following_id
  private ledger: Map<string, LedgerEntry> = new Map();
  private assessments: Map<string, AssessmentSubmission> = new Map();
  private emailTemplates: Map<string, EmailNotificationTemplate> = new Map();
  private activityFeed: ActivityFeedItem[] = [];
  private emailDispatches: Array<{
    id: string;
    templateId: string;
    recipientEmail: string;
    subject: string;
    body: string;
    timestamp: string;
  }> = [];

  constructor() {
    DEFAULT_EMAIL_TEMPLATES.forEach((tmpl) => {
      this.emailTemplates.set(tmpl.id, { ...tmpl, updated_at: new Date().toISOString() });
    });
    this.seedInitialData();
  }

  // ==========================================
  // SEED INITIAL PRODUCTION DATA
  // ==========================================
  private seedInitialData() {
    // Admin User (Bozhi) with Root Authority & 1000 Influence Points
    const uAdmin: User = {
      id: 'admin-0000-0000-0000-000000000001',
      first_name: 'Bozhi',
      last_name: 'Admin',
      email: 'scofenreborn@gmail.com',
      bio: 'Root Protocol Governor & Administrative Console Oversight. Supervises influence point calibration and platform security.',
      is_subscriber: true,
      influence_points: 1000,
      role: 'admin',
      assessment_status: 'exempt',
      created_at: new Date('2026-10-01T00:00:00Z').toISOString(),
    };

    // 1. Users with Authority Metrics (Influence Points)
    const u1: User = {
      id: '11111111-1111-4111-8111-111111111111',
      first_name: 'Kaelen',
      last_name: 'Vance',
      email: 'scofen2015@gmail.com',
      bio: 'Executive Sound Curator & Host at Vanguard Audio Labs. Rigorous dynamic criteria and analog vetting.',
      is_subscriber: true,
      influence_points: 450, // 450 pts -> Curator Fee: $45.00
      role: 'curator',
      assessment_status: 'exempt',
      created_at: new Date('2026-10-15T10:00:00Z').toISOString(),
    };

    const u2: User = {
      id: '22222222-2222-4222-8222-222222222222',
      first_name: 'Solana',
      last_name: 'Grey',
      email: 'solana.grey@scofen.network',
      bio: 'Neo-Soul vocalist & analog modular producer. Exploring micro-tonal harmonies.',
      is_subscriber: false,
      influence_points: 150, // Meets 100 pt threshold
      role: 'artist',
      assessment_status: 'assessed',
      created_at: new Date('2026-10-16T11:30:00Z').toISOString(),
    };

    const u3: User = {
      id: '33333333-3333-4333-8333-333333333333',
      first_name: 'Marcus',
      last_name: 'Thorne',
      email: 'mthorne@noirpublishing.io',
      bio: 'Commercial sync supervisor for television & film. Rigorous criteria calibration.',
      is_subscriber: true,
      influence_points: 650, // 650 pts -> Curator Fee: $65.00
      role: 'curator',
      assessment_status: 'exempt',
      created_at: new Date('2026-10-17T09:15:00Z').toISOString(),
    };

    const u4: User = {
      id: '44444444-4444-4444-8444-444444444444',
      first_name: 'Devin',
      last_name: 'Cross',
      email: 'dcross@ghostbyte.cc',
      bio: 'Low-end sub-bass specialist and drill beatmaker.',
      is_subscriber: false,
      influence_points: 120, // Meets 100 pt threshold
      role: 'artist',
      assessment_status: 'assessed',
      created_at: new Date('2026-10-18T14:45:00Z').toISOString(),
    };

    const u5: User = {
      id: '55555555-5555-5555-5555-555555555555',
      first_name: 'Aria',
      last_name: 'Novak',
      email: 'aria.novak@scofen.network',
      bio: 'Emerging bedroom songwriter. Currently undergoing initial assessment.',
      is_subscriber: false,
      influence_points: 75, // Below 100 threshold (cannot create board yet)
      role: 'artist',
      assessment_status: 'pending',
      created_at: new Date('2026-10-19T10:00:00Z').toISOString(),
    };

    // 5 Contender Accounts entering Bozhi's Test Board
    const uBozhiArtist1: User = {
      id: 'user-bozhi-art-001',
      first_name: 'Elena',
      last_name: 'Vance',
      email: 'elena.vance@soundcraft.io',
      bio: 'Modular analog synthesist & cyber-sound designer specializing in algorithmic polyrhythms.',
      is_subscriber: true,
      influence_points: 110,
      role: 'artist',
      assessment_status: 'assessed',
      created_at: new Date('2026-10-27T08:00:00Z').toISOString(),
    };

    const uBozhiArtist2: User = {
      id: 'user-bozhi-art-002',
      first_name: 'Marcus',
      last_name: 'Sterling',
      email: 'm.sterling@resonancelabs.com',
      bio: 'Cinematic sound engineer & hybrid orchestral producer for television drama and film trailers.',
      is_subscriber: false,
      influence_points: 135,
      role: 'artist',
      assessment_status: 'assessed',
      created_at: new Date('2026-10-27T09:30:00Z').toISOString(),
    };

    const uBozhiArtist3: User = {
      id: 'user-bozhi-art-003',
      first_name: 'Chloe',
      last_name: 'Dupont',
      email: 'chloe.dupont@paris-sonic.fr',
      bio: 'French Touch electronic producer exploring vintage tape saturation and deep house grooves.',
      is_subscriber: true,
      influence_points: 95,
      role: 'artist',
      assessment_status: 'assessed',
      created_at: new Date('2026-10-27T11:15:00Z').toISOString(),
    };

    const uBozhiArtist4: User = {
      id: 'user-bozhi-art-004',
      first_name: 'Tariq',
      last_name: 'Al-Mansoor',
      email: 'tariq.beats@dubai-audio.ae',
      bio: 'Sub-bass architect & heavy drill beatmaker focused on monofiltered 808 transient design.',
      is_subscriber: false,
      influence_points: 140,
      role: 'artist',
      assessment_status: 'assessed',
      created_at: new Date('2026-10-27T13:00:00Z').toISOString(),
    };

    const uBozhiArtist5: User = {
      id: 'user-bozhi-art-005',
      first_name: 'Maya',
      last_name: 'Lin',
      email: 'maya.lin@tokyo-futurebeats.jp',
      bio: 'Tokyo cyber-pop composer and vocal arrangement specialist working with micro-tonal vocoders.',
      is_subscriber: true,
      influence_points: 125,
      role: 'artist',
      assessment_status: 'assessed',
      created_at: new Date('2026-10-27T15:20:00Z').toISOString(),
    };

    [
      uAdmin, 
      u1, 
      u2, 
      u3, 
      u4, 
      u5,
      uBozhiArtist1,
      uBozhiArtist2,
      uBozhiArtist3,
      uBozhiArtist4,
      uBozhiArtist5
    ].forEach((u) => this.users.set(u.id, u));

    // Follows
    this.addFollow(u2.id, u1.id);
    this.addFollow(u4.id, u1.id);
    this.addFollow(u1.id, u3.id);
    this.addFollow(uBozhiArtist1.id, uAdmin.id);
    this.addFollow(uBozhiArtist2.id, uAdmin.id);
    this.addFollow(uBozhiArtist3.id, uAdmin.id);
    this.addFollow(uBozhiArtist4.id, uAdmin.id);
    this.addFollow(uBozhiArtist5.id, uAdmin.id);

    // 2. Boards with Custom Criteria & Assessment Review Forms
    // Board 1: Apex Metro
    const b1: Board = {
      id: 'b1111111-1111-4111-8111-111111111111',
      host_id: u1.id,
      title: 'Apex Metro: Cyber-Club Sonic Gauntlet',
      board_type: 'Club DJ Rotation & Peak Time',
      description: 'High-energy club bangers, industrial techno, and cyber-synth for underground warehouse rotation.',
      entry_fee: calculateCuratorEntryFee(u1.influence_points), // $45.00 (450 * 0.1)
      ledger_balance: 52.50, // Accumulated from 15 crowd entries ($3.50 * 15 = $52.50 >= $45.00 curator fee!)
      genre: 'Cyberpunk & Club Synthwave',
      cover_gradient: 'from-emerald-600 via-teal-800 to-zinc-950',
      created_at: new Date('2026-10-20T12:00:00Z').toISOString(),
    };
    this.boards.set(b1.id, b1);

    const c1_1: BoardCriterion = { id: 'c1-1', board_id: b1.id, criterion_name: 'Vocal Precision (VP)', weight: 25 };
    const c1_2: BoardCriterion = { id: 'c1-2', board_id: b1.id, criterion_name: 'Production Quality (PQ)', weight: 35 };
    const c1_3: BoardCriterion = { id: 'c1-3', board_id: b1.id, criterion_name: 'Performance / Hook (PH)', weight: 25 };
    const c1_4: BoardCriterion = { id: 'c1-4', board_id: b1.id, criterion_name: 'Sonic Arrangement (SA)', weight: 15 };
    [c1_1, c1_2, c1_3, c1_4].forEach((c) => this.criteria.set(c.id, c));

    // Board 1 Assessment Review Form
    this.assessmentCriteria.set(b1.id, [
      { id: 'ac1-1', board_id: b1.id, question: 'Transients & Limiting Perception', metric_name: 'Dynamic Range Ear', weight: 40 },
      { id: 'ac1-2', board_id: b1.id, question: 'Stereo Field Sub-Bass Monofiltration', metric_name: 'Mixdown Analysis', weight: 35 },
      { id: 'ac1-3', board_id: b1.id, question: 'Synth Harmonic Character', metric_name: 'Genre Fidelity', weight: 25 },
    ]);

    // Board 2: Noir Sync
    const b2: Board = {
      id: 'b2222222-2222-4222-8222-222222222222',
      host_id: u3.id,
      title: 'Noir Sync Invitational: Modern Soul Stems',
      board_type: 'Sync for action movie',
      description: 'Cinematic sync placement for indie action feature films and psychological thriller trailer montages.',
      entry_fee: calculateCuratorEntryFee(u3.influence_points), // $65.00 (650 * 0.1)
      ledger_balance: 35.00, // Accumulated from 10 crowd entries ($35.00 < $65.00 curator fee)
      genre: 'Analog Neo-Soul & R&B',
      cover_gradient: 'from-purple-700 via-indigo-900 to-zinc-950',
      created_at: new Date('2026-10-22T14:00:00Z').toISOString(),
    };
    this.boards.set(b2.id, b2);

    const c2_1: BoardCriterion = { id: 'c2-1', board_id: b2.id, criterion_name: 'Emotive Dynamic Delivery', weight: 40 };
    const c2_2: BoardCriterion = { id: 'c2-2', board_id: b2.id, criterion_name: 'Acoustic Rhodes Fidelity', weight: 30 };
    const c2_3: BoardCriterion = { id: 'c2-3', board_id: b2.id, criterion_name: 'Sync Placement Readiness', weight: 30 };
    [c2_1, c2_2, c2_3].forEach((c) => this.criteria.set(c.id, c));

    // Board 3: Vanguard Global A&R
    const b3: Board = {
      id: 'b3333333-3333-4333-8333-333333333333',
      host_id: uAdmin.id,
      title: 'Vanguard Global: Label A&R Signing Singer',
      board_type: 'Label A&R signing singer',
      description: 'Scouting exceptional vocalists and singer-songwriters for worldwide label roster signing, artist development, and EP production funding.',
      entry_fee: calculateCuratorEntryFee(uAdmin.influence_points), // $100.00 (1000 * 0.1)
      ledger_balance: 70.00, // 20 crowd entries ($3.50 * 20 = $70.00)
      genre: 'Pop & Vocal Melodic',
      cover_gradient: 'from-amber-600 via-rose-900 to-zinc-950',
      created_at: new Date('2026-10-24T09:00:00Z').toISOString(),
    };
    this.boards.set(b3.id, b3);

    const c3_1: BoardCriterion = { id: 'c3-1', board_id: b3.id, criterion_name: 'Vocal Tone & Identity', weight: 35 };
    const c3_2: BoardCriterion = { id: 'c3-2', board_id: b3.id, criterion_name: 'Commercial Hook & Melody', weight: 35 };
    const c3_3: BoardCriterion = { id: 'c3-3', board_id: b3.id, criterion_name: 'Lyrical Resonance & Story', weight: 30 };
    [c3_1, c3_2, c3_3].forEach((c) => this.criteria.set(c.id, c));

    // Board 4: Neon Horizon Game OST
    const b4: Board = {
      id: 'b4444444-4444-4444-8444-444444444444',
      host_id: u2.id,
      title: 'Neon Horizon: Indie Game OST Placement',
      board_type: 'Indie Game OST Placement',
      description: 'Selecting interactive soundtrack stems, futuristic cyber city ambiance, and boss battle themes for a major Steam RPG title.',
      entry_fee: calculateCuratorEntryFee(u2.influence_points), // $15.00 (150 * 0.1)
      ledger_balance: 24.50, // 7 crowd entries ($3.50 * 7 = $24.50 >= $15.00 curator fee)
      genre: 'Cinematic & Orchestral',
      cover_gradient: 'from-cyan-600 via-blue-900 to-zinc-950',
      created_at: new Date('2026-10-25T11:00:00Z').toISOString(),
    };
    this.boards.set(b4.id, b4);

    const c4_1: BoardCriterion = { id: 'c4-1', board_id: b4.id, criterion_name: 'Atmospheric Immersion', weight: 40 };
    const c4_2: BoardCriterion = { id: 'c4-2', board_id: b4.id, criterion_name: 'Stem Mix Clarity', weight: 30 };
    const c4_3: BoardCriterion = { id: 'c4-3', board_id: b4.id, criterion_name: 'Thematic Motif Continuity', weight: 30 };
    [c4_1, c4_2, c4_3].forEach((c) => this.criteria.set(c.id, c));

    // Board 5: Sub-Terranean Festival Stage
    const b5: Board = {
      id: 'b5555555-5555-4555-8555-555555555555',
      host_id: u4.id,
      title: 'Sub-Terranean: Festival Stage Showcase',
      board_type: 'Festival Stage Showcase',
      description: 'Selecting live openers for the 2026 Summer Solstice outdoor festival. Looking for floor-shattering 808s, grime, and hyper-drill energy.',
      entry_fee: calculateCuratorEntryFee(u4.influence_points), // $12.00 (120 * 0.1)
      ledger_balance: 31.50, // 9 crowd entries ($3.50 * 9 = $31.50)
      genre: 'Hip-Hop / Drill & Bass',
      cover_gradient: 'from-red-600 via-orange-900 to-zinc-950',
      created_at: new Date('2026-10-26T15:30:00Z').toISOString(),
    };
    this.boards.set(b5.id, b5);

    const c5_1: BoardCriterion = { id: 'c5-1', board_id: b5.id, criterion_name: 'Sub-Bass Impact & Clarity', weight: 40 };
    const c5_2: BoardCriterion = { id: 'c5-2', board_id: b5.id, criterion_name: 'Rhythmic Bounce & Flow', weight: 35 };
    const c5_3: BoardCriterion = { id: 'c5-3', board_id: b5.id, criterion_name: 'Crowd Energy & Hype Factor', weight: 25 };
    [c5_1, c5_2, c5_3].forEach((c) => this.criteria.set(c.id, c));

    // Board 6: Bozhi's Test Board
    const bBozhi: Board = {
      id: 'board-bozhi-test-01',
      host_id: uAdmin.id,
      title: "Bozhi's Test Board",
      board_type: 'A&R Evaluation & Sonic Gauntlet',
      description: "Official evaluation and curation test board hosted by Bozhi. Focused on dynamic frequency balance, harmonic character, and production fidelity with 70/30 sovereign split.",
      entry_fee: 50.00,
      ledger_balance: 64.00, // 4 crowd entries ($14.00) + 1 curator skip ($50.00) = $64.00
      genre: 'Electronic & Modern Fusion',
      cover_gradient: 'from-purple-800 via-indigo-950 to-zinc-950',
      created_at: new Date('2026-10-28T10:00:00Z').toISOString(),
    };
    this.boards.set(bBozhi.id, bBozhi);

    const cB_1: BoardCriterion = { id: 'cB-1', board_id: bBozhi.id, criterion_name: 'Dynamic Tension & Bass Control', weight: 35 };
    const cB_2: BoardCriterion = { id: 'cB-2', board_id: bBozhi.id, criterion_name: 'Sonic Arrangement & Depth', weight: 35 };
    const cB_3: BoardCriterion = { id: 'cB-3', board_id: bBozhi.id, criterion_name: 'Harmonic Character & Hook', weight: 30 };
    [cB_1, cB_2, cB_3].forEach((c) => this.criteria.set(c.id, c));

    this.assessmentCriteria.set(bBozhi.id, [
      { id: 'acB-1', board_id: bBozhi.id, question: 'Sub-bass mono compatibility & phase integrity', metric_name: 'Phase & Low-End Analysis', weight: 40 },
      { id: 'acB-2', board_id: bBozhi.id, question: 'Transient sharpness under bus compression', metric_name: 'Dynamic Precision', weight: 35 },
      { id: 'acB-3', board_id: bBozhi.id, question: 'Stereo width & arrangement cohesion', metric_name: 'Stereo Field Geometry', weight: 25 },
    ]);

    // 3. Submissions with Manual Architecture States
    // Track 1: Crowd-Escalated and Curator Rated (Locked)
    const s1: Submission = {
      id: 's1111111-1111-4111-8111-111111111111',
      song_id: 'song-cyber-001',
      board_id: b1.id,
      owner_id: u2.id,
      track_title: 'Neural Overdrive (Sub-Grid Mix)',
      lyrics: `[Verse 1]
Wires crossing through the neon veins
Midnight pulses through the subway trains
Zero latency in the sonic drive
Can you feel the circuit come alive?

[Chorus]
Neural overdrive, breaking through the wall
Frequency harmonic till the towers fall
Sub-grid oscillating in the deep blue light
We don't need no sleep inside the digital night.

[Outro]
Analog pulse... resonance high.`,
      audio_url: '/audio/cyber_bass.wav',
      preview_url: '/audio/cyber_bass_preview_60s.wav',
      entry_mode: 'crowd_pool',
      curator_fee_paid: 45.0,
      payment_status: 'confirmed',
      crowd_rating: 91.8,
      curator_rating: 94.6,
      final_score: 93.2, // (94.6 * 0.5) + (91.8 * 0.5)
      is_locked: true,   // Rating Lock: Permanently locked once curator finishes rating!
      escalation_status: 'curator_rated',
      streaming_status: 'none',
      genre: 'Synthwave / Club',
      cover_gradient: 'from-emerald-500 to-cyan-900',
      bpm: 128,
      created_at: new Date('2026-10-23T16:20:00Z').toISOString(),
      audio_preset: 'cyber_bass',
      duration_seconds: 184,
      escalation_voter_snapshot: [
        { voter_id: u1.id, voter_name: 'Kaelen Vance', voter_score: 93.5, voter_influence: 450, is_accurate: true, timestamp: '2026-10-24T12:00:00Z' },
        { voter_id: u3.id, voter_name: 'Marcus Thorne', voter_score: 92.0, voter_influence: 650, is_accurate: true, timestamp: '2026-10-24T12:15:00Z' },
        { voter_id: u4.id, voter_name: 'Devin Cross', voter_score: 90.0, voter_influence: 120, is_accurate: true, timestamp: '2026-10-24T12:30:00Z' },
      ],
    };
    this.submissions.set(s1.id, s1);

    // Curator criteria scores for s1
    this.setRawScoreInternal(s1.id, c1_1.id, 92);
    this.setRawScoreInternal(s1.id, c1_2.id, 98);
    this.setRawScoreInternal(s1.id, c1_3.id, 95);
    this.setRawScoreInternal(s1.id, c1_4.id, 91);

    // Track 2: Self-Funded Curator Skip (Direct Curator Entry)
    const s2: Submission = {
      id: 's2222222-2222-4222-8222-222222222222',
      song_id: 'song-soul-002',
      board_id: b2.id,
      owner_id: u2.id,
      track_title: 'Midnight Velvet Reverie',
      lyrics: `[Verse 1]
Warm Rhodes chords on a rainy street
Slow rhythm falling to the tender beat
Whispers lingering like morning tea
Drifting into velvet reverie

[Chorus]
Hold me where the tape hiss softens the sound
Spinning 33s while the world spins round
Gold dust in the vinyl, amber in the cup
Take your sweetest time before the sun comes up.`,
      audio_url: '/audio/analog_soul.wav',
      preview_url: '/audio/analog_soul_preview_60s.wav',
      entry_mode: 'curator_skip',
      curator_fee_paid: 65.0, // Paid full curator fee upfront
      payment_status: 'confirmed',
      crowd_rating: null,     // No crowd rating (skipped crowd pool)
      curator_rating: 91.8,
      final_score: 91.8,      // 100% Curator rating
      is_locked: true,        // Permanently locked
      escalation_status: 'submitted_to_scofen', // Pipeline: Curator submitted to Scofen!
      streaming_status: 'pending_scofen_approval',
      genre: 'Neo-Soul / Lo-Fi',
      cover_gradient: 'from-purple-600 to-rose-900',
      bpm: 92,
      created_at: new Date('2026-10-24T18:00:00Z').toISOString(),
      audio_preset: 'analog_soul',
      duration_seconds: 215,
      royalty_split: getRoyaltySplitMatrix('curator_skip'), // 80% Artist / 10% Curator / 10% Scofen
    };
    this.submissions.set(s2.id, s2);
    this.setRawScoreInternal(s2.id, c2_1.id, 95);
    this.setRawScoreInternal(s2.id, c2_2.id, 90);
    this.setRawScoreInternal(s2.id, c2_3.id, 89);

    // Track 3: Active in Crowd Pool (Pending Escalation Trigger)
    const s3: Submission = {
      id: 's3333333-3333-4333-8333-333333333333',
      song_id: 'song-drill-003',
      board_id: b1.id,
      owner_id: u4.id,
      track_title: 'Kinetic Shiver (Zero-Kelvin 808)',
      lyrics: `[Intro]
Zero-Kelvin 808...
Load the stutter, hit the gate.

[Verse 1]
Sub bass tremor shaking up the floor
Slide that pitch right through the iron door
Fast hi-hats rattling at 142
Spin the drill pattern till the beat turns blue.

[Chorus]
Kinetic shiver, feel the pressure drop
Once the sub drops in we ain't never gonna stop!`,
      audio_url: '/audio/hyper_drill.wav',
      preview_url: '/audio/hyper_drill_preview_60s.wav',
      entry_mode: 'crowd_pool',
      curator_fee_paid: 0,
      payment_status: 'confirmed',
      crowd_rating: 87.5,
      curator_rating: null,
      final_score: 87.5, // Crowd active score
      is_locked: false,  // Unlocked: Crowd rating active!
      escalation_status: 'crowd_pool',
      streaming_status: 'none',
      genre: 'Hyper Drill / Trap',
      cover_gradient: 'from-amber-600 to-rose-950',
      bpm: 142,
      created_at: new Date('2026-10-25T11:00:00Z').toISOString(),
      audio_preset: 'hyper_drill',
      duration_seconds: 168,
    };
    this.submissions.set(s3.id, s3);

    // Seed Crowd Votes on Track 3 so that combined influence equals or exceeds 100
    const crowdVotesTrack3: CrowdRatingVote[] = [
      {
        id: 'vote-3-1',
        submission_id: s3.id,
        board_id: b1.id,
        voter_id: u1.id,
        voter_name: 'Kaelen Vance',
        voter_influence: 450,
        dimension_scores: { [c1_1.id]: 85, [c1_2.id]: 90, [c1_3.id]: 88, [c1_4.id]: 84 },
        composite_score: 87.2,
        timestamp: new Date('2026-10-26T10:00:00Z').toISOString(),
      },
      {
        id: 'vote-3-2',
        submission_id: s3.id,
        board_id: b1.id,
        voter_id: u2.id,
        voter_name: 'Solana Grey',
        voter_influence: 150,
        dimension_scores: { [c1_1.id]: 86, [c1_2.id]: 88, [c1_3.id]: 89, [c1_4.id]: 85 },
        composite_score: 87.1,
        timestamp: new Date('2026-10-26T10:30:00Z').toISOString(),
      },
    ];
    this.crowdVotes.set(s3.id, crowdVotesTrack3);

    // ==========================================
    // 5 Contenders Entering Bozhi's Test Board
    // ==========================================
    // Contender 1: Elena Vance - Crowd Pool (Score 88.4)
    const sB1: Submission = {
      id: 'sub-bozhi-001',
      song_id: 'song-bozhi-art-001',
      board_id: bBozhi.id,
      owner_id: uBozhiArtist1.id,
      track_title: 'Starlight Circuitry (Extended Mix)',
      lyrics: `[Intro]
Modular sync engaging...
Sequence running at 128.

[Verse 1]
Pulse wave cutting through the static night
Patch cable glow in the phosphor light
Filter cutoff sweeping through the floor
Analog voltages wanting more.

[Chorus]
Starlight circuitry, locked in time
Harmonic resonance on the line
Sub-bass steady at 40 Hertz
Turning the frequencies inside out.`,
      about_track: 'Algorithmic modular synthesizer sequence driven by custom analog filter sweeps and polyrhythmic percussion.',
      audio_url: '/audio/cyber_bass.wav',
      preview_url: '/audio/cyber_bass.wav',
      entry_mode: 'crowd_pool',
      curator_fee_paid: 0,
      payment_status: 'confirmed',
      crowd_rating: 88.4,
      curator_rating: null,
      final_score: 88.4,
      is_locked: false,
      escalation_status: 'crowd_pool',
      streaming_status: 'none',
      genre: 'Synthwave / Cyberpunk',
      cover_gradient: 'from-cyan-600 via-indigo-900 to-black',
      bpm: 128,
      created_at: new Date('2026-10-28T12:00:00Z').toISOString(),
      audio_preset: 'cyber_bass',
      duration_seconds: 195,
    };
    this.submissions.set(sB1.id, sB1);
    this.setRawScoreInternal(sB1.id, cB_1.id, 90);
    this.setRawScoreInternal(sB1.id, cB_2.id, 88);
    this.setRawScoreInternal(sB1.id, cB_3.id, 87);

    // Contender 2: Marcus Sterling - Curator Skip ($50.00 Direct Entry to Bozhi)
    const sB2: Submission = {
      id: 'sub-bozhi-002',
      song_id: 'song-bozhi-art-002',
      board_id: bBozhi.id,
      owner_id: uBozhiArtist2.id,
      track_title: 'Obsidian Horizon (Film Score Edit)',
      lyrics: `[Instrumentation / Hybrid Drone]
Deep orchestral brass layers swelling over tectonic sub-bass.
Atmospheric choral textures resolving into cinematic dissonance.
Pizzicato strings rising to dramatic crescendo.`,
      about_track: 'Heavy hybrid orchestral drone with deep sub-brass textures and wide spatial acoustics, designed for cinematic trailers.',
      audio_url: '/audio/ambient_void.wav',
      preview_url: '/audio/ambient_void.wav',
      entry_mode: 'curator_skip',
      curator_fee_paid: 50.00,
      payment_status: 'confirmed',
      crowd_rating: null,
      curator_rating: null,
      final_score: 0,
      is_locked: false,
      escalation_status: 'escalated_to_curator',
      streaming_status: 'none',
      genre: 'Cinematic Orchestral / Drone',
      cover_gradient: 'from-slate-700 via-zinc-900 to-black',
      bpm: 90,
      created_at: new Date('2026-10-28T13:15:00Z').toISOString(),
      audio_preset: 'ambient_void',
      duration_seconds: 224,
    };
    this.submissions.set(sB2.id, sB2);

    // Contender 3: Chloe Dupont - Crowd Pool (Score 84.6)
    const sB3: Submission = {
      id: 'sub-bozhi-003',
      song_id: 'song-bozhi-art-003',
      board_id: bBozhi.id,
      owner_id: uBozhiArtist3.id,
      track_title: 'Nu-Disco Mirage (Club Cut)',
      lyrics: `[Verse 1]
French filter disco in the afternoon
Rhodes chords drifting underneath the moon
Warm compression on the master bus
Bassline moving with a subtle touch.

[Chorus]
Nu-disco mirage, spin it clean
Sweetest groove you ever seen
Tape reel rolling at 15 IPS
Pure analog soul in every breath.`,
      about_track: 'Warm analog basslines running through 1/4 inch tape machine with French touch filter modulation and soulful electric piano.',
      audio_url: '/audio/analog_soul.wav',
      preview_url: '/audio/analog_soul.wav',
      entry_mode: 'crowd_pool',
      curator_fee_paid: 0,
      payment_status: 'confirmed',
      crowd_rating: 84.6,
      curator_rating: null,
      final_score: 84.6,
      is_locked: false,
      escalation_status: 'crowd_pool',
      streaming_status: 'none',
      genre: 'French Touch / Nu-Disco',
      cover_gradient: 'from-rose-500 via-amber-800 to-purple-950',
      bpm: 122,
      created_at: new Date('2026-10-28T14:30:00Z').toISOString(),
      audio_preset: 'analog_soul',
      duration_seconds: 208,
    };
    this.submissions.set(sB3.id, sB3);
    this.setRawScoreInternal(sB3.id, cB_1.id, 83);
    this.setRawScoreInternal(sB3.id, cB_2.id, 86);
    this.setRawScoreInternal(sB3.id, cB_3.id, 85);

    // Contender 4: Tariq Al-Mansoor - Crowd Pool (Score 87.2)
    const sB4: Submission = {
      id: 'sub-bozhi-004',
      song_id: 'song-bozhi-art-004',
      board_id: bBozhi.id,
      owner_id: uBozhiArtist4.id,
      track_title: 'Sandstorm Mirage (808 Gauntlet)',
      lyrics: `[Intro]
Low frequencies locked at 32 Hertz.
Mono-summed. Calibrated.

[Verse 1]
Desert heat in the concrete maze
808 sub hits like a solar blaze
Sharp triplets cutting through the snare
Heavy air displacement everywhere.

[Chorus]
Sandstorm mirage in the midnight drill
Heavy distortion, total skill
Feel the sub-bass shake the steel
Nothing else in the city feels this real.`,
      about_track: 'Monofiltered 808 sub glides with hyper-syncopated drill percussion designed to test low-end phase response and monitor accuracy.',
      audio_url: '/audio/hyper_drill.wav',
      preview_url: '/audio/hyper_drill.wav',
      entry_mode: 'crowd_pool',
      curator_fee_paid: 0,
      payment_status: 'confirmed',
      crowd_rating: 87.2,
      curator_rating: null,
      final_score: 87.2,
      is_locked: false,
      escalation_status: 'crowd_pool',
      streaming_status: 'none',
      genre: 'Hyper Drill / Trap',
      cover_gradient: 'from-amber-600 via-orange-900 to-zinc-950',
      bpm: 140,
      created_at: new Date('2026-10-28T16:00:00Z').toISOString(),
      audio_preset: 'hyper_drill',
      duration_seconds: 172,
    };
    this.submissions.set(sB4.id, sB4);
    this.setRawScoreInternal(sB4.id, cB_1.id, 92);
    this.setRawScoreInternal(sB4.id, cB_2.id, 84);
    this.setRawScoreInternal(sB4.id, cB_3.id, 86);

    // Contender 5: Maya Lin - Crowd Pool (Score 90.8)
    const sB5: Submission = {
      id: 'sub-bozhi-005',
      song_id: 'song-bozhi-art-005',
      board_id: bBozhi.id,
      owner_id: uBozhiArtist5.id,
      track_title: 'Neon Kintsugi (Vocal Stem Master)',
      lyrics: `[Intro]
Gold dust in the fractured audio line...
Repaired and refined.

[Verse 1]
Shibuya neon reflected on the glass
Digital memories falling so fast
Gold leaf soldered on the broken beat
Crystalline chords on the rainy street.

[Chorus]
Neon kintsugi, stronger than before
Melodies echoing from floor to floor
Every tiny fracture filled with light
Singing through the Tokyo night.`,
      about_track: 'Micro-tonal vocal chops layered over glistening FM synths with dynamic stereo widening and granular delay tails.',
      audio_url: '/audio/modular_hook.wav',
      preview_url: '/audio/modular_hook.wav',
      entry_mode: 'crowd_pool',
      curator_fee_paid: 0,
      payment_status: 'confirmed',
      crowd_rating: 90.8,
      curator_rating: null,
      final_score: 90.8,
      is_locked: false,
      escalation_status: 'crowd_pool',
      streaming_status: 'none',
      genre: 'Future Beats / Cyber-Pop',
      cover_gradient: 'from-fuchsia-600 via-pink-900 to-indigo-950',
      bpm: 130,
      created_at: new Date('2026-10-28T17:45:00Z').toISOString(),
      audio_preset: 'modular_hook',
      duration_seconds: 188,
    };
    this.submissions.set(sB5.id, sB5);
    this.setRawScoreInternal(sB5.id, cB_1.id, 89);
    this.setRawScoreInternal(sB5.id, cB_2.id, 92);
    this.setRawScoreInternal(sB5.id, cB_3.id, 91);

    // Seed Crowd Votes for Bozhi's Test Board Crowd Contenders
    this.crowdVotes.set(sB1.id, [
      {
        id: 'vote-b1-1',
        submission_id: sB1.id,
        board_id: bBozhi.id,
        voter_id: uBozhiArtist2.id,
        voter_name: `${uBozhiArtist2.first_name} ${uBozhiArtist2.last_name}`,
        voter_influence: uBozhiArtist2.influence_points,
        dimension_scores: { [cB_1.id]: 91, [cB_2.id]: 88, [cB_3.id]: 86 },
        composite_score: 88.5,
        timestamp: new Date('2026-10-28T12:30:00Z').toISOString(),
      },
      {
        id: 'vote-b1-2',
        submission_id: sB1.id,
        board_id: bBozhi.id,
        voter_id: uBozhiArtist3.id,
        voter_name: `${uBozhiArtist3.first_name} ${uBozhiArtist3.last_name}`,
        voter_influence: uBozhiArtist3.influence_points,
        dimension_scores: { [cB_1.id]: 89, [cB_2.id]: 88, [cB_3.id]: 88 },
        composite_score: 88.3,
        timestamp: new Date('2026-10-28T12:45:00Z').toISOString(),
      },
    ]);

    this.crowdVotes.set(sB3.id, [
      {
        id: 'vote-b3-1',
        submission_id: sB3.id,
        board_id: bBozhi.id,
        voter_id: uBozhiArtist4.id,
        voter_name: `${uBozhiArtist4.first_name} ${uBozhiArtist4.last_name}`,
        voter_influence: uBozhiArtist4.influence_points,
        dimension_scores: { [cB_1.id]: 83, [cB_2.id]: 86, [cB_3.id]: 85 },
        composite_score: 84.6,
        timestamp: new Date('2026-10-28T14:50:00Z').toISOString(),
      },
    ]);

    this.crowdVotes.set(sB4.id, [
      {
        id: 'vote-b4-1',
        submission_id: sB4.id,
        board_id: bBozhi.id,
        voter_id: uBozhiArtist1.id,
        voter_name: `${uBozhiArtist1.first_name} ${uBozhiArtist1.last_name}`,
        voter_influence: uBozhiArtist1.influence_points,
        dimension_scores: { [cB_1.id]: 93, [cB_2.id]: 84, [cB_3.id]: 85 },
        composite_score: 87.2,
        timestamp: new Date('2026-10-28T16:20:00Z').toISOString(),
      },
    ]);

    this.crowdVotes.set(sB5.id, [
      {
        id: 'vote-b5-1',
        submission_id: sB5.id,
        board_id: bBozhi.id,
        voter_id: uBozhiArtist2.id,
        voter_name: `${uBozhiArtist2.first_name} ${uBozhiArtist2.last_name}`,
        voter_influence: uBozhiArtist2.influence_points,
        dimension_scores: { [cB_1.id]: 89, [cB_2.id]: 92, [cB_3.id]: 92 },
        composite_score: 90.8,
        timestamp: new Date('2026-10-28T18:00:00Z').toISOString(),
      },
    ]);

    // Seed Ledger Entries for Bozhi's Test Board (Total Host Balance: $64.00)
    const bozhiLedger: LedgerEntry[] = [
      {
        id: 'led-bozhi-001',
        submission_id: sB1.id,
        board_id: bBozhi.id,
        payer_id: uBozhiArtist1.id,
        host_id: uAdmin.id,
        entry_fee: 5.0,
        host_cut: 3.5,
        platform_cut: 1.5,
        type: 'CROWD_POOL_ENTRY',
        description: `Crowd Pool Entry [$5.00] — Elena Vance entered "${sB1.track_title}" into "${bBozhi.title}". 70% ($3.50) held in board ledger, 30% ($1.50) Scofen treasury.`,
        created_at: sB1.created_at,
      },
      {
        id: 'led-bozhi-002',
        submission_id: sB2.id,
        board_id: bBozhi.id,
        payer_id: uBozhiArtist2.id,
        host_id: uAdmin.id,
        entry_fee: 50.0,
        host_cut: 50.0,
        platform_cut: 0,
        type: 'CURATOR_SKIP_ENTRY',
        description: `Curator Skip Option [$50.00] — Marcus Sterling entered "${sB2.track_title}" into "${bBozhi.title}". Priority direct submission to Curator Bozhi.`,
        created_at: sB2.created_at,
      },
      {
        id: 'led-bozhi-003',
        submission_id: sB3.id,
        board_id: bBozhi.id,
        payer_id: uBozhiArtist3.id,
        host_id: uAdmin.id,
        entry_fee: 5.0,
        host_cut: 3.5,
        platform_cut: 1.5,
        type: 'CROWD_POOL_ENTRY',
        description: `Crowd Pool Entry [$5.00] — Chloe Dupont entered "${sB3.track_title}" into "${bBozhi.title}". 70% ($3.50) held in board ledger, 30% ($1.50) Scofen treasury.`,
        created_at: sB3.created_at,
      },
      {
        id: 'led-bozhi-004',
        submission_id: sB4.id,
        board_id: bBozhi.id,
        payer_id: uBozhiArtist4.id,
        host_id: uAdmin.id,
        entry_fee: 5.0,
        host_cut: 3.5,
        platform_cut: 1.5,
        type: 'CROWD_POOL_ENTRY',
        description: `Crowd Pool Entry [$5.00] — Tariq Al-Mansoor entered "${sB4.track_title}" into "${bBozhi.title}". 70% ($3.50) held in board ledger, 30% ($1.50) Scofen treasury.`,
        created_at: sB4.created_at,
      },
      {
        id: 'led-bozhi-005',
        submission_id: sB5.id,
        board_id: bBozhi.id,
        payer_id: uBozhiArtist5.id,
        host_id: uAdmin.id,
        entry_fee: 5.0,
        host_cut: 3.5,
        platform_cut: 1.5,
        type: 'CROWD_POOL_ENTRY',
        description: `Crowd Pool Entry [$5.00] — Maya Lin entered "${sB5.track_title}" into "${bBozhi.title}". 70% ($3.50) held in board ledger, 30% ($1.50) Scofen treasury.`,
        created_at: sB5.created_at,
      },
    ];
    bozhiLedger.forEach((entry) => this.ledger.set(entry.id, entry));

    // Initial Activity Feed Items
    this.activityFeed = [
      {
        id: 'act-bozhi-01',
        actor_id: uBozhiArtist1.id,
        actor_name: `${uBozhiArtist1.first_name} ${uBozhiArtist1.last_name}`,
        actor_role: 'artist',
        action_type: 'enter_board',
        title: `${uBozhiArtist1.first_name} entered "${sB1.track_title}" into "${bBozhi.title}"`,
        description: `Crowd Pool contender entered ($5.00 entry fee). 70% ($3.50) allocated to board ledger balance.`,
        target_id: sB1.id,
        target_title: sB1.track_title,
        track_id: sB1.id,
        track_title: sB1.track_title,
        board_id: bBozhi.id,
        board_title: bBozhi.title,
        timestamp: sB1.created_at,
      },
      {
        id: 'act-bozhi-02',
        actor_id: uBozhiArtist2.id,
        actor_name: `${uBozhiArtist2.first_name} ${uBozhiArtist2.last_name}`,
        actor_role: 'artist',
        action_type: 'enter_board',
        title: `${uBozhiArtist2.first_name} bypassed crowd pool for "${sB2.track_title}"`,
        description: `Curator Skip option activated ($50.00 curator fee). Direct priority routing to Curator Bozhi.`,
        target_id: sB2.id,
        target_title: sB2.track_title,
        track_id: sB2.id,
        track_title: sB2.track_title,
        board_id: bBozhi.id,
        board_title: bBozhi.title,
        timestamp: sB2.created_at,
      },
      {
        id: 'act-bozhi-03',
        actor_id: uBozhiArtist3.id,
        actor_name: `${uBozhiArtist3.first_name} ${uBozhiArtist3.last_name}`,
        actor_role: 'artist',
        action_type: 'enter_board',
        title: `${uBozhiArtist3.first_name} entered "${sB3.track_title}" into "${bBozhi.title}"`,
        description: `Crowd Pool contender entered ($5.00 entry fee). 70% ($3.50) allocated to board ledger balance.`,
        target_id: sB3.id,
        target_title: sB3.track_title,
        track_id: sB3.id,
        track_title: sB3.track_title,
        board_id: bBozhi.id,
        board_title: bBozhi.title,
        timestamp: sB3.created_at,
      },
      {
        id: 'act-bozhi-04',
        actor_id: uBozhiArtist4.id,
        actor_name: `${uBozhiArtist4.first_name} ${uBozhiArtist4.last_name}`,
        actor_role: 'artist',
        action_type: 'enter_board',
        title: `${uBozhiArtist4.first_name} entered "${sB4.track_title}" into "${bBozhi.title}"`,
        description: `Crowd Pool contender entered ($5.00 entry fee). 70% ($3.50) allocated to board ledger balance.`,
        target_id: sB4.id,
        target_title: sB4.track_title,
        track_id: sB4.id,
        track_title: sB4.track_title,
        board_id: bBozhi.id,
        board_title: bBozhi.title,
        timestamp: sB4.created_at,
      },
      {
        id: 'act-bozhi-05',
        actor_id: uBozhiArtist5.id,
        actor_name: `${uBozhiArtist5.first_name} ${uBozhiArtist5.last_name}`,
        actor_role: 'artist',
        action_type: 'enter_board',
        title: `${uBozhiArtist5.first_name} entered "${sB5.track_title}" into "${bBozhi.title}"`,
        description: `Crowd Pool contender entered ($5.00 entry fee). 70% ($3.50) allocated to board ledger balance.`,
        target_id: sB5.id,
        target_title: sB5.track_title,
        track_id: sB5.id,
        track_title: sB5.track_title,
        board_id: bBozhi.id,
        board_title: bBozhi.title,
        timestamp: sB5.created_at,
      },
      {
        id: 'act-01',
        actor_id: u3.id,
        actor_name: `${u3.first_name} ${u3.last_name}`,
        actor_role: 'curator',
        action_type: 'curate_track',
        title: `${u3.first_name} finalized curator evaluation for "Sub-Zero Pressure"`,
        description: `Official 50:50 scorecard locked at 84.8 PTS on board "${b2.title}". Rater consensus calculations executed.`,
        target_id: s2.id,
        target_title: 'Sub-Zero Pressure',
        track_id: s2.id,
        track_title: s2.track_title,
        board_id: b2.id,
        board_title: b2.title,
        timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      },
      {
        id: 'act-02',
        actor_id: u2.id,
        actor_name: `${u2.first_name} ${u2.last_name}`,
        actor_role: 'artist',
        action_type: 'enter_board',
        title: `${u2.first_name} entered "${s1.track_title}" into "${b1.title}"`,
        description: `Contender entered via Crowd Pool ($5.00 entry). Currently competing for top-ranked escalation.`,
        target_id: s1.id,
        target_title: s1.track_title,
        track_id: s1.id,
        track_title: s1.track_title,
        board_id: b1.id,
        board_title: b1.title,
        timestamp: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
      },
      {
        id: 'act-03',
        actor_id: u1.id,
        actor_name: `${u1.first_name} ${u1.last_name}`,
        actor_role: 'curator',
        action_type: 'create_board',
        title: `${u1.first_name} established battlefield "${b1.title}"`,
        description: `Curator Gauntlet established with 4 custom evaluation criteria. Skip fee calibrated to $${b1.entry_fee.toFixed(2)}.`,
        target_id: b1.id,
        target_title: b1.title,
        board_id: b1.id,
        board_title: b1.title,
        timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
      },
      {
        id: 'act-04',
        actor_id: u4.id,
        actor_name: `${u4.first_name} ${u4.last_name}`,
        actor_role: 'artist',
        action_type: 'rate_track',
        title: `${u4.first_name} evaluated "${s1.track_title}"`,
        description: `Scored 85.0 PTS on "${b1.title}". Influence points weighted at ${u4.influence_points} PTS.`,
        target_id: s1.id,
        target_title: s1.track_title,
        track_id: s1.id,
        track_title: s1.track_title,
        board_id: b1.id,
        board_title: b1.title,
        timestamp: new Date(Date.now() - 1000 * 60 * 270).toISOString(),
      },
      {
        id: 'act-05',
        actor_id: u2.id,
        actor_name: `${u2.first_name} ${u2.last_name}`,
        actor_role: 'artist',
        action_type: 'follow_user',
        title: `${u2.first_name} started following ${u1.first_name} ${u1.last_name}`,
        description: `Subscribed to live curation updates, battlefield launches, and track evaluations.`,
        target_id: u1.id,
        target_title: `${u1.first_name} ${u1.last_name}`,
        timestamp: new Date(Date.now() - 1000 * 60 * 390).toISOString(),
      },
    ];
  }

  // ==========================================
  // 1. IDENTITY & STRUCTURAL DEFINITION
  // ==========================================

  public getUserById(id: string): User | undefined {
    return this.users.get(id);
  }

  public getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  public signup(first_name: string, last_name: string, email: string, bio: string | null = null): User {
    const existing = Array.from(this.users.values()).find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) throw new Error(`User with email "${email}" already registered.`);

    const newUser: User = {
      id: generateUUID(),
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      email: email.trim().toLowerCase(),
      bio: bio ? bio.trim() : null,
      is_subscriber: false,
      influence_points: 1, // Default baseline for new accounts
      assessment_status: 'pending',
      is_assessment_completed: false,
      created_at: new Date().toISOString(),
    };
    this.users.set(newUser.id, newUser);

    // Event 1: Account creation confirmation email
    this.dispatchEmail('account_creation', newUser.email, {
      user_name: `${newUser.first_name} ${newUser.last_name}`,
      user_email: newUser.email,
      role: 'artist',
      influence_points: newUser.influence_points,
      login_url: 'https://scofen.com/login',
      platform_name: 'Scofen',
    });

    return newUser;
  }

  public signupHostWithAssessment(
    first_name: string,
    last_name: string,
    email: string,
    bio: string | null = null,
    assessment: {
      industryRole: string;
      verificationLinks: string;
      audienceMetrics: string;
      curationCriteria: string;
    }
  ): { user: User; assessment: AssessmentSubmission } {
    const existing = Array.from(this.users.values()).find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) throw new Error(`User with email "${email}" already registered.`);

    const userId = generateUUID();
    const newUser: User = {
      id: userId,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      email: email.trim().toLowerCase(),
      bio: bio ? bio.trim() : null,
      is_subscriber: false,
      influence_points: 1, // Default baseline for new accounts
      assessment_status: 'pending',
      is_assessment_completed: true,
      role: 'curator',
      created_at: new Date().toISOString(),
    };
    this.users.set(newUser.id, newUser);

    const submission: AssessmentSubmission = {
      id: generateUUID(),
      user_id: newUser.id,
      user_name: `${newUser.first_name} ${newUser.last_name}`,
      user_email: newUser.email,
      industryRole: assessment.industryRole,
      verificationLinks: assessment.verificationLinks,
      audienceMetrics: assessment.audienceMetrics,
      curationCriteria: assessment.curationCriteria,
      submitted_at: new Date().toISOString(),
      status: 'pending',
    };
    this.assessments.set(submission.id, submission);

    // Event 1: Account creation confirmation email
    this.dispatchEmail('account_creation', newUser.email, {
      user_name: `${newUser.first_name} ${newUser.last_name}`,
      user_email: newUser.email,
      role: 'curator',
      influence_points: newUser.influence_points,
      login_url: 'https://scofen.com/login',
      platform_name: 'Scofen',
    });

    // Event 3: Initial assessment submission received email
    this.dispatchEmail('assessment_submitted', newUser.email, {
      user_name: `${newUser.first_name} ${newUser.last_name}`,
      user_email: newUser.email,
      industry_role: assessment.industryRole,
      submitted_at: submission.submitted_at,
      current_points: newUser.influence_points,
      admin_terminal_url: 'https://scofen.com/admin',
    });

    this.addActivity({
      actor_id: newUser.id,
      actor_name: `${newUser.first_name} ${newUser.last_name}`,
      actor_role: 'curator',
      action_type: 'gain_influence',
      title: `${newUser.first_name} joined Scofen and submitted Host Assessment`,
      description: `Application queued for Admin Terminal review. Industry Role: ${assessment.industryRole}.`,
    });

    return { user: { ...newUser }, assessment: { ...submission } };
  }

  public submitInfluenceAssessment(
    userId: string,
    payload: {
      industryRole: string;
      verificationLinks: string;
      audienceMetrics: string;
      curationCriteria: string;
    }
  ): User {
    const user = this.users.get(userId);
    if (!user) throw new Error(`User ${userId} not found`);
    if (user.is_assessment_completed) {
      throw new Error('Initial Influence Assessment has already been completed for this account.');
    }
    user.is_assessment_completed = true;
    user.assessment_status = 'pending';
    this.users.set(userId, user);

    const submission: AssessmentSubmission = {
      id: generateUUID(),
      user_id: user.id,
      user_name: `${user.first_name} ${user.last_name}`,
      user_email: user.email,
      industryRole: payload.industryRole,
      verificationLinks: payload.verificationLinks,
      audienceMetrics: payload.audienceMetrics,
      curationCriteria: payload.curationCriteria,
      submitted_at: new Date().toISOString(),
      status: 'pending',
    };
    this.assessments.set(submission.id, submission);

    // Event 3: Initial assessment submission received email
    this.dispatchEmail('assessment_submitted', user.email, {
      user_name: `${user.first_name} ${user.last_name}`,
      user_email: user.email,
      industry_role: payload.industryRole,
      submitted_at: submission.submitted_at,
      current_points: user.influence_points,
      admin_terminal_url: 'https://scofen.com/admin',
    });

    this.addActivity({
      actor_id: user.id,
      actor_name: `${user.first_name} ${user.last_name}`,
      actor_role: user.role || 'artist',
      action_type: 'gain_influence',
      title: `${user.first_name} submitted Initial Influence Assessment`,
      description: `Dossier submitted to Admin Terminal for manual review. Role: ${payload.industryRole}.`,
    });

    return { ...user };
  }

  public getPendingAssessments(): AssessmentSubmission[] {
    return Array.from(this.assessments.values())
      .filter((a) => a.status === 'pending')
      .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
  }

  public finalizeAssessment(
    assessmentId: string,
    assignedPoints: number
  ): { assessment: AssessmentSubmission; user: User } {
    const assessment = this.assessments.get(assessmentId);
    if (!assessment) throw new Error(`Assessment ${assessmentId} not found`);
    if (assessment.status === 'finalized') {
      throw new Error('Assessment has already been finalized.');
    }

    const user = this.users.get(assessment.user_id);
    if (!user) throw new Error(`User ${assessment.user_id} not found`);

    const finalPoints = Math.max(1, Math.round(Number.isFinite(assignedPoints) ? assignedPoints : 1));
    const delta = finalPoints - user.influence_points;
    user.influence_points = finalPoints;
    user.assessment_status = 'assessed';
    if (finalPoints >= 100 && !user.role) {
      user.role = 'curator';
    }
    this.users.set(user.id, user);

    assessment.status = 'finalized';
    this.assessments.set(assessment.id, assessment);

    const events = this.influenceEvents.get(user.id) || [];
    events.unshift({
      user_id: user.id,
      user_name: `${user.first_name} ${user.last_name}`,
      submission_id: assessment.id,
      point_delta: delta,
      type: 'CONSENSUS_REWARD',
      reason: `Initial Influence Assessment finalized by Admin: ${finalPoints} PTS assigned.`,
      timestamp: new Date().toISOString(),
    });
    this.influenceEvents.set(user.id, events);

    // Event 4: Initial assessment completed with result email
    this.dispatchEmail('assessment_completed', user.email, {
      user_name: `${user.first_name} ${user.last_name}`,
      user_email: user.email,
      assigned_points: finalPoints,
      point_delta: delta >= 0 ? `+${delta}` : `${delta}`,
      authority_status: finalPoints >= 100 ? 'Verified Board Host Authority (≥100 PTS)' : 'Verified Community Evaluator',
      dashboard_url: 'https://scofen.com/dashboard',
    });

    this.addActivity({
      actor_id: user.id,
      actor_name: `${user.first_name} ${user.last_name}`,
      actor_role: user.role,
      action_type: 'gain_influence',
      title: `${user.first_name} calibrated authority index to ${finalPoints} PTS`,
      description: `Initial assessment completed by Admin Terminal. Shift: +${delta} PTS. Authority tier: ${finalPoints >= 100 ? 'Host Eligible' : 'Evaluator'}.`,
    });

    return { assessment: { ...assessment }, user: { ...user } };
  }

  public login(email: string): User {
    const user = Array.from(this.users.values()).find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) throw new Error(`No account found matching email "${email}".`);
    return user;
  }

  public toggleSubscriber(userId: string): User {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    user.is_subscriber = !user.is_subscriber;
    this.users.set(userId, user);

    // Event 11: Payment notification for Streaming Pass
    if (user.is_subscriber) {
      this.dispatchEmail('payment_notification', user.email, {
        payer_name: `${user.first_name} ${user.last_name}`,
        payer_email: user.email,
        payee_name: 'Scofen Protocol Streaming Clearinghouse',
        amount: '0.00',
        payment_type: 'Producer Suite Master Audio Access',
        host_cut: '0.00',
        platform_cut: '0.00',
        ledger_id: `pass_${generateUUID().slice(0, 8)}`,
        timestamp: new Date().toISOString(),
      });
    }

    return user;
  }

  public adjustUserInfluence(userId: string, delta: number, reason: string, submissionId?: string): number {
    const user = this.users.get(userId);
    if (!user) throw new Error(`User ${userId} not found`);

    user.influence_points = Math.max(1, Number((user.influence_points + delta).toFixed(1)));
    this.users.set(userId, user);

    // Record event
    const event: InfluencePointEvent = {
      user_id: user.id,
      user_name: `${user.first_name} ${user.last_name}`,
      submission_id: submissionId || '',
      point_delta: delta,
      type: delta > 0 ? 'CONSENSUS_REWARD' : 'EXTREME_PENALTY',
      reason,
      timestamp: new Date().toISOString(),
    };

    const list = this.influenceEvents.get(user.id) || [];
    list.unshift(event);
    this.influenceEvents.set(user.id, list);

    // Event 9: Influence point up or down notification
    const sub = submissionId ? this.submissions.get(submissionId) : undefined;
    this.dispatchEmail('influence_delta', user.email, {
      user_name: `${user.first_name} ${user.last_name}`,
      point_delta: delta > 0 ? `+${delta}` : `${delta}`,
      new_total: user.influence_points,
      reason,
      track_title: sub ? sub.track_title : 'Evaluated Track',
      final_score: sub ? sub.final_score.toFixed(1) : 'Locked',
      dashboard_url: 'https://scofen.com/dashboard',
    });

    return user.influence_points;
  }

  public getInfluenceEvents(userId: string): InfluencePointEvent[] {
    return this.influenceEvents.get(userId) || [];
  }

  // ==========================================
  // EMAIL NOTIFICATION SYSTEM (12 PROTOCOL EVENTS)
  // ==========================================

  public getEmailTemplates(): EmailNotificationTemplate[] {
    return Array.from(this.emailTemplates.values());
  }

  public getEmailTemplate(id: string): EmailNotificationTemplate | undefined {
    return this.emailTemplates.get(id);
  }

  public updateEmailTemplate(
    id: string,
    updates: Partial<EmailNotificationTemplate>
  ): EmailNotificationTemplate {
    const tmpl = this.emailTemplates.get(id);
    if (!tmpl) throw new Error(`Email template "${id}" not found.`);

    const updated: EmailNotificationTemplate = {
      ...tmpl,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.emailTemplates.set(id, updated);
    return updated;
  }

  public resetEmailTemplates(): EmailNotificationTemplate[] {
    this.emailTemplates.clear();
    DEFAULT_EMAIL_TEMPLATES.forEach((t) => {
      this.emailTemplates.set(t.id, { ...t, updated_at: new Date().toISOString() });
    });
    return Array.from(this.emailTemplates.values());
  }

  public dispatchEmail(
    templateId: EmailTemplateEventId,
    recipientEmail: string,
    variables: Record<string, string | number | boolean | null | undefined>
  ): {
    success: boolean;
    dispatchId: string;
    templateId: string;
    recipientEmail: string;
    subject: string;
    body: string;
    timestamp: string;
  } {
    const tmpl = this.emailTemplates.get(templateId);
    let subject = tmpl ? tmpl.subject : `Scofen Notification: ${templateId}`;
    let body = tmpl ? tmpl.body : '';

    // Variable substitutions
    Object.entries(variables).forEach(([key, val]) => {
      const formattedVal = val !== null && val !== undefined ? String(val) : '';
      const reg = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      subject = subject.replace(reg, formattedVal);
      body = body.replace(reg, formattedVal);
    });

    // Handle template conditional blocks like {{#if_can_host}}...{{/if_can_host}}
    const canHost = Number(variables.assigned_points || 0) >= 100;
    if (canHost) {
      body = body.replace(/\{\{#if_can_host\}\}/g, '').replace(/\{\{\/if_can_host\}\}/g, '');
    } else {
      body = body.replace(/\{\{#if_can_host\}\}[\s\S]*?\{\{\/if_can_host\}\}/g, '');
    }

    const dispatchRecord = {
      id: generateUUID(),
      templateId,
      recipientEmail,
      subject,
      body,
      timestamp: new Date().toISOString(),
    };

    this.emailDispatches.unshift(dispatchRecord);
    if (this.emailDispatches.length > 150) {
      this.emailDispatches.pop();
    }

    return {
      success: tmpl ? tmpl.enabled : true,
      dispatchId: dispatchRecord.id,
      templateId,
      recipientEmail,
      subject,
      body,
      timestamp: dispatchRecord.timestamp,
    };
  }

  public getEmailDispatches() {
    return this.emailDispatches;
  }

  public requestPasswordReset(email: string): { success: boolean; message: string; resetLink: string } {
    const user = Array.from(this.users.values()).find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    const resetToken = generateUUID();
    const resetLink = `https://scofen.network/auth/reset?token=${resetToken}&email=${encodeURIComponent(email.trim())}`;
    
    this.dispatchEmail('password_reset', email.trim(), {
      user_name: user ? `${user.first_name} ${user.last_name}` : 'Scofen Member',
      user_email: email.trim(),
      reset_link: resetLink,
      expiry_time: '60 minutes',
      support_email: 'security@scofen.network',
    });

    return {
      success: true,
      message: `Password reset verification dispatched to ${email}.`,
      resetLink,
    };
  }

  // ==========================================
  // SOCIAL ACTIVITY FEED & "WHAT IS NEW"
  // ==========================================

  public addActivity(item: Omit<ActivityFeedItem, 'id' | 'timestamp'> & { timestamp?: string }): ActivityFeedItem {
    const activity: ActivityFeedItem = {
      id: generateUUID(),
      timestamp: item.timestamp || new Date().toISOString(),
      ...item,
    };
    this.activityFeed.unshift(activity);
    if (this.activityFeed.length > 200) {
      this.activityFeed.pop();
    }
    return activity;
  }

  public getWhatIsNewFeed(userId?: string): {
    feed: ActivityFeedItem[];
    followedUserIds: string[];
    suggestedUsers: User[];
  } {
    const followingSet = new Set<string>();
    if (userId) {
      this.follows.forEach((pair) => {
        const [follower, following] = pair.split(':');
        if (follower === userId) {
          followingSet.add(following);
        }
      });
    }

    // Followed users' feed
    let feed = this.activityFeed.filter((item) => followingSet.has(item.actor_id));

    // If followed feed has fewer than 8 items or user follows 0, supplement with network activity
    if (feed.length < 8) {
      const seenIds = new Set(feed.map((f) => f.id));
      for (const item of this.activityFeed) {
        if (!seenIds.has(item.id) && item.actor_id !== userId) {
          feed.push(item);
          seenIds.add(item.id);
          if (feed.length >= 15) break;
        }
      }
    }

    // Sort newest first
    feed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Suggested users to follow
    const suggestedUsers = Array.from(this.users.values())
      .filter((u) => u.id !== userId && !followingSet.has(u.id))
      .sort((a, b) => (b.influence_points || 0) - (a.influence_points || 0))
      .slice(0, 5);

    return {
      feed,
      followedUserIds: Array.from(followingSet),
      suggestedUsers,
    };
  }

  /**
   * Initial Assessment: Board host sets up criteria and review form to vet incoming users.
   */
  public submitInitialAssessment(
    userId: string,
    boardId: string,
    answers: Array<{ score: number; weight: number }>
  ): { user: User; baselineInfluence: number } {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');

    const baseline = calculateBaselineInfluence(answers);
    user.influence_points = baseline;
    user.assessment_status = 'assessed';
    this.users.set(user.id, user);

    return { user, baselineInfluence: baseline };
  }

  /**
   * Board Creation:
   * A user must possess a minimum of 100 influence points to create a new board.
   */
  public createBoard(
    host_id: string,
    title: string,
    criteria: Array<{ criterion_name: string; weight: number }>,
    genre?: string,
    cover_gradient?: string,
    assessment_criteria?: Array<{ question: string; metric_name: string; weight: number }>,
    board_type?: string,
    description?: string
  ): Board {
    const host = this.users.get(host_id);
    if (!host) throw new Error('Host user not found');

    // STRICT INVARIANT ENFORCEMENT
    if (!canUserCreateBoard(host.influence_points)) {
      throw new Error(
        `Board Creation Threshold Failed: Host has ${host.influence_points} influence points. A minimum of ${BOARD_CREATION_THRESHOLD} points is strictly required to establish a new board.`
      );
    }

    const boardId = generateUUID();
    const entryFee = calculateCuratorEntryFee(host.influence_points);

    const newBoard: Board = {
      id: boardId,
      host_id,
      title: title.trim(),
      description: description ? description.trim() : null,
      board_type: board_type ? board_type.trim() : 'Custom Opportunity',
      entry_fee: entryFee,
      ledger_balance: 0.0,
      genre: genre || 'Electronic / Hybrid',
      cover_gradient: cover_gradient || 'from-emerald-600 via-teal-800 to-zinc-950',
      created_at: new Date().toISOString(),
    };
    this.boards.set(boardId, newBoard);

    // Save criteria
    criteria.forEach((c) => {
      const critId = generateUUID();
      this.criteria.set(critId, {
        id: critId,
        board_id: boardId,
        criterion_name: c.criterion_name,
        weight: c.weight,
      });
    });

    // Save assessment review form criteria if provided
    if (assessment_criteria && assessment_criteria.length > 0) {
      const acList: InitialAssessmentCriteria[] = assessment_criteria.map((ac) => ({
        id: generateUUID(),
        board_id: boardId,
        question: ac.question,
        metric_name: ac.metric_name,
        weight: ac.weight,
      }));
      this.assessmentCriteria.set(boardId, acList);
    }

    // Event 5: Board creation confirmation email
    this.dispatchEmail('board_created', host.email, {
      host_name: `${host.first_name} ${host.last_name}`,
      host_email: host.email,
      board_title: newBoard.title,
      genre: newBoard.genre || 'Electronic',
      entry_fee: newBoard.entry_fee.toFixed(2),
      board_url: `https://scofen.com/boards/${newBoard.id}`,
      criteria_summary: criteria.map((c) => `${c.criterion_name} (${c.weight}%)`).join(', '),
    });

    this.addActivity({
      actor_id: host.id,
      actor_name: `${host.first_name} ${host.last_name}`,
      actor_role: 'curator',
      action_type: 'create_board',
      title: `${host.first_name} launched battlefield "${newBoard.title}"`,
      description: `New battlefield open for submissions. Skip fee: $${newBoard.entry_fee.toFixed(2)}.`,
      board_id: newBoard.id,
      board_title: newBoard.title,
    });

    return this.hydrateBoard(newBoard);
  }

  public getAllBoards(): Board[] {
    return Array.from(this.boards.values()).map((b) => this.hydrateBoard(b));
  }

  public getBoard(id: string): Board | undefined {
    const b = this.boards.get(id);
    return b ? this.hydrateBoard(b) : undefined;
  }

  public getBoardCriteria(boardId: string): BoardCriterion[] {
    return Array.from(this.criteria.values()).filter((c) => c.board_id === boardId);
  }

  public processCheckout(submissionId: string, payerId: string) {
    return this.enterCrowdPool(submissionId, payerId);
  }

  /**
   * Crowd Pool Entry:
   * $5 entry fee.
   * 30% ($1.50) goes directly to Scofen.
   * 70% ($3.50) goes into the board ledger.
   */
  public enterCrowdPool(submissionId: string, payerId: string): {
    submission: Submission;
    board: Board;
    ledgerEntry: LedgerEntry;
  } {
    const sub = this.submissions.get(submissionId);
    if (!sub) throw new Error(`Submission ${submissionId} not found`);
    const board = this.boards.get(sub.board_id);
    if (!board) throw new Error(`Board ${sub.board_id} not found`);

    const split = splitCrowdPoolFee(5.0);

    // Update board ledger balance
    board.ledger_balance = Number((board.ledger_balance + split.boardLedgerCut).toFixed(2));
    this.boards.set(board.id, board);

    // Update submission
    sub.payment_status = 'confirmed';
    sub.entry_mode = 'crowd_pool';
    sub.escalation_status = 'crowd_pool';
    this.submissions.set(sub.id, sub);

    // Record in Platform Ledger
    const entry: LedgerEntry = {
      id: generateUUID(),
      submission_id: sub.id,
      board_id: board.id,
      payer_id: payerId,
      host_id: board.host_id,
      entry_fee: split.grossFee,
      host_cut: split.boardLedgerCut, // 70% held in board ledger
      platform_cut: split.scofenCut,   // 30% Scofen margin
      type: 'CROWD_POOL_ENTRY',
      description: `Crowd Pool Entry [$5.00] — 70% ($3.50) held in board ledger, 30% ($1.50) to Scofen treasury`,
      created_at: new Date().toISOString(),
    };
    this.ledger.set(entry.id, entry);

    const owner = this.users.get(sub.owner_id);
    const host = this.users.get(board.host_id);
    const payer = this.users.get(payerId);

    // Event 6: Song enter the board notification
    if (owner) {
      this.dispatchEmail('song_entered', owner.email, {
        artist_name: `${owner.first_name} ${owner.last_name}`,
        host_name: host ? `${host.first_name} ${host.last_name}` : 'Curator',
        track_title: sub.track_title,
        board_title: board.title,
        entry_mode: 'Crowd Pool',
        entry_fee: '5.00',
        board_url: `https://scofen.com/boards/${board.id}`,
      });
    }

    // Event 11: Payment notification
    if (payer) {
      this.dispatchEmail('payment_notification', payer.email, {
        payer_name: `${payer.first_name} ${payer.last_name}`,
        payer_email: payer.email,
        payee_name: host ? `${host.first_name} ${host.last_name}` : 'Board Pool',
        amount: '5.00',
        payment_type: 'Crowd Pool Entry Fee ($5.00)',
        host_cut: '3.50',
        platform_cut: '1.50',
        ledger_id: entry.id,
        timestamp: entry.created_at,
      });
    }

    // Activity feed
    if (owner) {
      this.addActivity({
        actor_id: owner.id,
        actor_name: `${owner.first_name} ${owner.last_name}`,
        actor_role: 'artist',
        action_type: 'enter_board',
        title: `${owner.first_name} entered "${sub.track_title}" into "${board.title}"`,
        description: `Track joined Crowd Pool ($5.00). Open for weighted community evaluations.`,
        track_id: sub.id,
        track_title: sub.track_title,
        board_id: board.id,
        board_title: board.title,
      });
    }

    return {
      submission: this.hydrateSubmission(sub),
      board: this.hydrateBoard(board),
      ledgerEntry: entry,
    };
  }

  /**
   * Curator Skip Option:
   * Musicians pay the full curator entry fee upfront to skip the crowd pool entirely.
   * Curator Pricing Rule: Fee = Curator Influence Points * 0.1.
   */
  public enterCuratorSkip(submissionId: string, payerId: string): {
    submission: Submission;
    board: Board;
    ledgerEntry: LedgerEntry;
  } {
    const sub = this.submissions.get(submissionId);
    if (!sub) throw new Error(`Submission ${submissionId} not found`);
    const board = this.boards.get(sub.board_id);
    if (!board) throw new Error(`Board ${sub.board_id} not found`);
    const host = this.users.get(board.host_id);
    if (!host) throw new Error('Board host not found');

    const curatorFee = calculateCuratorEntryFee(host.influence_points);

    // Update submission
    sub.payment_status = 'confirmed';
    sub.entry_mode = 'curator_skip';
    sub.curator_fee_paid = curatorFee;
    sub.escalation_status = 'escalated_to_curator'; // Directly available to curator!
    this.submissions.set(sub.id, sub);

    const entry: LedgerEntry = {
      id: generateUUID(),
      submission_id: sub.id,
      board_id: board.id,
      payer_id: payerId,
      host_id: board.host_id,
      entry_fee: curatorFee,
      host_cut: curatorFee, // Curator receives direct payment
      platform_cut: 0,
      type: 'CURATOR_SKIP_ENTRY',
      description: `Curator Skip Option — Paid $${curatorFee.toFixed(2)} upfront directly to Curator ${host.first_name} ${host.last_name}`,
      created_at: new Date().toISOString(),
    };
    this.ledger.set(entry.id, entry);

    const owner = this.users.get(sub.owner_id);
    const payer = this.users.get(payerId);

    // Event 6: Song enter the board notification
    if (owner) {
      this.dispatchEmail('song_entered', owner.email, {
        artist_name: `${owner.first_name} ${owner.last_name}`,
        host_name: `${host.first_name} ${host.last_name}`,
        track_title: sub.track_title,
        board_title: board.title,
        entry_mode: 'Curator Skip (Priority Direct)',
        entry_fee: curatorFee.toFixed(2),
        board_url: `https://scofen.com/boards/${board.id}`,
      });
    }

    // Event 11: Payment notification
    if (payer) {
      this.dispatchEmail('payment_notification', payer.email, {
        payer_name: `${payer.first_name} ${payer.last_name}`,
        payer_email: payer.email,
        payee_name: `${host.first_name} ${host.last_name}`,
        amount: curatorFee.toFixed(2),
        payment_type: `Curator Skip Direct Fee ($${curatorFee.toFixed(2)})`,
        host_cut: curatorFee.toFixed(2),
        platform_cut: '0.00',
        ledger_id: entry.id,
        timestamp: entry.created_at,
      });
    }

    // Activity feed
    if (owner) {
      this.addActivity({
        actor_id: owner.id,
        actor_name: `${owner.first_name} ${owner.last_name}`,
        actor_role: 'artist',
        action_type: 'enter_board',
        title: `${owner.first_name} skipped directly to curator on "${board.title}"`,
        description: `Paid $${curatorFee.toFixed(2)} direct fee to ${host.first_name} for priority evaluation.`,
        track_id: sub.id,
        track_title: sub.track_title,
        board_id: board.id,
        board_title: board.title,
      });
    }

    return {
      submission: this.hydrateSubmission(sub),
      board: this.hydrateBoard(board),
      ledgerEntry: entry,
    };
  }

  // ==========================================
  // 3. CUSTOM EVALUATION MATRIX & SCORING STRUCTURE
  // ==========================================

  /**
   * Crowd Rating: Both crowd and curator use the unified custom weight matrix.
   */
  public rateSongAsCrowd(
    submissionId: string,
    voterId: string,
    dimensionScores: Record<string, number>
  ): { vote: CrowdRatingVote; crowdRating: number } {
    const sub = this.submissions.get(submissionId);
    if (!sub) throw new Error(`Submission ${submissionId} not found`);

    // RATING LOCK INVARIANT: Once curator finishes rating, permanently locked
    if (sub.is_locked) {
      throw new Error('Rating Lock Enforced: Once the curator finishes rating a song, it is permanently locked and can no longer be rated.');
    }

    const voter = this.users.get(voterId);
    if (!voter) throw new Error(`Voter ${voterId} not found`);

    const board = this.boards.get(sub.board_id);
    if (board && board.host_id === voterId) {
      throw new Error('Curator Isolation: Board hosts cannot rate as a crowd rater on their own board.');
    }

    const criteria = this.getBoardCriteria(sub.board_id);
    const compositeScore = calculateUnifiedWeightedScore(dimensionScores, criteria);

    const vote: CrowdRatingVote = {
      id: generateUUID(),
      submission_id: sub.id,
      board_id: sub.board_id,
      voter_id: voter.id,
      voter_name: `${voter.first_name} ${voter.last_name}`,
      voter_influence: voter.influence_points,
      dimension_scores: dimensionScores,
      composite_score: compositeScore,
      timestamp: new Date().toISOString(),
    };

    const existingVotes = this.crowdVotes.get(sub.id) || [];
    // Replace vote if same voter already voted
    const filtered = existingVotes.filter((v) => v.voter_id !== voterId);
    filtered.push(vote);
    this.crowdVotes.set(sub.id, filtered);

    // Compute updated influence-weighted crowd rating average
    const totalWeight = filtered.reduce((sum, v) => sum + Math.max(1, v.voter_influence), 0);
    const weightedSum = filtered.reduce(
      (sum, v) => sum + v.composite_score * Math.max(1, v.voter_influence),
      0
    );
    const avgScore = totalWeight > 0 ? Number((weightedSum / totalWeight).toFixed(2)) : 0;
    sub.crowd_rating = avgScore;
    sub.final_score = avgScore; // Active crowd baseline
    this.submissions.set(sub.id, sub);

    const owner = this.users.get(sub.owner_id);

    // Event 7: Song got a crowd rating notification
    if (owner) {
      this.dispatchEmail('song_crowd_rated', owner.email, {
        artist_name: `${owner.first_name} ${owner.last_name}`,
        track_title: sub.track_title,
        board_title: board ? board.title : 'Battlefield',
        rater_name: `${voter.first_name} ${voter.last_name}`,
        score: vote.composite_score.toFixed(1),
        crowd_average: avgScore.toFixed(1),
        total_ratings: filtered.length,
        track_url: `https://scofen.com/tracks/${sub.id}`,
      });
    }

    // Activity feed
    this.addActivity({
      actor_id: voter.id,
      actor_name: `${voter.first_name} ${voter.last_name}`,
      actor_role: 'listener',
      action_type: 'rate_track',
      title: `${voter.first_name} evaluated "${sub.track_title}"`,
      description: `Scored ${vote.composite_score.toFixed(1)} PTS on "${board ? board.title : 'Board'}". Weighted by ${voter.influence_points} influence pts.`,
      track_id: sub.id,
      track_title: sub.track_title,
      board_id: sub.board_id,
      board_title: board ? board.title : undefined,
    });

    return { vote, crowdRating: avgScore };
  }

  /**
   * Curator Rating:
   * Unified scorecard with custom criteria.
   * Final Combined Score: Strict 50:50 weight split between Curator and Crowd.
   * Rating Lock: Permanently locked once submitted.
   * Section 6: Applies consensus rewards (+1) and extreme penalties (-1) to crowd raters.
   * Curator Isolation Invariant: Curator is completely isolated from rewards and penalties!
   */
  public rateSongAsCurator(
    submissionId: string,
    curatorId: string,
    dimensionScores: Record<string, number>
  ): {
    submission: Submission;
    finalCombinedScore: number;
    formula: string;
    pointEvents: InfluencePointEvent[];
  } {
    const sub = this.submissions.get(submissionId);
    if (!sub) throw new Error(`Submission ${submissionId} not found`);
    const board = this.boards.get(sub.board_id);
    if (!board) throw new Error(`Board ${sub.board_id} not found`);

    // Verify curator authority
    if (board.host_id !== curatorId) {
      throw new Error('Unauthorized: Only the host curator of this board can submit curator evaluations.');
    }

    // Rating Lock Invariant
    if (sub.is_locked) {
      throw new Error('Rating Lock: This track has already been evaluated by the curator and is permanently locked.');
    }

    const criteria = this.getBoardCriteria(board.id);
    const curatorScore = calculateUnifiedWeightedScore(dimensionScores, criteria);

    // Save individual raw criteria scores
    criteria.forEach((c) => {
      const raw = dimensionScores[c.id] ?? 80;
      this.setRawScoreInternal(sub.id, c.id, raw);
    });

    sub.curator_rating = curatorScore;

    // Strict 50:50 Split Calculation
    const { finalCombinedScore, formula } = computeFinalCombinedScore(curatorScore, sub.crowd_rating);
    sub.final_score = finalCombinedScore;
    sub.is_locked = true; // Permanently locked!
    sub.escalation_status = 'curator_rated';
    this.submissions.set(sub.id, sub);

    // SECTION 6: INFLUENCE POINT DYNAMICS & CURATOR ISOLATION
    // Influence point gain/loss is based on raw ratings without criteria weights or influence weights
    const pointEvents: InfluencePointEvent[] = [];
    const votes = this.crowdVotes.get(sub.id) || [];
    const getRawMean = (scores: Record<string, number> | undefined, fallback: number): number => {
      const vals = Object.values(scores || {});
      return vals.length > 0
        ? Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2))
        : fallback;
    };
    const curatorRawMean = getRawMean(dimensionScores, curatorScore);
    const crowdRawMean =
      votes.length > 0
        ? Number(
            (
              votes.reduce((sum, v) => sum + getRawMean(v.dimension_scores, v.composite_score), 0) /
              votes.length
            ).toFixed(2)
          )
        : null;
    const { finalCombinedScore: rawCombinedBaseline } = computeFinalCombinedScore(
      curatorRawMean,
      crowdRawMean
    );

    for (const v of votes) {
      const voterRawMean = getRawMean(v.dimension_scores, v.composite_score);
      const evalResult = evaluateVoterInfluenceDelta(voterRawMean, rawCombinedBaseline);
      if (evalResult.delta !== 0) {
        this.adjustUserInfluence(v.voter_id, evalResult.delta, evalResult.reason, sub.id);
        pointEvents.push({
          user_id: v.voter_id,
          user_name: v.voter_name,
          submission_id: sub.id,
          point_delta: evalResult.delta,
          type: evalResult.delta > 0 ? 'CONSENSUS_REWARD' : 'EXTREME_PENALTY',
          reason: evalResult.reason,
          timestamp: new Date().toISOString(),
        });
      }
    }

    const owner = this.users.get(sub.owner_id);
    const host = this.users.get(curatorId);

    // Event 8: Song rated by host curator email
    if (owner) {
      this.dispatchEmail('song_curator_rated', owner.email, {
        artist_name: `${owner.first_name} ${owner.last_name}`,
        host_name: host ? `${host.first_name} ${host.last_name}` : 'Curator',
        track_title: sub.track_title,
        board_title: board.title,
        curator_score: curatorScore.toFixed(1),
        crowd_score: (sub.crowd_rating ?? 0).toFixed(1),
        final_combined_score: finalCombinedScore.toFixed(1),
        track_url: `https://scofen.com/tracks/${sub.id}`,
      });
    }

    // Activity feed
    this.addActivity({
      actor_id: curatorId,
      actor_name: host ? `${host.first_name} ${host.last_name}` : 'Curator',
      actor_role: 'curator',
      action_type: 'curate_track',
      title: `${host ? host.first_name : 'Curator'} finalized scorecard for "${sub.track_title}"`,
      description: `Official 50:50 score locked at ${finalCombinedScore.toFixed(1)} PTS (Curator: ${curatorScore.toFixed(1)}, Crowd: ${(sub.crowd_rating ?? 0).toFixed(1)}).`,
      track_id: sub.id,
      track_title: sub.track_title,
      board_id: board.id,
      board_title: board.title,
    });

    return {
      submission: this.hydrateSubmission(sub),
      finalCombinedScore,
      formula,
      pointEvents,
    };
  }

  // ==========================================
  // 4. CROWD ESCALATION LOOPS
  // ==========================================

  /**
   * Evaluates if conditions are met to push the top crowd song to the curator:
   * 1. Board ledger balance >= Curator entry fee (Host Influence * 0.1)
   * 2. Song rated by users whose combined influence points >= 100
   */
  public getBoardEscalationStatus(boardId: string): {
    board: Board;
    curatorFee: number;
    ledgerBalance: number;
    eligibleTracks: Array<{
      submission: Submission;
      combinedVoterInfluence: number;
      isTriggered: boolean;
      fundsMet: boolean;
      influenceMet: boolean;
      influenceShortfall: number;
      fundsShortfall: number;
    }>;
  } {
    const board = this.boards.get(boardId);
    if (!board) throw new Error(`Board ${boardId} not found`);
    const host = this.users.get(board.host_id);
    const curatorFee = calculateCuratorEntryFee(host ? host.influence_points : 100);

    const poolTracks = Array.from(this.submissions.values()).filter(
      (s) => s.board_id === boardId && s.escalation_status === 'crowd_pool'
    );

    const eligibleTracks = poolTracks.map((sub) => {
      const votes = this.crowdVotes.get(sub.id) || [];
      const combinedInfluence = votes.reduce((sum, v) => sum + (v.voter_influence || 0), 0);
      const evalTrigger = evaluateCrowdEscalationTrigger(board.ledger_balance, curatorFee, combinedInfluence);

      return {
        submission: this.hydrateSubmission(sub),
        combinedVoterInfluence: combinedInfluence,
        isTriggered: evalTrigger.isTriggered,
        fundsMet: evalTrigger.fundsMet,
        influenceMet: evalTrigger.influenceMet,
        influenceShortfall: evalTrigger.influenceShortfall,
        fundsShortfall: evalTrigger.fundsShortfall,
      };
    });

    // Sort by highest crowd rating first
    eligibleTracks.sort((a, b) => (b.submission.crowd_rating || 0) - (a.submission.crowd_rating || 0));

    return {
      board: this.hydrateBoard(board),
      curatorFee,
      ledgerBalance: board.ledger_balance,
      eligibleTracks,
    };
  }

  /**
   * Execute Escalation:
   * Once triggered, the top-rated song is pushed to the curator with its entry fee
   * paid entirely by the board ledger.
   * Locks the voter snapshot at the exact moment of escalation!
   */
  public executeCrowdEscalation(boardId: string): {
    escalatedSubmission: Submission;
    curatorFeePaid: number;
    newBoardLedgerBalance: number;
    voterSnapshot: VoterSnapshotEntry[];
  } {
    const status = this.getBoardEscalationStatus(boardId);
    const readyTrack = status.eligibleTracks.find((t) => t.isTriggered);

    if (!readyTrack) {
      throw new Error(
        'Escalation Conditions Unmet: Requires both (1) board ledger funds to cover curator fee, and (2) combined voter influence points >= 100.'
      );
    }

    const sub = this.submissions.get(readyTrack.submission.id);
    const board = this.boards.get(boardId);
    if (!sub || !board) throw new Error('Track or Board missing');

    const curatorFee = status.curatorFee;

    // Deduct curator entry fee entirely from board ledger
    board.ledger_balance = Number((board.ledger_balance - curatorFee).toFixed(2));
    this.boards.set(board.id, board);

    // Lock the voter snapshot at this exact escalation moment
    const votes = this.crowdVotes.get(sub.id) || [];
    const snapshot: VoterSnapshotEntry[] = votes.map((v) => ({
      voter_id: v.voter_id,
      voter_name: v.voter_name,
      voter_score: v.composite_score,
      voter_influence: v.voter_influence,
      is_accurate: true, // evaluated upon curator final score
      timestamp: new Date().toISOString(),
    }));

    sub.curator_fee_paid = curatorFee;
    sub.escalation_status = 'escalated_to_curator';
    sub.escalation_voter_snapshot = snapshot;
    this.submissions.set(sub.id, sub);

    // Record ledger transaction
    const entry: LedgerEntry = {
      id: generateUUID(),
      submission_id: sub.id,
      board_id: board.id,
      payer_id: board.id, // Paid by board ledger
      host_id: board.host_id,
      entry_fee: curatorFee,
      host_cut: curatorFee, // Curator paid
      platform_cut: 0,
      type: 'ESCALATION_PAYOUT',
      description: `Crowd Escalation Loop Execution — $${curatorFee.toFixed(2)} paid to Curator from Board Ledger for top track "${sub.track_title}"`,
      created_at: new Date().toISOString(),
    };
    this.ledger.set(entry.id, entry);

    return {
      escalatedSubmission: this.hydrateSubmission(sub),
      curatorFeePaid: curatorFee,
      newBoardLedgerBalance: board.ledger_balance,
      voterSnapshot: snapshot,
    };
  }

  // ==========================================
  // 5. STREAMING DISTRIBUTION & ROYALTY SPLITS
  // ==========================================

  /**
   * Curator Submission Pipeline:
   * A curator may officially submit a high-performing track from their board to Scofen for streaming approval.
   */
  public submitTrackToScofenPipeline(submissionId: string, curatorId: string): Submission {
    const sub = this.submissions.get(submissionId);
    if (!sub) throw new Error(`Submission ${submissionId} not found`);
    const board = this.boards.get(sub.board_id);
    if (!board) throw new Error(`Board ${sub.board_id} not found`);

    if (board.host_id !== curatorId) {
      throw new Error('Only the board curator has authority to submit a track to Scofen for streaming consideration.');
    }

    if (!sub.is_locked || sub.final_score < 70) {
      throw new Error('Only completed and evaluated tracks with sufficient score threshold can be submitted to Scofen.');
    }

    sub.streaming_status = 'pending_scofen_approval';
    sub.escalation_status = 'submitted_to_scofen';
    this.submissions.set(sub.id, sub);

    const owner = this.users.get(sub.owner_id);
    const host = this.users.get(curatorId);

    // Event 10: Song submitted to Scofen streaming for monetization
    if (owner) {
      this.dispatchEmail('streaming_submitted', owner.email, {
        artist_name: `${owner.first_name} ${owner.last_name}`,
        host_name: host ? `${host.first_name} ${host.last_name}` : 'Curator',
        track_title: sub.track_title,
        board_title: board.title,
        royalty_split: sub.entry_mode === 'curator_skip' ? '80% Artist / 10% Curator / 10% Scofen' : '70% Artist / 10% Curator / 10% Crowd / 10% Scofen',
        stream_url: `https://scofen.com/tracks/${sub.id}`,
      });
    }

    this.addActivity({
      actor_id: curatorId,
      actor_name: host ? `${host.first_name} ${host.last_name}` : 'Curator',
      actor_role: 'curator',
      action_type: 'curate_track',
      title: `${host ? host.first_name : 'Curator'} advanced "${sub.track_title}" to Scofen Streaming Monetization`,
      description: `Track evaluated at ${sub.final_score.toFixed(1)} PTS on "${board.title}". Dispatched for dual-stream monetization.`,
      track_id: sub.id,
      track_title: sub.track_title,
      board_id: board.id,
      board_title: board.title,
    });

    return this.hydrateSubmission(sub);
  }

  /**
   * Streaming Sector Catalog Elevation (Scofen Exclusive Handpicking):
   * Consumer streaming distribution is handled externally on the consumer site.
   * On this Producer Platform, playback is completely unrestricted.
   * Attaches precise Royalty Split Matrix based on entry mode (70/10/10/10 vs 80/10/10).
   */
  public approveStreamingSector(submissionId: string): {
    submission: Submission;
    royaltySplit: RoyaltySplitMatrix;
  } {
    const sub = this.submissions.get(submissionId);
    if (!sub) throw new Error(`Submission ${submissionId} not found`);

    const split = getRoyaltySplitMatrix(sub.entry_mode);

    sub.streaming_status = 'streaming_sector';
    sub.escalation_status = 'streaming_approved';
    sub.royalty_split = split;
    this.submissions.set(sub.id, sub);

    return {
      submission: this.hydrateSubmission(sub),
      royaltySplit: split,
    };
  }

  public getStreamingSectorTracks(): Submission[] {
    return Array.from(this.submissions.values())
      .filter((s) => s.streaming_status === 'streaming_sector')
      .map((s) => this.hydrateSubmission(s));
  }

  public evaluateStreamingAccess(submissionId: string, requesterId: string | null): StreamingAccessResult {
    const sub = this.submissions.get(submissionId);
    if (!sub) throw new Error(`Submission ${submissionId} not found`);

    const board = this.boards.get(sub.board_id);
    const requester = requesterId ? this.users.get(requesterId) : null;

    // Producer platform has full unrestricted master playback for all submissions
    return {
      submission_id: sub.id,
      track_title: sub.track_title,
      stream_type: 'FULL_TRACK',
      url: sub.audio_url || sub.preview_url,
      is_authorized_full: true,
      authorization_reason: 'TRACK_OWNER',
      preview_limit_seconds: null,
    };
  }

  // ==========================================
  // HELPERS & RELATIONAL QUERIES
  // ==========================================

  public createSubmission(
    boardId: string,
    ownerId: string,
    trackTitle: string,
    entryMode: 'crowd_pool' | 'curator_skip' = 'crowd_pool',
    audioPreset: string = 'cyber_bass',
    lyrics?: string,
    genre?: string,
    aboutTrack?: string,
    audioUrl?: string,
    durationSeconds?: number
  ): Submission {
    const board = this.boards.get(boardId);
    if (!board) throw new Error(`Board ${boardId} not found`);
    const owner = this.users.get(ownerId);
    if (!owner) throw new Error(`Owner ${ownerId} not found`);

    const subId = generateUUID();
    const songId = generateUUID();
    const resolvedAudio = audioUrl || `/audio/${audioPreset}.wav`;
    const newSub: Submission = {
      id: subId,
      song_id: songId,
      board_id: boardId,
      owner_id: ownerId,
      track_title: trackTitle.trim(),
      lyrics: lyrics ? lyrics.trim() : undefined,
      about_track: aboutTrack ? aboutTrack.trim() : undefined,
      audio_url: resolvedAudio,
      preview_url: resolvedAudio,
      entry_mode: entryMode,
      curator_fee_paid: 0,
      payment_status: 'pending',
      crowd_rating: null,
      curator_rating: null,
      final_score: 0.0,
      is_locked: false,
      escalation_status: entryMode === 'curator_skip' ? 'escalated_to_curator' : 'crowd_pool',
      streaming_status: 'none',
      bpm: 124,
      genre: genre || board.genre,
      cover_gradient: board.cover_gradient,
      audio_preset: audioPreset,
      duration_seconds: durationSeconds || 180,
      created_at: new Date().toISOString(),
    };

    this.submissions.set(subId, newSub);
    return this.hydrateSubmission(newSub);
  }

  /**
   * Upload song directly to Studio:
   * Requires no board, nor does it require payment.
   * Users can upload as many as they want.
   * Once uploaded they are available for boards.
   */
  public createStudioTrack(
    ownerId: string,
    trackTitle: string,
    genre: string = 'Electronic / Synthwave',
    audioPreset: string = 'cyber_bass',
    lyrics?: string,
    bpm: number = 124,
    aboutTrack?: string,
    audioUrl?: string,
    durationSeconds?: number
  ): Submission {
    const owner = this.users.get(ownerId);
    if (!owner) throw new Error(`Owner ${ownerId} not found`);

    const subId = generateUUID();
    const songId = generateUUID();
    const resolvedAudio = audioUrl || `/audio/${audioPreset}.wav`;
    const newSub: Submission = {
      id: subId,
      song_id: songId,
      board_id: '', // No board required!
      owner_id: ownerId,
      track_title: trackTitle.trim(),
      lyrics: lyrics ? lyrics.trim() : undefined,
      about_track: aboutTrack ? aboutTrack.trim() : undefined,
      audio_url: resolvedAudio,
      preview_url: resolvedAudio,
      entry_mode: 'crowd_pool',
      curator_fee_paid: 0,
      payment_status: 'confirmed', // Free studio track
      crowd_rating: null,
      curator_rating: null,
      final_score: 0.0,
      is_locked: false,
      escalation_status: 'crowd_pool',
      streaming_status: 'none',
      bpm,
      genre: genre ? genre.trim() : 'Electronic / Synthwave',
      cover_gradient: 'from-emerald-700 via-teal-900 to-zinc-950',
      audio_preset: audioPreset,
      duration_seconds: durationSeconds || 180,
      created_at: new Date().toISOString(),
    };

    this.submissions.set(subId, newSub);
    return this.hydrateSubmission(newSub);
  }

  public getSongProfile(identifier: string): SongProfile {
    let baseSub: Submission | undefined = this.submissions.get(identifier);
    if (!baseSub) {
      baseSub = Array.from(this.submissions.values()).find(
        (s) => s.song_id === identifier || s.id === identifier
      );
    }
    if (!baseSub) {
      throw new Error(`Song or submission "${identifier}" not found`);
    }

    const canonicalSongId = baseSub.song_id || baseSub.id;
    const matchingSubs = Array.from(this.submissions.values()).filter(
      (s) => (s.song_id && s.song_id === canonicalSongId) || s.id === canonicalSongId
    );

    const owner = this.users.get(baseSub.owner_id);
    const ownerName = owner ? `${owner.first_name} ${owner.last_name}` : 'Unknown Artist';

    const entries: SongBoardEntry[] = matchingSubs
      .filter((s) => s.board_id && s.board_id.trim() !== '')
      .map((s) => {
      const board = this.boards.get(s.board_id);
      const host = board ? this.users.get(board.host_id) : undefined;
      return {
        submission_id: s.id,
        board_id: s.board_id,
        board_title: board ? board.title : 'Unknown Board',
        curator_name: host ? `${host.first_name} ${host.last_name}` : 'Curator',
        curator_id: host ? host.id : undefined,
        entry_mode: s.entry_mode,
        curator_fee_paid: s.curator_fee_paid,
        payment_status: s.payment_status,
        crowd_rating: s.crowd_rating,
        curator_rating: s.curator_rating,
        final_score: s.final_score,
        is_locked: s.is_locked,
        escalation_status: s.escalation_status,
        streaming_status: s.streaming_status,
        about_track: s.about_track,
        created_at: s.created_at,
      };
    });

    return {
      song_id: canonicalSongId,
      track_title: baseSub.track_title,
      owner_id: baseSub.owner_id,
      owner_name: ownerName,
      genre: baseSub.genre || 'Electronic',
      bpm: baseSub.bpm || 120,
      duration_seconds: baseSub.duration_seconds || 180,
      audio_url: baseSub.audio_url,
      preview_url: baseSub.preview_url,
      cover_gradient: baseSub.cover_gradient || 'from-emerald-500 to-cyan-900',
      lyrics: baseSub.lyrics || '',
      about_track: baseSub.about_track || '',
      created_at: baseSub.created_at,
      entries,
    };
  }

  public updateSong(
    identifier: string,
    updates: { track_title?: string; genre?: string; lyrics?: string; about_track?: string }
  ): SongProfile {
    let baseSub: Submission | undefined = this.submissions.get(identifier);
    if (!baseSub) {
      baseSub = Array.from(this.submissions.values()).find(
        (s) => s.song_id === identifier || s.id === identifier
      );
    }
    if (!baseSub) {
      throw new Error(`Song "${identifier}" not found`);
    }

    const canonicalSongId = baseSub.song_id || baseSub.id;
    const matchingSubs = Array.from(this.submissions.values()).filter(
      (s) => (s.song_id && s.song_id === canonicalSongId) || s.id === canonicalSongId
    );

    matchingSubs.forEach((s) => {
      if (updates.track_title !== undefined && updates.track_title.trim() !== '') {
        s.track_title = updates.track_title.trim();
      }
      if (updates.genre !== undefined && updates.genre.trim() !== '') {
        s.genre = updates.genre.trim();
      }
      if (updates.lyrics !== undefined) {
        s.lyrics = updates.lyrics;
      }
      if (updates.about_track !== undefined) {
        s.about_track = updates.about_track;
      }
      this.submissions.set(s.id, s);
    });

    return this.getSongProfile(canonicalSongId);
  }

  public enterSongIntoAnotherBoard(
    identifier: string,
    targetBoardId: string,
    entryMode: 'crowd_pool' | 'curator_skip' = 'crowd_pool'
  ): { submission: Submission; songProfile: SongProfile } {
    let baseSub: Submission | undefined = this.submissions.get(identifier);
    if (!baseSub) {
      baseSub = Array.from(this.submissions.values()).find(
        (s) => s.song_id === identifier || s.id === identifier
      );
    }
    if (!baseSub) {
      throw new Error(`Song "${identifier}" not found`);
    }

    const targetBoard = this.boards.get(targetBoardId);
    if (!targetBoard) throw new Error(`Target board "${targetBoardId}" not found`);

    const canonicalSongId = baseSub.song_id || baseSub.id;

    // Check if song has already entered this board
    const alreadyEntered = Array.from(this.submissions.values()).some(
      (s) =>
        s.board_id === targetBoardId &&
        ((s.song_id && s.song_id === canonicalSongId) || s.id === canonicalSongId)
    );
    if (alreadyEntered) {
      throw new Error(`This song has already entered board "${targetBoard.title}". Songs can only battle once per board.`);
    }

    const host = this.users.get(targetBoard.host_id);
    const curatorFee = host ? calculateCuratorEntryFee(host.influence_points) : 10;

    const newSubId = generateUUID();
    const newSub: Submission = {
      id: newSubId,
      song_id: canonicalSongId,
      board_id: targetBoardId,
      owner_id: baseSub.owner_id,
      track_title: baseSub.track_title,
      lyrics: baseSub.lyrics || '',
      about_track: baseSub.about_track || undefined,
      audio_url: baseSub.audio_url,
      preview_url: baseSub.preview_url,
      entry_mode: entryMode,
      curator_fee_paid: entryMode === 'curator_skip' ? curatorFee : 0,
      payment_status: 'confirmed',
      crowd_rating: null,
      curator_rating: null,
      final_score: 0.0,
      is_locked: false,
      escalation_status: entryMode === 'curator_skip' ? 'escalated_to_curator' : 'crowd_pool',
      streaming_status: 'none',
      bpm: baseSub.bpm || 120,
      genre: baseSub.genre || targetBoard.genre,
      cover_gradient: targetBoard.cover_gradient || baseSub.cover_gradient,
      audio_preset: baseSub.audio_preset || 'cyber_bass',
      duration_seconds: baseSub.duration_seconds || 180,
      created_at: new Date().toISOString(),
    };

    if (entryMode === 'crowd_pool') {
      const split = splitCrowdPoolFee(5.0);
      targetBoard.ledger_balance = Number((targetBoard.ledger_balance + split.boardLedgerCut).toFixed(2));
      this.boards.set(targetBoard.id, targetBoard);

      const entry: LedgerEntry = {
        id: generateUUID(),
        submission_id: newSub.id,
        board_id: targetBoard.id,
        payer_id: baseSub.owner_id,
        host_id: targetBoard.host_id,
        entry_fee: split.grossFee,
        host_cut: split.boardLedgerCut,
        platform_cut: split.scofenCut,
        type: 'CROWD_POOL_ENTRY',
        description: `Crowd Pool Entry [$5.00] for "${baseSub.track_title}" in board "${targetBoard.title}"`,
        created_at: new Date().toISOString(),
      };
      this.ledger.set(entry.id, entry);
    } else {
      const entry: LedgerEntry = {
        id: generateUUID(),
        submission_id: newSub.id,
        board_id: targetBoard.id,
        payer_id: baseSub.owner_id,
        host_id: targetBoard.host_id,
        entry_fee: curatorFee,
        host_cut: curatorFee,
        platform_cut: 0,
        type: 'CURATOR_SKIP_ENTRY',
        description: `Curator Skip Entry [$${curatorFee.toFixed(2)}] for "${baseSub.track_title}" in board "${targetBoard.title}"`,
        created_at: new Date().toISOString(),
      };
      this.ledger.set(entry.id, entry);
    }

    // If baseSub had no board yet (pure studio track), clean up placeholder
    if (!baseSub.board_id || baseSub.board_id.trim() === '') {
      this.submissions.delete(baseSub.id);
    }

    this.submissions.set(newSub.id, newSub);

    return {
      submission: this.hydrateSubmission(newSub),
      songProfile: this.getSongProfile(canonicalSongId),
    };
  }

  public getAllUsersAdminData() {
    return Array.from(this.users.values()).map((u) => {
      const hostedBoards = Array.from(this.boards.values()).filter((b) => b.host_id === u.id);
      const userSubmissions = Array.from(this.submissions.values()).filter((s) => s.owner_id === u.id);
      
      let totalEarned = 0;
      this.ledger.forEach((entry) => {
        if (entry.host_id === u.id && (entry.type === 'CURATOR_SKIP_ENTRY' || entry.type === 'ESCALATION_PAYOUT')) {
          totalEarned += entry.host_cut;
        }
      });

      return {
        ...u,
        hostedBoardsCount: hostedBoards.length,
        submissionsCount: userSubmissions.length,
        totalEarned: Number(totalEarned.toFixed(2)),
      };
    });
  }

  public getCrowdVotes(submissionId: string): CrowdRatingVote[] {
    return this.crowdVotes.get(submissionId) || [];
  }

  public getBoardSubmissions(boardId: string): Submission[] {
    return Array.from(this.submissions.values())
      .filter((s) => s.board_id === boardId)
      .map((s) => this.hydrateSubmission(s))
      .sort((a, b) => b.final_score - a.final_score);
  }

  public getDiscoveryFeed(filters: {
    sort?: 'newest' | 'score' | 'range';
    minScore?: number;
    maxScore?: number;
    followedOnly?: boolean;
    currentUserId?: string;
  }): Submission[] {
    let list = Array.from(this.submissions.values());

    if (filters.followedOnly && filters.currentUserId) {
      list = list.filter((s) => {
        const board = this.boards.get(s.board_id);
        const isFollowedOwner = this.isFollowing(filters.currentUserId!, s.owner_id);
        const isFollowedHost = board ? this.isFollowing(filters.currentUserId!, board.host_id) : false;
        return isFollowedOwner || isFollowedHost;
      });
    }

    if (filters.minScore !== undefined || filters.maxScore !== undefined) {
      const min = filters.minScore || 0;
      const max = filters.maxScore || 100;
      list = list.filter((s) => s.final_score >= min && s.final_score <= max);
    }

    if (filters.sort === 'newest') {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else {
      list.sort((a, b) => b.final_score - a.final_score);
    }

    return list.map((s) => this.hydrateSubmission(s));
  }

  public getLedger(): LedgerEntry[] {
    return Array.from(this.ledger.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  public getUserProfileData(userId: string): UserProfileData {
    const user = this.users.get(userId);
    if (!user) throw new Error(`User ${userId} not found`);

    const hostedBoards = Array.from(this.boards.values())
      .filter((b) => b.host_id === userId)
      .map((b) => this.hydrateBoard(b));

    const submittedTracks = Array.from(this.submissions.values())
      .filter((s) => s.owner_id === userId)
      .map((s) => this.hydrateSubmission(s))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const followers: User[] = [];
    const following: User[] = [];
    this.follows.forEach((pair) => {
      const [followerId, followingId] = pair.split(':');
      if (followingId === userId) {
        const u = this.users.get(followerId);
        if (u) followers.push(u);
      }
      if (followerId === userId) {
        const u = this.users.get(followingId);
        if (u) following.push(u);
      }
    });

    const userEvents = this.getInfluenceEvents(userId);
    const ratedTracks: RatedTrackReportItem[] = [];
    const seenSubIds = new Set<string>();

    // 1. Crowd votes by this user
    this.crowdVotes.forEach((votes, subId) => {
      const userVote = votes.find((v) => v.voter_id === userId);
      if (userVote) {
        const sub = this.submissions.get(subId);
        if (sub) {
          seenSubIds.add(sub.id);
          const board = this.boards.get(sub.board_id);
          const owner = this.users.get(sub.owner_id);
          const matchingEvent = userEvents.find((ev) => ev.submission_id === sub.id);
          const isFinalized = Boolean(sub.is_locked);
          ratedTracks.push({
            submission_id: sub.id,
            track_title: sub.track_title,
            artist_name: owner ? `${owner.first_name} ${owner.last_name}` : 'Artist',
            artist_id: sub.owner_id,
            board_id: sub.board_id,
            board_title: board ? board.title : 'Board',
            user_score: userVote.composite_score,
            crowd_rating: sub.crowd_rating ?? 0,
            curator_rating: sub.curator_rating ?? null,
            final_score: sub.final_score,
            is_locked: isFinalized,
            status: isFinalized ? 'Finalized' : 'Pending Finalization',
            influence_delta: isFinalized ? (matchingEvent ? matchingEvent.point_delta : 0) : null,
            influence_reason: isFinalized
              ? (matchingEvent
                  ? matchingEvent.reason
                  : `Neutral (0 pts): Rating of ${userVote.composite_score.toFixed(1)} was within normal range of final score ${sub.final_score.toFixed(1)}.`)
              : null,
            rated_at: userVote.timestamp,
            evaluation_role: 'crowd_voter',
            audio_url: sub.audio_url,
            audio_preset: sub.audio_preset,
            genre: sub.genre,
            dimension_scores: userVote.dimension_scores,
          });
        }
      }
    });

    // 2. Curator Official Evaluations (if this user is board host and rated tracks)
    this.submissions.forEach((sub) => {
      if (sub.curator_rating !== null && !seenSubIds.has(sub.id)) {
        const board = this.boards.get(sub.board_id);
        if (board && board.host_id === userId) {
          const owner = this.users.get(sub.owner_id);
          ratedTracks.push({
            submission_id: sub.id,
            track_title: sub.track_title,
            artist_name: owner ? `${owner.first_name} ${owner.last_name}` : 'Artist',
            artist_id: sub.owner_id,
            board_id: sub.board_id,
            board_title: board.title,
            user_score: sub.curator_rating,
            crowd_rating: sub.crowd_rating ?? 0,
            curator_rating: sub.curator_rating,
            final_score: sub.final_score,
            is_locked: Boolean(sub.is_locked),
            status: 'Finalized',
            influence_delta: null,
            influence_reason: 'Official Curator Scorecard Finalized',
            rated_at: sub.created_at,
            evaluation_role: 'curator',
            audio_url: sub.audio_url,
            audio_preset: sub.audio_preset,
            genre: sub.genre,
          });
        }
      }
    });

    ratedTracks.sort((a, b) => new Date(b.rated_at).getTime() - new Date(a.rated_at).getTime());

    return {
      user,
      hostedBoards,
      submittedTracks,
      followersCount: followers.length,
      followingCount: following.length,
      followers,
      following,
      influenceEvents: userEvents,
      ratedTracks,
    };
  }

  public updateUserProfile(
    userId: string,
    data: { first_name?: string; last_name?: string; bio?: string }
  ): User {
    const user = this.users.get(userId);
    if (!user) throw new Error(`User ${userId} not found`);

    if (data.first_name !== undefined && data.first_name.trim()) user.first_name = data.first_name.trim();
    if (data.last_name !== undefined && data.last_name.trim()) user.last_name = data.last_name.trim();
    if (data.bio !== undefined) user.bio = data.bio.trim() || null;

    this.users.set(user.id, user);
    return user;
  }

  public toggleFollow(followerId: string, followingId: string): boolean {
    if (followerId === followingId) throw new Error('Cannot follow yourself');
    const pair = `${followerId}:${followingId}`;
    if (this.follows.has(pair)) {
      this.follows.delete(pair);
      return false;
    } else {
      this.follows.add(pair);

      const follower = this.users.get(followerId);
      const followed = this.users.get(followingId);

      // Event 12: Someone follow you notification
      if (follower && followed) {
        this.dispatchEmail('someone_follow_you', followed.email, {
          followed_name: `${followed.first_name} ${followed.last_name}`,
          follower_name: `${follower.first_name} ${follower.last_name}`,
          follower_role: follower.role ? follower.role.toUpperCase() : 'CREATOR',
          follower_influence: follower.influence_points,
          follower_profile_url: `https://scofen.com/users/${follower.id}`,
        });

        this.addActivity({
          actor_id: follower.id,
          actor_name: `${follower.first_name} ${follower.last_name}`,
          actor_role: follower.role || 'artist',
          action_type: 'follow_user',
          title: `${follower.first_name} started following ${followed.first_name} ${followed.last_name}`,
          description: `Subscribed to live curation updates, battlefield launches, and track evaluations.`,
          target_id: followed.id,
          target_title: `${followed.first_name} ${followed.last_name}`,
        });
      }

      return true;
    }
  }

  public isFollowing(followerId: string, followingId: string): boolean {
    return this.follows.has(`${followerId}:${followingId}`);
  }

  private addFollow(followerId: string, followingId: string) {
    this.follows.add(`${followerId}:${followingId}`);
  }

  private setRawScoreInternal(submissionId: string, criterionId: string, rawScore: number) {
    const key = `${submissionId}:${criterionId}`;
    this.submissionScores.set(key, {
      id: generateUUID(),
      submission_id: submissionId,
      criterion_id: criterionId,
      raw_score: rawScore,
    });
  }

  private hydrateBoard(b: Board): Board {
    const host = this.users.get(b.host_id);
    const criteria = this.getBoardCriteria(b.id);
    const submissions_count = Array.from(this.submissions.values()).filter((s) => s.board_id === b.id).length;
    const dynamicEntryFee = calculateCuratorEntryFee(host ? host.influence_points : 100);

    return {
      ...b,
      entry_fee: dynamicEntryFee,
      host,
      criteria,
      assessment_criteria: this.assessmentCriteria.get(b.id) || [],
      submissions_count,
    };
  }

  private hydrateSubmission(s: Submission): Submission {
    const owner = this.users.get(s.owner_id);
    const board = this.boards.get(s.board_id);
    const boardCriteria = this.getBoardCriteria(s.board_id);

    const scores: SubmissionScore[] = boardCriteria.map((c) => {
      const scoreKey = `${s.id}:${c.id}`;
      const scoreObj = this.submissionScores.get(scoreKey);
      return {
        id: scoreObj ? scoreObj.id : `score-${s.id}-${c.id}`,
        submission_id: s.id,
        criterion_id: c.id,
        raw_score: scoreObj ? scoreObj.raw_score : 0,
        criterion_name: c.criterion_name,
        criterion_weight: c.weight,
      };
    });

    return {
      ...s,
      owner,
      board: board ? this.hydrateBoard(board) : undefined,
      scores,
    };
  }
}

export const dbStore = new ScofenDatabase();
