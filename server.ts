import dotenv from 'dotenv';
dotenv.config({ override: true });
import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { dbStore } from './src/services/dbStore.ts';
import { integrationsService } from './src/server/integrationsService.ts';
import { sendWelcomeEmail, sendPasswordResetEmail, sendEmail } from './src/server/emailService.ts';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // ==========================================
  // 1. IDENTITY & STRUCTURAL DEFINITION
  // ==========================================

  app.post('/api/auth/signup', (req: Request, res: Response) => {
    try {
      const { first_name, last_name, email, bio } = req.body;
      if (!first_name || !last_name || !email) {
        return res.status(400).json({ error: 'first_name, last_name, and email are required' });
      }
      const user = dbStore.signup(first_name, last_name, email, bio);
      // Trigger Welcome email asynchronously without blocking signup response
      sendWelcomeEmail({
        to: user.email,
        name: `${user.first_name} ${user.last_name}`,
        role: user.role === 'curator' ? 'Curator' : 'Artist',
        dashboardUrl: 'https://scofen.com/dashboard',
      }).catch((err) => console.error('[Async Welcome Email Error]:', err));

      return res.status(201).json(user);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Signup failed';
      return res.status(400).json({ error: message });
    }
  });

  app.post('/api/auth/host-signup', (req: Request, res: Response) => {
    try {
      const { first_name, last_name, email, bio, assessment } = req.body;
      if (!first_name || !last_name || !email || !assessment) {
        return res.status(400).json({ error: 'first_name, last_name, email, and assessment are required' });
      }
      const result = dbStore.signupHostWithAssessment(first_name, last_name, email, bio, assessment);
      // Trigger Host Welcome email asynchronously
      sendWelcomeEmail({
        to: result.user.email,
        name: `${result.user.first_name} ${result.user.last_name}`,
        role: 'Host',
        dashboardUrl: 'https://scofen.com/dashboard?tab=boards',
      }).catch((err) => console.error('[Async Host Welcome Email Error]:', err));

      return res.status(201).json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Host signup failed';
      return res.status(400).json({ error: message });
    }
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'email is required' });
      }
      const user = dbStore.login(email);
      return res.json(user);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      return res.status(404).json({ error: message });
    }
  });

  app.get('/api/users', (_req: Request, res: Response) => {
    return res.json(dbStore.getAllUsers());
  });

  app.get('/api/admin/users', (_req: Request, res: Response) => {
    return res.json(dbStore.getAllUsersAdminData());
  });

  app.get('/api/users/:id', (req: Request, res: Response) => {
    try {
      const profileData = dbStore.getUserProfileData(req.params.id);
      const currentUserId = req.query.currentUserId as string | undefined;
      const isFollowing = currentUserId ? dbStore.isFollowing(currentUserId, req.params.id) : false;
      return res.json({ ...profileData, isFollowing });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'User not found';
      return res.status(404).json({ error: message });
    }
  });

  app.put('/api/users/:id', (req: Request, res: Response) => {
    try {
      const { first_name, last_name, bio } = req.body;
      const updatedUser = dbStore.updateUserProfile(req.params.id, { first_name, last_name, bio });
      return res.json(updatedUser);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Profile update failed';
      return res.status(400).json({ error: message });
    }
  });

  app.put('/api/users/:id/subscribe', (req: Request, res: Response) => {
    try {
      const user = dbStore.toggleSubscriber(req.params.id);
      return res.json({
        user,
        message: 'Producer suite active with unrestricted master audio playback.',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Subscription update failed';
      return res.status(400).json({ error: message });
    }
  });

  app.post('/api/users/:id/follow', (req: Request, res: Response) => {
    try {
      const { follower_id } = req.body;
      if (!follower_id) {
        return res.status(400).json({ error: 'follower_id required' });
      }
      const isFollowing = dbStore.toggleFollow(follower_id, req.params.id);
      return res.json({ is_following: isFollowing });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Follow toggle failed';
      return res.status(400).json({ error: message });
    }
  });

  // Initial Assessment vetting
  app.post('/api/users/:id/assessment', (req: Request, res: Response) => {
    try {
      const { board_id, answers } = req.body;
      if (!board_id || !answers || !Array.isArray(answers)) {
        return res.status(400).json({ error: 'board_id and answers array required' });
      }
      const result = dbStore.submitInitialAssessment(req.params.id, board_id, answers);
      return res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Assessment failed';
      return res.status(400).json({ error: message });
    }
  });

  app.get('/api/users/:id/influence-events', (req: Request, res: Response) => {
    return res.json(dbStore.getInfluenceEvents(req.params.id));
  });

  app.post('/api/users/:id/influence-assessment', (req: Request, res: Response) => {
    try {
      const updatedUser = dbStore.submitInfluenceAssessment(req.params.id, req.body);
      return res.json(updatedUser);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Influence assessment failed';
      return res.status(400).json({ error: message });
    }
  });

  app.get('/api/admin/assessments', (_req: Request, res: Response) => {
    return res.json(dbStore.getPendingAssessments());
  });

  app.post('/api/admin/assessments/:id/finalize', (req: Request, res: Response) => {
    try {
      const { assignedPoints } = req.body;
      const result = dbStore.finalizeAssessment(req.params.id, Number(assignedPoints));
      return res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to finalize assessment';
      return res.status(400).json({ error: message });
    }
  });

  // Password reset request
  app.post('/api/auth/password-reset', (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Email is required for password reset' });
      }
      const result = dbStore.requestPasswordReset(email);
      // Asynchronously trigger password reset email
      const resetUrl = result.resetLink || `https://scofen.com/auth/reset?token=tok_${Date.now()}`;
      sendPasswordResetEmail({
        to: email,
        name: email.split('@')[0],
        resetUrl,
        expiresInMinutes: 60,
      }).catch((err) => console.error('[Async Password Reset Email Error]:', err));

      return res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Password reset failed';
      return res.status(400).json({ error: message });
    }
  });

  // User "What is new" Activity Feed & Follows
  app.get('/api/users/:id/what-is-new', (req: Request, res: Response) => {
    try {
      const result = dbStore.getWhatIsNewFeed(req.params.id);
      return res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch what is new feed';
      return res.status(400).json({ error: message });
    }
  });

  // Admin Email Notification Templates
  app.get('/api/admin/email-templates', (_req: Request, res: Response) => {
    try {
      const templates = dbStore.getEmailTemplates();
      return res.json(templates);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch email templates';
      return res.status(500).json({ error: message });
    }
  });

  app.get('/api/admin/email-templates/:id', (req: Request, res: Response) => {
    try {
      const template = dbStore.getEmailTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ error: 'Email template not found' });
      }
      return res.json(template);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch email template';
      return res.status(500).json({ error: message });
    }
  });

  app.put('/api/admin/email-templates/:id', (req: Request, res: Response) => {
    try {
      const updated = dbStore.updateEmailTemplate(req.params.id, req.body);
      return res.json(updated);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update email template';
      return res.status(400).json({ error: message });
    }
  });

  app.post('/api/admin/email-templates/reset', (_req: Request, res: Response) => {
    try {
      const templates = dbStore.resetEmailTemplates();
      return res.json(templates);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reset email templates';
      return res.status(500).json({ error: message });
    }
  });

  app.post('/api/admin/email-templates/:id/test', async (req: Request, res: Response) => {
    try {
      const { testEmail, sampleVariables } = req.body;
      const targetEmail = testEmail || 'admin-test@scofen.network';
      const result = dbStore.dispatchEmail(
        req.params.id as any,
        targetEmail,
        sampleVariables || {
          user_name: 'Alex Mercer',
          user_email: targetEmail,
          role: 'artist',
          influence_points: 150,
          assigned_points: 150,
          point_delta: '+25',
          authority_status: 'Verified Board Host Authority (≥100 PTS)',
          industry_role: 'Audio Engineer / Producer',
          board_title: 'Apex Metro: Cyber-Club Sonic Gauntlet',
          genre: 'Cyberpunk & Club Synthwave',
          entry_fee: '45.00',
          track_title: 'Neon Horizon (Hyper-Drive Mix)',
          entry_mode: 'Crowd Pool',
          rater_name: 'Solana Grey',
          score: '87.1',
          crowd_average: '84.5',
          curator_score: '88.0',
          crowd_score: '84.5',
          final_combined_score: '86.2',
          total_ratings: 12,
          reason: 'Voted within 10% consensus bounds (+1 PT)',
          new_total: 151,
          royalty_split: '70% Artist / 10% Curator / 10% Crowd / 10% Scofen',
          amount: '5.00',
          payment_type: 'Crowd Pool Entry Fee',
          host_cut: '3.50',
          platform_cut: '1.50',
          ledger_id: 'led_994238',
          timestamp: new Date().toISOString(),
          follower_name: 'Solana Grey',
          follower_role: 'ARTIST / CURATOR',
          follower_influence: 150,
          follower_profile_url: 'https://scofen.com/users/solana-grey',
          login_url: 'https://scofen.com/login',
          platform_name: 'Scofen Protocol',
          dashboard_url: 'https://scofen.com/dashboard',
          board_url: 'https://scofen.com/boards/apex-metro',
          track_url: 'https://scofen.com/tracks/neon-horizon',
          stream_url: 'https://scofen.com/streaming/neon-horizon',
          reset_link: 'https://scofen.network/auth/reset?token=test-token',
          expiry_time: '60 minutes',
          support_email: 'security@scofen.network',
          submitted_at: new Date().toISOString(),
          current_points: 1,
          admin_terminal_url: 'https://scofen.com/admin',
          criteria_summary: 'Dynamic Tension (30%), Bass Monofiltration (35%), Synth Character (35%)',
        }
      );
      // Also dispatch live email via Resend
      try {
        await sendEmail({
          to: targetEmail,
          subject: result.subject,
          html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F3F4F6; padding: 40px 16px;">
            <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 6px; padding: 32px;">
              <div style="font-family: monospace; font-size: 15px; font-weight: 800; letter-spacing: 0.15em; color: #111827; margin-bottom: 24px; border-bottom: 1px solid #E5E7EB; padding-bottom: 16px;">
                SCOFEN <span style="display:inline-block; width:6px; height:6px; background:#6B21A8; border-radius:50%; margin-left:4px; vertical-align:middle;"></span>
              </div>
              <h1 style="font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 16px 0; line-height: 1.3;">${result.subject}</h1>
              <div style="font-size: 14px; line-height: 1.6; color: #374151; white-space: pre-line;">${result.body}</div>
              <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #E5E7EB; font-size: 11px; color: #6B7280; font-family: monospace;">
                SCOFEN Music Platform &bull; Protocol Operations &bull; Transactional Test Notice
              </div>
            </div>
          </div>`,
          tags: [{ name: 'test_template', value: req.params.id }],
        });
      } catch (resendErr) {
        console.warn('[Resend Template Test Notice]:', resendErr);
      }

      return res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Test dispatch failed';
      return res.status(400).json({ error: message });
    }
  });

  app.get('/api/admin/email-dispatches', (_req: Request, res: Response) => {
    return res.json(dbStore.getEmailDispatches());
  });

  // Board Creation (enforces minimum 100 influence points)
  app.post('/api/boards', (req: Request, res: Response) => {
    try {
      const { host_id, title, criteria, genre, cover_gradient, assessment_criteria, board_type, description } = req.body;
      if (!host_id || !title || !criteria) {
        return res.status(400).json({ error: 'host_id, title, and criteria array required' });
      }
      if (!Array.isArray(criteria) || criteria.length === 0) {
        return res.status(400).json({ error: 'Board must define at least one criterion with weight 0-100' });
      }
      const board = dbStore.createBoard(
        host_id,
        title,
        criteria,
        genre,
        cover_gradient,
        assessment_criteria,
        board_type,
        description
      );
      return res.status(201).json(board);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Board creation failed';
      return res.status(400).json({ error: message });
    }
  });

  app.get('/api/boards', (_req: Request, res: Response) => {
    return res.json(dbStore.getAllBoards());
  });

  app.get('/api/boards/:id', (req: Request, res: Response) => {
    const board = dbStore.getBoard(req.params.id);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    const submissions = dbStore.getBoardSubmissions(board.id);
    return res.json({ board, submissions });
  });

  // ==========================================
  // 2. FINANCIAL ENTRY & POOL MECHANICS
  // ==========================================

  // Free Studio Track Upload (No board required, no payment required)
  app.post('/api/studio/upload', (req: Request, res: Response) => {
    try {
      const owner_id = req.body.owner_id || req.body.artistId;
      const track_title = req.body.track_title || req.body.title;
      const genre = req.body.genre || 'Electronic / Synthwave';
      const audio_preset = req.body.audio_preset || req.body.preset || 'cyber_bass';
      const lyrics = req.body.lyrics || '';
      const about_track = req.body.about_track || req.body.aboutTrack || '';
      const audio_url = req.body.audio_url || req.body.audioUrl || req.body.audio_data || '';
      const bpm = req.body.bpm ? Number(req.body.bpm) : 124;
      const duration_seconds = req.body.duration_seconds || req.body.durationSeconds || 180;

      if (!owner_id || !track_title) {
        return res.status(400).json({ error: 'owner_id (or artistId) and track_title (or title) are required' });
      }
      const track = dbStore.createStudioTrack(
        owner_id,
        track_title,
        genre,
        audio_preset,
        lyrics,
        bpm,
        about_track,
        audio_url,
        duration_seconds
      );
      return res.status(201).json(track);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Studio track upload failed';
      return res.status(400).json({ error: message });
    }
  });

  app.post('/api/boards/:boardId/submissions', (req: Request, res: Response) => {
    try {
      const { 
        owner_id, 
        track_title, 
        entry_mode, 
        audio_preset, 
        lyrics, 
        genre,
        about_track,
        audio_url,
        audio_data,
        duration_seconds
      } = req.body;

      if (!owner_id || !track_title) {
        return res.status(400).json({ error: 'owner_id and track_title are required' });
      }
      const submission = dbStore.createSubmission(
        req.params.boardId,
        owner_id,
        track_title,
        entry_mode || 'crowd_pool',
        audio_preset || 'cyber_bass',
        lyrics,
        genre,
        about_track,
        audio_url || audio_data,
        duration_seconds
      );
      return res.status(201).json(submission);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Submission creation failed';
      return res.status(400).json({ error: message });
    }
  });

  // Dedicated Song Profile: Returns song information and all boards it entered
  app.get('/api/songs/:id', (req: Request, res: Response) => {
    try {
      const profile = dbStore.getSongProfile(req.params.id);
      return res.json(profile);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Song not found';
      return res.status(404).json({ error: message });
    }
  });

  // Edit Song Profile (Title, Genre, Lyrics, About)
  app.patch('/api/songs/:id', (req: Request, res: Response) => {
    try {
      const { track_title, genre, lyrics, about_track } = req.body;
      const updatedProfile = dbStore.updateSong(req.params.id, {
        track_title,
        genre,
        lyrics,
        about_track,
      });
      return res.json(updatedProfile);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update song';
      return res.status(400).json({ error: message });
    }
  });

  // Alias for submissions/:id update
  app.patch('/api/submissions/:id', (req: Request, res: Response) => {
    try {
      const { track_title, genre, lyrics, about_track } = req.body;
      const updatedProfile = dbStore.updateSong(req.params.id, {
        track_title,
        genre,
        lyrics,
        about_track,
      });
      return res.json(updatedProfile);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update track';
      return res.status(400).json({ error: message });
    }
  });

  // Enter Song into Another Board
  app.post('/api/songs/:id/enter-board', (req: Request, res: Response) => {
    try {
      const { board_id, entry_mode } = req.body;
      if (!board_id) return res.status(400).json({ error: 'board_id is required' });
      const result = dbStore.enterSongIntoAnotherBoard(req.params.id, board_id, entry_mode || 'crowd_pool');
      return res.status(201).json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to enter board';
      return res.status(400).json({ error: message });
    }
  });

  // Crowd Pool Entry ($5: 30% Scofen margin, 70% board ledger)
  app.post('/api/submissions/:id/crowd-entry', (req: Request, res: Response) => {
    try {
      const { payer_id } = req.body;
      if (!payer_id) return res.status(400).json({ error: 'payer_id is required' });
      const result = dbStore.enterCrowdPool(req.params.id, payer_id);
      return res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Crowd entry failed';
      return res.status(400).json({ error: message });
    }
  });

  // Curator Skip Option (Full curator fee upfront: Fee = Curator Influence * 0.1)
  app.post('/api/submissions/:id/curator-skip', (req: Request, res: Response) => {
    try {
      const { payer_id } = req.body;
      if (!payer_id) return res.status(400).json({ error: 'payer_id is required' });
      const result = dbStore.enterCuratorSkip(req.params.id, payer_id);
      return res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Curator skip payment failed';
      return res.status(400).json({ error: message });
    }
  });

  // Backward compatible checkout route
  app.post('/api/submissions/:id/checkout', (req: Request, res: Response) => {
    try {
      const { payer_id, entry_mode } = req.body;
      if (entry_mode === 'curator_skip') {
        const result = dbStore.enterCuratorSkip(req.params.id, payer_id);
        return res.json(result);
      }
      const result = dbStore.enterCrowdPool(req.params.id, payer_id);
      return res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Checkout failed';
      return res.status(400).json({ error: message });
    }
  });

  // ==========================================
  // 3. CUSTOM EVALUATION MATRIX & SCORING STRUCTURE
  // ==========================================

  // Crowd Rating
  app.post('/api/submissions/:id/rate-crowd', (req: Request, res: Response) => {
    try {
      const { voter_id, dimension_scores } = req.body;
      if (!voter_id || !dimension_scores) {
        return res.status(400).json({ error: 'voter_id and dimension_scores required' });
      }
      const result = dbStore.rateSongAsCrowd(req.params.id, voter_id, dimension_scores);
      return res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Crowd rating failed';
      return res.status(400).json({ error: message });
    }
  });

  // Curator Rating (Unified scorecard -> 50:50 final score -> rating lock -> +1/-1 crowd rewards/penalties)
  app.post('/api/submissions/:id/rate-curator', (req: Request, res: Response) => {
    try {
      const { curator_id, dimension_scores } = req.body;
      if (!curator_id || !dimension_scores) {
        return res.status(400).json({ error: 'curator_id and dimension_scores required' });
      }
      const result = dbStore.rateSongAsCurator(req.params.id, curator_id, dimension_scores);
      return res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Curator rating failed';
      return res.status(400).json({ error: message });
    }
  });

  // Get Crowd Votes for a track
  app.get('/api/submissions/:id/votes', (req: Request, res: Response) => {
    return res.json(dbStore.getCrowdVotes(req.params.id));
  });

  // ==========================================
  // 4. CROWD ESCALATION LOOPS
  // ==========================================

  app.get('/api/boards/:id/escalation-status', (req: Request, res: Response) => {
    try {
      const status = dbStore.getBoardEscalationStatus(req.params.id);
      return res.json(status);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve escalation status';
      return res.status(400).json({ error: message });
    }
  });

  app.post('/api/boards/:id/escalate', (req: Request, res: Response) => {
    try {
      const result = dbStore.executeCrowdEscalation(req.params.id);
      return res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Escalation failed';
      return res.status(400).json({ error: message });
    }
  });

  // ==========================================
  // 5. STREAMING DISTRIBUTION & ROYALTY SPLITS
  // ==========================================

  // Curator pipeline submission to Scofen
  app.post('/api/submissions/:id/submit-to-scofen', (req: Request, res: Response) => {
    try {
      const { curator_id } = req.body;
      if (!curator_id) return res.status(400).json({ error: 'curator_id required' });
      const updated = dbStore.submitTrackToScofenPipeline(req.params.id, curator_id);
      return res.json(updated);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Submission to Scofen failed';
      return res.status(400).json({ error: message });
    }
  });

  // Scofen Exclusive Handpicking & Approval
  app.post('/api/submissions/:id/approve-streaming', (req: Request, res: Response) => {
    try {
      const result = dbStore.approveStreamingSector(req.params.id);
      return res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Streaming approval failed';
      return res.status(400).json({ error: message });
    }
  });

  // Streaming Sector Tracks
  app.get('/api/streaming-sector', (_req: Request, res: Response) => {
    return res.json(dbStore.getStreamingSectorTracks());
  });

  // Streaming Gatekeeping Evaluation
  app.get('/api/streaming/:submissionId', (req: Request, res: Response) => {
    try {
      const requesterId = (req.query.requester_id as string) || null;
      const accessResult = dbStore.evaluateStreamingAccess(req.params.submissionId, requesterId);
      return res.json(accessResult);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Streaming evaluation failed';
      return res.status(404).json({ error: message });
    }
  });

  // Curation Discovery Feed
  app.get('/api/feed', (req: Request, res: Response) => {
    const sort = (req.query.sort as 'newest' | 'score' | 'range') || 'score';
    const minScore = req.query.minScore ? Number(req.query.minScore) : 0;
    const maxScore = req.query.maxScore ? Number(req.query.maxScore) : 100;
    const followedOnly = req.query.followedOnly === 'true';
    const currentUserId = (req.query.currentUserId as string) || undefined;

    const feed = dbStore.getDiscoveryFeed({
      sort,
      minScore,
      maxScore,
      followedOnly,
      currentUserId,
    });
    return res.json(feed);
  });

  // Platform Ledger
  app.get('/api/ledger', (_req: Request, res: Response) => {
    return res.json(dbStore.getLedger());
  });

  // Stripe & Resend
  app.get('/api/integrations/status', (_req: Request, res: Response) => {
    return res.json(integrationsService.getStatus());
  });

  app.post('/api/integrations/reload', (_req: Request, res: Response) => {
    const result = integrationsService.reloadEnv();
    return res.json(result);
  });

  app.post('/api/integrations/stripe/checkout', async (req: Request, res: Response) => {
    try {
      const result = await integrationsService.createStripeCheckout(req.body);
      return res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Stripe checkout failed';
      return res.status(500).json({ error: message });
    }
  });

  app.post('/api/integrations/stripe/webhook-test', async (req: Request, res: Response) => {
    try {
      const { eventType, payload } = req.body;
      const result = await integrationsService.simulateStripeWebhook(eventType || 'checkout.session.completed', payload);
      return res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Webhook simulation failed';
      return res.status(500).json({ error: message });
    }
  });

  app.post('/api/integrations/resend/send', async (req: Request, res: Response) => {
    try {
      const { to, templateId, subject, customHtml, data } = req.body;
      if (!to) {
        return res.status(400).json({ error: 'Recipient "to" email address is required' });
      }
      const result = await integrationsService.sendResendEmail({
        to,
        templateId: templateId || 'submission_received',
        subject,
        customHtml,
        data,
      });
      return res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Email dispatch failed';
      return res.status(500).json({ error: message });
    }
  });

  app.get('/api/integrations/logs', (_req: Request, res: Response) => {
    return res.json(integrationsService.getAuditLogs());
  });

  app.delete('/api/integrations/logs', (_req: Request, res: Response) => {
    return res.json(integrationsService.clearAuditLogs());
  });

  // Mount Vite development middlewares or serve static build
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        allowedHosts: true,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[Scofen Engine Manual V2] Running on port ${PORT}`);
  });
}

startServer();
