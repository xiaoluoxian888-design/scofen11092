export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  bio: string | null;
  is_subscriber: boolean; // Producer Master audio access status
  influence_points: number; // Authority metric (min 100 to create a board)
  assessment_status?: 'pending' | 'assessed' | 'exempt';
  is_assessment_completed?: boolean;
  role?: 'admin' | 'curator' | 'artist';
  created_at: string;
}

export interface SongBoardEntry {
  submission_id: string;
  board_id: string;
  board_title: string;
  curator_name: string;
  curator_id?: string;
  entry_mode: 'crowd_pool' | 'curator_skip';
  curator_fee_paid: number;
  payment_status: 'pending' | 'confirmed';
  crowd_rating: number | null;
  curator_rating: number | null;
  final_score: number;
  is_locked: boolean;
  escalation_status: 'crowd_pool' | 'escalated_to_curator' | 'curator_rated' | 'submitted_to_scofen' | 'streaming_approved';
  streaming_status: 'none' | 'pending_scofen_approval' | 'streaming_sector';
  created_at: string;
  about_track?: string;
}

export interface SongProfile {
  song_id: string;
  track_title: string;
  owner_id: string;
  owner_name: string;
  genre: string;
  bpm: number;
  duration_seconds: number;
  audio_url: string;
  preview_url: string;
  cover_gradient: string;
  lyrics: string;
  about_track?: string;
  created_at: string;
  entries: SongBoardEntry[];
}

export interface InitialAssessmentCriteria {
  id: string;
  board_id: string;
  question: string;
  metric_name: string;
  weight: number;
}

export interface BoardCriterion {
  id: string;
  board_id: string;
  criterion_name: string;
  weight: number; // Sum to 100
}

export interface Board {
  id: string;
  host_id: string;
  title: string;
  description?: string | null;
  board_type?: string; // e.g. 'Sync for action movie', 'Label A&R signing singer', 'Radio Airplay', etc.
  entry_fee: number; // Curator pricing rule: host.influence_points * 0.1
  created_at: string;
  genre?: string;
  cover_gradient?: string;
  ledger_balance: number; // Board ledger holding 70% of $5 crowd entry fees ($3.50 each)
  assessment_criteria?: InitialAssessmentCriteria[]; // Initial assessment review form set up by host
  criteria?: BoardCriterion[]; // Custom board grading criteria (Unified scorecard)
  host?: User;
  submissions_count?: number;
}

export interface VoterSnapshotEntry {
  voter_id: string;
  voter_name: string;
  voter_score: number;
  voter_influence: number;
  is_accurate: boolean; // Within 10% of final combined score
  timestamp: string;
}

export interface RoyaltySplitMatrix {
  artist_pct: number;   // 70% if crowd-escalated, 80% if self-funded skip
  curator_pct: number;  // 10%
  scofen_pct: number;   // 10%
  crowd_pct: number;    // 10% if crowd-escalated (split among snapshot), 0% if self-funded skip
  type: 'crowd_escalated' | 'self_funded_skip';
}

export interface Submission {
  id: string;
  song_id?: string;       // Unique song identity across multiple board entries
  board_id: string;
  owner_id: string;
  track_title: string;
  lyrics?: string;        // Full song lyrics
  about_track?: string;   // Optional description / story behind the track
  audio_url: string;      // Full audio track
  preview_url: string;    // 60-second preview
  entry_mode: 'crowd_pool' | 'curator_skip';
  curator_fee_paid: number;
  payment_status: 'pending' | 'confirmed';
  
  // Scoring Structure (Listed separately, strict 50:50 combined split)
  crowd_rating: number | null;
  curator_rating: number | null;
  final_score: number; // Strict 50:50 weight split: (curator * 0.5) + (crowd * 0.5)
  is_locked: boolean;  // Once curator finishes rating, permanently locked
  
  // Crowd Escalation & Pipeline
  escalation_status: 'crowd_pool' | 'escalated_to_curator' | 'curator_rated' | 'submitted_to_scofen' | 'streaming_approved';
  escalation_voter_snapshot?: VoterSnapshotEntry[];
  
  // Streaming Distribution (Sector Gating reserved exclusively by Scofen handpicking)
  streaming_status: 'none' | 'pending_scofen_approval' | 'streaming_sector';
  royalty_split?: RoyaltySplitMatrix;

  created_at: string;
  genre?: string;
  cover_gradient?: string;
  bpm?: number;
  owner?: User;
  board?: Board;
  scores?: SubmissionScore[];
  audio_preset?: string;
  duration_seconds?: number;
}

export interface SubmissionScore {
  id: string;
  submission_id: string;
  criterion_id: string;
  raw_score: number; // 0-100
  criterion_name?: string;
  criterion_weight?: number;
}

export interface CrowdRatingVote {
  id: string;
  submission_id: string;
  board_id: string;
  voter_id: string;
  voter_name: string;
  voter_influence: number;
  dimension_scores: Record<string, number>;
  composite_score: number;
  timestamp: string;
}

export interface InfluencePointEvent {
  user_id: string;
  user_name: string;
  submission_id: string;
  point_delta: number; // +1 or -1
  type: 'CONSENSUS_REWARD' | 'EXTREME_PENALTY';
  reason: string;
  timestamp: string;
}

export interface Follow {
  follower_id: string;
  following_id: string;
  created_at?: string;
}

export interface LedgerEntry {
  id: string;
  submission_id: string;
  board_id: string;
  payer_id: string;
  host_id: string;
  entry_fee: number;
  host_cut: number;     // 70% of $5 ($3.50 held in board ledger) or curator entry fee
  platform_cut: number; // 30% of $5 ($1.50) goes directly to Scofen
  type?: 'CROWD_POOL_ENTRY' | 'CURATOR_SKIP_ENTRY' | 'ESCALATION_PAYOUT' | 'STREAMING_SUBSCRIPTION';
  description?: string;
  created_at: string;
}

export interface StreamingAccessResult {
  submission_id: string;
  track_title: string;
  stream_type: 'FULL_TRACK' | '60_SECOND_PREVIEW';
  url: string;
  is_authorized_full: boolean;
  authorization_reason: 'BOARD_HOST' | 'TRACK_OWNER' | 'PREMIUM_SUBSCRIBER' | 'STREAMING_SECTOR' | 'PUBLIC_PREVIEW_ONLY';
  preview_limit_seconds: number | null;
}

export interface RatedTrackReportItem {
  submission_id: string;
  track_title: string;
  artist_name: string;
  artist_id?: string;
  board_id: string;
  board_title: string;
  user_score: number;
  crowd_rating: number;
  curator_rating: number | null;
  final_score: number;
  is_locked: boolean;
  status: 'Finalized' | 'Pending Finalization';
  influence_delta: number | null;
  influence_reason: string | null;
  rated_at: string;
  evaluation_role?: 'crowd_voter' | 'curator';
  audio_url?: string;
  audio_preset?: string;
  genre?: string;
  dimension_scores?: Record<string, number>;
}

export interface UserProfileData {
  user: User;
  hostedBoards: Board[];
  submittedTracks: Submission[];
  followersCount: number;
  followingCount: number;
  followers: User[];
  following: User[];
  influenceEvents: InfluencePointEvent[];
  ratedTracks: RatedTrackReportItem[];
  isFollowing?: boolean;
}

export interface AssessmentSubmission {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  industryRole: string;
  verificationLinks: string;
  audienceMetrics: string;
  curationCriteria: string;
  submitted_at: string;
  status: 'pending' | 'finalized';
}

export type EmailTemplateEventId =
  | 'account_creation'
  | 'password_reset'
  | 'assessment_submitted'
  | 'assessment_completed'
  | 'board_created'
  | 'song_entered'
  | 'song_crowd_rated'
  | 'song_curator_rated'
  | 'influence_delta'
  | 'streaming_submitted'
  | 'payment_notification'
  | 'someone_follow_you';

export interface EmailNotificationTemplate {
  id: EmailTemplateEventId;
  name: string;
  category: string;
  triggerDescription: string;
  subject: string;
  preheader: string;
  body: string;
  variables: string[];
  enabled: boolean;
  recipientDescription: string;
  updated_at: string;
}

export interface ActivityFeedItem {
  id: string;
  actor_id: string;
  actor_name: string;
  actor_email?: string;
  actor_role?: string;
  action_type: 'upload_track' | 'enter_board' | 'create_board' | 'rate_track' | 'curate_track' | 'gain_influence' | 'follow_user';
  title: string;
  description: string;
  target_id?: string;
  target_title?: string;
  timestamp: string;
  track_id?: string;
  track_title?: string;
  board_id?: string;
  board_title?: string;
}



