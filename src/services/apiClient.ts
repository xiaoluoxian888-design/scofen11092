import { 
  User, 
  Board, 
  Submission, 
  LedgerEntry, 
  StreamingAccessResult,
  CrowdRatingVote,
  InfluencePointEvent,
  RoyaltySplitMatrix,
  VoterSnapshotEntry,
  SongProfile,
  UserProfileData,
  EmailNotificationTemplate,
  ActivityFeedItem
} from '../types/schema';
import { dbStore } from './dbStore';

const BASE_URL = '/api';

export const apiClient = {
  // 1. Auth & Users
  async signup(first_name: string, last_name: string, email: string, bio?: string): Promise<User> {
    try {
      const res = await fetch(`${BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_name, last_name, email, bio }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Signup failed');
      }
      return await res.json();
    } catch {
      return dbStore.signup(first_name, last_name, email, bio || null);
    }
  },

  async signupHostWithAssessment(
    first_name: string,
    last_name: string,
    email: string,
    bio: string | null,
    assessment: {
      industryRole: string;
      verificationLinks: string;
      audienceMetrics: string;
      curationCriteria: string;
    }
  ): Promise<{ user: User; assessment: any }> {
    try {
      const res = await fetch(`${BASE_URL}/auth/host-signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_name, last_name, email, bio, assessment }),
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      if (err.error) throw new Error(err.error);
    } catch (e) {
      if (e instanceof Error && e.message.includes('already registered')) throw e;
    }
    return dbStore.signupHostWithAssessment(first_name, last_name, email, bio, assessment);
  },

  async login(email: string): Promise<User> {
    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Login failed');
      }
      return await res.json();
    } catch {
      return dbStore.login(email);
    }
  },

  async getUsers(): Promise<User[]> {
    try {
      const res = await fetch(`${BASE_URL}/users`);
      if (res.ok) return await res.json();
    } catch {}
    return dbStore.getAllUsers();
  },

  async getAdminUsers(): Promise<any[]> {
    try {
      const res = await fetch(`${BASE_URL}/admin/users`);
      if (res.ok) return await res.json();
    } catch {}
    return dbStore.getAllUsersAdminData();
  },

  async getUserProfile(userId: string, currentUserId?: string): Promise<UserProfileData> {
    try {
      const url = currentUserId ? `${BASE_URL}/users/${userId}?currentUserId=${currentUserId}` : `${BASE_URL}/users/${userId}`;
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch {}
    const data = dbStore.getUserProfileData(userId);
    const isFollowing = currentUserId ? dbStore.isFollowing(currentUserId, userId) : false;
    return { ...data, isFollowing };
  },

  async updateUserProfile(
    userId: string,
    data: { first_name?: string; last_name?: string; bio?: string }
  ): Promise<User> {
    try {
      const res = await fetch(`${BASE_URL}/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) return await res.json();
    } catch {}
    return dbStore.updateUserProfile(userId, data);
  },

  async submitInfluenceAssessment(
    userId: string,
    payload: {
      industryRole: string;
      verificationLinks: string;
      audienceMetrics: string;
      curationCriteria: string;
    }
  ): Promise<User> {
    try {
      const res = await fetch(`${BASE_URL}/users/${userId}/influence-assessment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      if (err.error) throw new Error(err.error);
    } catch (e) {
      if (e instanceof Error && e.message.includes('already been completed')) throw e;
    }
    return dbStore.submitInfluenceAssessment(userId, payload);
  },

  async getPendingAssessments() {
    try {
      const res = await fetch(`${BASE_URL}/admin/assessments`);
      if (res.ok) return await res.json();
    } catch {}
    return dbStore.getPendingAssessments();
  },

  async finalizeAssessment(assessmentId: string, assignedPoints: number) {
    try {
      const res = await fetch(`${BASE_URL}/admin/assessments/${assessmentId}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedPoints }),
      });
      if (res.ok) return await res.json();
    } catch {}
    return dbStore.finalizeAssessment(assessmentId, assignedPoints);
  },

  async toggleSubscriber(userId: string): Promise<{ user: User; message: string }> {
    try {
      const res = await fetch(`${BASE_URL}/users/${userId}/subscribe`, { method: 'PUT' });
      if (res.ok) return await res.json();
    } catch {}
    const user = dbStore.toggleSubscriber(userId);
    return {
      user,
      message: 'Producer suite active with unrestricted master audio playback.',
    };
  },

  async toggleFollow(followerId: string, followingId: string): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/users/${followingId}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ follower_id: followerId }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.is_following;
      }
    } catch {}
    return dbStore.toggleFollow(followerId, followingId);
  },

  // 1. Initial Assessment
  async submitInitialAssessment(
    userId: string,
    boardId: string,
    answers: Array<{ score: number; weight: number }>
  ): Promise<{ user: User; baselineInfluence: number }> {
    try {
      const res = await fetch(`${BASE_URL}/users/${userId}/assessment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board_id: boardId, answers }),
      });
      if (res.ok) return await res.json();
    } catch {}
    return dbStore.submitInitialAssessment(userId, boardId, answers);
  },

  async getInfluenceEvents(userId: string): Promise<InfluencePointEvent[]> {
    try {
      const res = await fetch(`${BASE_URL}/users/${userId}/influence-events`);
      if (res.ok) return await res.json();
    } catch {}
    return dbStore.getInfluenceEvents(userId);
  },

  // 1 & 3. Boards & Criteria
  async getBoards(): Promise<Board[]> {
    try {
      const res = await fetch(`${BASE_URL}/boards`);
      if (res.ok) return await res.json();
    } catch {}
    return dbStore.getAllBoards();
  },

  async getBoard(boardId: string): Promise<{ board: Board; submissions: Submission[] }> {
    try {
      const res = await fetch(`${BASE_URL}/boards/${boardId}`);
      if (res.ok) return await res.json();
    } catch {}
    const b = dbStore.getBoard(boardId);
    if (!b) throw new Error('Board not found');
    const subs = dbStore.getBoardSubmissions(boardId);
    return { board: b, submissions: subs };
  },

  async createBoard(
    host_id: string,
    title: string,
    criteria: Array<{ criterion_name: string; weight: number }>,
    genre?: string,
    cover_gradient?: string,
    assessment_criteria?: Array<{ question: string; metric_name: string; weight: number }>,
    board_type?: string,
    description?: string
  ): Promise<Board> {
    const res = await fetch(`${BASE_URL}/boards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host_id, title, criteria, genre, cover_gradient, assessment_criteria, board_type, description }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Board creation failed');
    }
    return await res.json();
  },

  // Free Studio Track Upload (No board required, no payment required)
  async uploadStudioTrack(
    ownerId: string,
    trackTitle: string,
    genre: string = 'Electronic / Synthwave',
    audioPreset: string = 'cyber_bass',
    lyrics?: string,
    bpm: number = 124,
    aboutTrack?: string,
    audioUrl?: string,
    durationSeconds?: number
  ): Promise<Submission> {
    try {
      const res = await fetch(`${BASE_URL}/studio/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_id: ownerId,
          track_title: trackTitle,
          genre,
          audio_preset: audioPreset,
          lyrics,
          bpm,
          about_track: aboutTrack,
          audio_url: audioUrl,
          duration_seconds: durationSeconds,
        }),
      });
      if (res.ok) return await res.json();
      const err = await res.json();
      throw new Error(err.error || 'Studio upload failed');
    } catch {
      return dbStore.createStudioTrack(
        ownerId,
        trackTitle,
        genre,
        audioPreset,
        lyrics,
        bpm,
        aboutTrack,
        audioUrl,
        durationSeconds
      );
    }
  },

  // 2. Financial Entry & Pool Mechanics
  async createSubmission(
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
  ): Promise<Submission> {
    try {
      const res = await fetch(`${BASE_URL}/boards/${boardId}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          owner_id: ownerId, 
          track_title: trackTitle, 
          entry_mode: entryMode, 
          audio_preset: audioPreset,
          lyrics,
          genre,
          about_track: aboutTrack,
          audio_url: audioUrl,
          duration_seconds: durationSeconds
        }),
      });
      if (res.ok) return await res.json();
      const err = await res.json();
      throw new Error(err.error || 'Submission failed');
    } catch {
      return dbStore.createSubmission(
        boardId,
        ownerId,
        trackTitle,
        entryMode,
        audioPreset,
        lyrics,
        genre,
        aboutTrack,
        audioUrl,
        durationSeconds
      );
    }
  },

  async getSongProfile(songIdOrSubId: string): Promise<SongProfile> {
    try {
      const res = await fetch(`${BASE_URL}/songs/${songIdOrSubId}`);
      if (res.ok) return await res.json();
    } catch {}
    return dbStore.getSongProfile(songIdOrSubId);
  },

  async updateSongProfile(
    songIdOrSubId: string,
    updates: { track_title?: string; genre?: string; lyrics?: string; about_track?: string }
  ): Promise<SongProfile> {
    try {
      const res = await fetch(`${BASE_URL}/songs/${songIdOrSubId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) return await res.json();
      const err = await res.json();
      throw new Error(err.error || 'Failed to update song');
    } catch {
      return dbStore.updateSong(songIdOrSubId, updates);
    }
  },

  async enterSongIntoBoard(
    songIdOrSubId: string,
    boardId: string,
    entryMode: 'crowd_pool' | 'curator_skip' = 'crowd_pool'
  ): Promise<{ submission: Submission; songProfile: SongProfile }> {
    try {
      const res = await fetch(`${BASE_URL}/songs/${songIdOrSubId}/enter-board`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board_id: boardId, entry_mode: entryMode }),
      });
      if (res.ok) return await res.json();
      const err = await res.json();
      throw new Error(err.error || 'Failed to enter song into board');
    } catch {
      return dbStore.enterSongIntoAnotherBoard(songIdOrSubId, boardId, entryMode);
    }
  },

  async enterCrowdPool(submissionId: string, payerId: string): Promise<{ submission: Submission; board: Board; ledgerEntry: LedgerEntry }> {
    const res = await fetch(`${BASE_URL}/submissions/${submissionId}/crowd-entry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payer_id: payerId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Crowd pool entry failed');
    }
    return await res.json();
  },

  async enterCuratorSkip(submissionId: string, payerId: string): Promise<{ submission: Submission; board: Board; ledgerEntry: LedgerEntry }> {
    const res = await fetch(`${BASE_URL}/submissions/${submissionId}/curator-skip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payer_id: payerId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Curator skip failed');
    }
    return await res.json();
  },

  // 3. Custom Evaluation Matrix & Scoring Structure
  async rateSongAsCrowd(
    submissionId: string,
    voterId: string,
    dimensionScores: Record<string, number>
  ): Promise<{ vote: CrowdRatingVote; crowdRating: number }> {
    const res = await fetch(`${BASE_URL}/submissions/${submissionId}/rate-crowd`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voter_id: voterId, dimension_scores: dimensionScores }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Rating failed');
    }
    return await res.json();
  },

  async rateSongAsCurator(
    submissionId: string,
    curatorId: string,
    dimensionScores: Record<string, number>
  ): Promise<{ submission: Submission; finalCombinedScore: number; formula: string; pointEvents: InfluencePointEvent[] }> {
    const res = await fetch(`${BASE_URL}/submissions/${submissionId}/rate-curator`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ curator_id: curatorId, dimension_scores: dimensionScores }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Curator rating failed');
    }
    return await res.json();
  },

  async getTrackVotes(submissionId: string): Promise<CrowdRatingVote[]> {
    try {
      const res = await fetch(`${BASE_URL}/submissions/${submissionId}/votes`);
      if (res.ok) return await res.json();
    } catch {}
    return dbStore.getCrowdVotes(submissionId);
  },

  // 4. Crowd Escalation Loops
  async getBoardEscalationStatus(boardId: string) {
    try {
      const res = await fetch(`${BASE_URL}/boards/${boardId}/escalation-status`);
      if (res.ok) return await res.json();
    } catch {}
    return dbStore.getBoardEscalationStatus(boardId);
  },

  async executeCrowdEscalation(boardId: string): Promise<{
    escalatedSubmission: Submission;
    curatorFeePaid: number;
    newBoardLedgerBalance: number;
    voterSnapshot: VoterSnapshotEntry[];
  }> {
    const res = await fetch(`${BASE_URL}/boards/${boardId}/escalate`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Escalation execution failed');
    }
    return await res.json();
  },

  // 5. Streaming Distribution & Royalty Splits
  async submitTrackToScofenPipeline(submissionId: string, curatorId: string): Promise<Submission> {
    const res = await fetch(`${BASE_URL}/submissions/${submissionId}/submit-to-scofen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ curator_id: curatorId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Submission to Scofen failed');
    }
    return await res.json();
  },

  async approveStreamingSector(submissionId: string): Promise<{ submission: Submission; royaltySplit: RoyaltySplitMatrix }> {
    const res = await fetch(`${BASE_URL}/submissions/${submissionId}/approve-streaming`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Approval failed');
    }
    return await res.json();
  },

  async getStreamingSectorTracks(): Promise<Submission[]> {
    try {
      const res = await fetch(`${BASE_URL}/streaming-sector`);
      if (res.ok) return await res.json();
    } catch {}
    return dbStore.getStreamingSectorTracks();
  },

  async evaluateStreamingAccess(submissionId: string, requesterId?: string): Promise<StreamingAccessResult> {
    try {
      const q = requesterId ? `?requester_id=${requesterId}` : '';
      const res = await fetch(`${BASE_URL}/streaming/${submissionId}${q}`);
      if (res.ok) return await res.json();
    } catch {}
    return dbStore.evaluateStreamingAccess(submissionId, requesterId || null);
  },

  async getFeed(filters: {
    sort?: 'newest' | 'score' | 'range';
    minScore?: number;
    maxScore?: number;
    followedOnly?: boolean;
    currentUserId?: string;
  }): Promise<Submission[]> {
    try {
      const params = new URLSearchParams();
      if (filters.sort) params.set('sort', filters.sort);
      if (filters.minScore !== undefined) params.set('minScore', filters.minScore.toString());
      if (filters.maxScore !== undefined) params.set('maxScore', filters.maxScore.toString());
      if (filters.followedOnly) params.set('followedOnly', 'true');
      if (filters.currentUserId) params.set('currentUserId', filters.currentUserId);

      const res = await fetch(`${BASE_URL}/feed?${params.toString()}`);
      if (res.ok) return await res.json();
    } catch {}
    return dbStore.getDiscoveryFeed(filters);
  },

  async getLedger(): Promise<LedgerEntry[]> {
    try {
      const res = await fetch(`${BASE_URL}/ledger`);
      if (res.ok) return await res.json();
    } catch {}
    return dbStore.getLedger();
  },

  async checkoutSubmission(submissionId: string, payerId: string) {
    return this.enterCrowdPool(submissionId, payerId);
  },

  // Stripe & Resend Integration Hub
  async getIntegrationStatus() {
    try {
      const res = await fetch(`${BASE_URL}/integrations/status`);
      if (res.ok) return await res.json();
    } catch {}
    return {
      stripe: { isConfigured: false, publishableKeyPreview: 'Not set' },
      resend: { isConfigured: false, fromEmail: 'onboarding@resend.dev' },
    };
  },

  async getIntegrationLogs() {
    try {
      const res = await fetch(`${BASE_URL}/integrations/logs`);
      if (res.ok) return await res.json();
    } catch {}
    return [];
  },

  async reloadIntegrationEnv() {
    const res = await fetch(`${BASE_URL}/integrations/reload`, { method: 'POST' });
    return await res.json();
  },

  async createIntegrationStripeCheckout(payload: any) {
    const res = await fetch(`${BASE_URL}/integrations/stripe/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  },

  async simulateStripeWebhook(eventType: string, payload: any) {
    const res = await fetch(`${BASE_URL}/integrations/stripe/webhook-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType, payload }),
    });
    return await res.json();
  },

  async sendResendEmail(payload: {
    to: string;
    templateId: 'submission_received' | 'evaluation_completed' | 'curator_payout' | 'subscription_welcome' | 'custom';
    subject?: string;
    customHtml?: string;
    data?: Record<string, unknown>;
  }) {
    const res = await fetch(`${BASE_URL}/integrations/resend/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  },

  async clearIntegrationLogs() {
    const res = await fetch(`${BASE_URL}/integrations/logs`, { method: 'DELETE' });
    return await res.json();
  },

  // 13. Admin Email Notification Templates
  async getEmailTemplates(): Promise<EmailNotificationTemplate[]> {
    try {
      const res = await fetch(`${BASE_URL}/admin/email-templates`);
      if (res.ok) return await res.json();
    } catch {}
    return dbStore.getEmailTemplates();
  },

  async updateEmailTemplate(
    id: string,
    updates: Partial<EmailNotificationTemplate>
  ): Promise<EmailNotificationTemplate> {
    try {
      const res = await fetch(`${BASE_URL}/admin/email-templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) return await res.json();
    } catch {}
    return dbStore.updateEmailTemplate(id, updates);
  },

  async resetEmailTemplates(): Promise<EmailNotificationTemplate[]> {
    try {
      const res = await fetch(`${BASE_URL}/admin/email-templates/reset`, {
        method: 'POST',
      });
      if (res.ok) return await res.json();
    } catch {}
    return dbStore.resetEmailTemplates();
  },

  async testEmailTemplate(id: string, testEmail?: string, sampleVariables?: Record<string, string | number>) {
    try {
      const res = await fetch(`${BASE_URL}/admin/email-templates/${id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail, sampleVariables }),
      });
      if (res.ok) return await res.json();
    } catch {}
    return dbStore.dispatchEmail(id as any, testEmail || 'test@scofen.network', sampleVariables || {});
  },

  async requestPasswordReset(email: string) {
    try {
      const res = await fetch(`${BASE_URL}/auth/password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) return await res.json();
    } catch {}
    return dbStore.requestPasswordReset(email);
  },

  // 14. What is new Feed & Social Activity
  async getWhatIsNew(userId?: string): Promise<{
    feed: ActivityFeedItem[];
    followedUserIds: string[];
    suggestedUsers: User[];
  }> {
    if (!userId) {
      return dbStore.getWhatIsNewFeed();
    }
    try {
      const res = await fetch(`${BASE_URL}/users/${userId}/what-is-new`);
      if (res.ok) return await res.json();
    } catch {}
    return dbStore.getWhatIsNewFeed(userId);
  },
};
