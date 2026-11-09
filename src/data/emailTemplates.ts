import { EmailNotificationTemplate } from '../types/schema';

export const DEFAULT_EMAIL_TEMPLATES: EmailNotificationTemplate[] = [
  {
    id: 'account_creation',
    name: 'Account Creation Confirmation',
    category: 'Authentication & Access',
    triggerDescription: 'Triggered when a new artist, listener, or curator registers an account on Scofen.',
    subject: 'Welcome to Scofen, {{user_name}} - Protocol Account Activated',
    preheader: 'Your decentralized music discovery account is active.',
    recipientDescription: 'New Registrant ({{user_email}})',
    enabled: true,
    variables: ['{{user_name}}', '{{user_email}}', '{{role}}', '{{influence_points}}', '{{login_url}}', '{{platform_name}}'],
    updated_at: new Date().toISOString(),
    body: `Hello {{user_name}},

Welcome to Scofen — the decentralized multi-criteria music discovery infrastructure and trust ledger.

Your account credentials:
• Identifier: {{user_email}}
• Initial Authority Index: {{influence_points}} PTS
• Account Role: {{role}}

You can now upload studio masters, compete across curator battlefields, rate tracks with mathematical consensus weighting, or apply for board jurisdiction.

Access your terminal:
{{login_url}}

Decentralized Music Discovery Protocol | SCOFEN`,
  },
  {
    id: 'password_reset',
    name: 'Password Reset & Security Verification',
    category: 'Authentication & Access',
    triggerDescription: 'Triggered when a user requests a single-use authentication or credential reset token.',
    subject: 'Security Alert: Password Reset Request for {{user_email}}',
    preheader: 'Use this secure verification link to reset your account credentials.',
    recipientDescription: 'Account Owner ({{user_email}})',
    enabled: true,
    variables: ['{{user_name}}', '{{user_email}}', '{{reset_link}}', '{{expiry_time}}', '{{support_email}}'],
    updated_at: new Date().toISOString(),
    body: `Hello {{user_name}},

We received a security dispatch to reset the access credentials associated with {{user_email}}.

To authorize this request and set a new password, click the secure verification link below (valid for {{expiry_time}}):
{{reset_link}}

If you did not initiate this request, no action is required. Your ledger authentication remains contractually locked.

Security Operations | SCOFEN Protocol`,
  },
  {
    id: 'assessment_submitted',
    name: 'Initial Assessment Submission Received',
    category: 'Authority & Assessment',
    triggerDescription: 'Triggered when an applicant or invited host files an Initial Influence Assessment.',
    subject: 'Assessment Dossier Received - Case #{{assessment_id}} ({{user_name}})',
    preheader: 'Your assessment dossier is queued for Admin Terminal verification.',
    recipientDescription: 'Applicant ({{user_email}}) & Admin Copy',
    enabled: true,
    variables: ['{{user_name}}', '{{user_email}}', '{{industry_role}}', '{{submitted_at}}', '{{current_points}}', '{{admin_terminal_url}}'],
    updated_at: new Date().toISOString(),
    body: `Hello {{user_name}},

Your Initial Influence Assessment dossier has been received and contractually routed to the Scofen Admin Terminal for manual review.

Dossier Summary:
• Applicant: {{user_name}} ({{user_email}})
• Industry Affiliation: {{industry_role}}
• Baseline Authority Index: {{current_points}} PTS
• Dispatch Timestamp: {{submitted_at}}

Status: Assessment in progress. Re-entry has been sealed. The Admin Terminal evaluates portfolio metrics and curation criteria to calibrate starting authority. You will receive an automated notification once reviewed.

SCOFEN Governance & Verification Ledger`,
  },
  {
    id: 'assessment_completed',
    name: 'Initial Assessment Completed with Result',
    category: 'Authority & Assessment',
    triggerDescription: 'Triggered when the Admin Terminal finalizes an assessment and assigns calibrated points.',
    subject: 'Authority Index Finalized: {{assigned_points}} PTS Assigned to {{user_name}}',
    preheader: 'Admin review completed. Your Scofen Influence Points have been calibrated.',
    recipientDescription: 'Applicant ({{user_email}})',
    enabled: true,
    variables: ['{{user_name}}', '{{user_email}}', '{{assigned_points}}', '{{point_delta}}', '{{authority_status}}', '{{dashboard_url}}'],
    updated_at: new Date().toISOString(),
    body: `Hello {{user_name}},

Your Initial Influence Assessment has been reviewed and finalized by the Admin Terminal.

Calibrated Influence Score:
• Final Assigned Index: {{assigned_points}} PTS (Shift: +{{point_delta}} PTS)
• Authority Tier: {{authority_status}}

{{#if_can_host}}
Congratulations: With ≥100 Influence Points, you have unlocked Board Host authority to establish custom genre battlefields, set custom evaluation scorecards, and earn curator revenue.
{{/if_can_host}}

View your updated ledger profile:
{{dashboard_url}}

SCOFEN Trust Architecture`,
  },
  {
    id: 'board_created',
    name: 'Board Creation Confirmation',
    category: 'Boards & Battlefields',
    triggerDescription: 'Triggered when a host with ≥100 Influence Points establishes a new curator battlefield board.',
    subject: 'Board Deployed: "{{board_title}}" is Live on Scofen Ledger',
    preheader: 'Your curator battlefield has been broadcasted to the discovery feed.',
    recipientDescription: 'Board Host ({{host_email}})',
    enabled: true,
    variables: ['{{host_name}}', '{{host_email}}', '{{board_title}}', '{{genre}}', '{{entry_fee}}', '{{board_url}}', '{{criteria_summary}}'],
    updated_at: new Date().toISOString(),
    body: `Hello {{host_name}},

Your curator board battlefield has been officially deployed to the Scofen protocol.

Board Parameters:
• Battlefield Title: {{board_title}}
• Genre / Domain: {{genre}}
• Curator Skip Fee: \${{entry_fee}} (10% of host authority)
• Evaluation Matrix: {{criteria_summary}}
• 50:50 Curator:Crowd Balance: Enforced

Musicians can now submit tracks to your \$5.00 Crowd Pool or choose direct Curator Skip for priority evaluation.

Manage your battlefield:
{{board_url}}

SCOFEN Battlefield Operations`,
  },
  {
    id: 'song_entered',
    name: 'Song Enter the Board Notification',
    category: 'Submissions & Competition',
    triggerDescription: 'Triggered when an artist enters a song into a battlefield board via Crowd Pool or Curator Skip.',
    subject: 'New Contender: "{{track_title}}" Entered "{{board_title}}"',
    preheader: 'A new track has entered the board battlefield.',
    recipientDescription: 'Artist ({{artist_email}}) & Board Host ({{host_email}})',
    enabled: true,
    variables: ['{{artist_name}}', '{{host_name}}', '{{track_title}}', '{{board_title}}', '{{entry_mode}}', '{{entry_fee}}', '{{board_url}}'],
    updated_at: new Date().toISOString(),
    body: `Hello {{artist_name}} and {{host_name}},

Track "{{track_title}}" has successfully entered the board battlefield "{{board_title}}".

Entry Overview:
• Track: {{track_title}}
• Artist: {{artist_name}}
• Host Curator: {{host_name}}
• Entry Mode: {{entry_mode}} (\${{entry_fee}})
• Pool Ledger Split: 70% Host/Pool, 30% Platform Protocol

The song is now active on the board leaderboard and open for weighted crowd evaluations.

Inspect the battlefield:
{{board_url}}

SCOFEN Competition Engine`,
  },
  {
    id: 'song_crowd_rated',
    name: 'Song Got a Crowd Rating',
    category: 'Scoring & Ratings',
    triggerDescription: 'Triggered when a verified listener or rater grades an active track on a board.',
    subject: 'Rating Received: "{{track_title}}" Scored {{score}} by {{rater_name}}',
    preheader: 'New crowd scorecard recorded on Scofen ledger.',
    recipientDescription: 'Track Owner ({{artist_email}})',
    enabled: true,
    variables: ['{{artist_name}}', '{{track_title}}', '{{board_title}}', '{{rater_name}}', '{{score}}', '{{crowd_average}}', '{{total_ratings}}', '{{track_url}}'],
    updated_at: new Date().toISOString(),
    body: `Hello {{artist_name}},

Your track "{{track_title}}" on board "{{board_title}}" just received a new evaluation.

Scorecard Details:
• Rater: {{rater_name}}
• Raw Scorecard: {{score}} PTS
• Updated Crowd Rating: {{crowd_average}} PTS ({{total_ratings}} total raters)

All raters are mathematically weighted by their Influence Points. The crowd average represents 50% of the final combined score upon curator finalization.

Track your ranking:
{{track_url}}

SCOFEN Curation Dynamics`,
  },
  {
    id: 'song_curator_rated',
    name: 'Song Rated by the Host Curator',
    category: 'Scoring & Ratings',
    triggerDescription: 'Triggered when the board host grades a song, permanently locking all ratings and finalizing the 50:50 score.',
    subject: 'Finalized: Curator Evaluation for "{{track_title}}" on "{{board_title}}"',
    preheader: 'Host evaluation complete. 50:50 score permanently locked.',
    recipientDescription: 'Artist ({{artist_email}}) & Contributing Raters',
    enabled: true,
    variables: ['{{artist_name}}', '{{host_name}}', '{{track_title}}', '{{board_title}}', '{{curator_score}}', '{{crowd_score}}', '{{final_combined_score}}', '{{track_url}}'],
    updated_at: new Date().toISOString(),
    body: `Hello {{artist_name}},

Board host {{host_name}} has completed the official curator evaluation for "{{track_title}}" on "{{board_title}}".

Final Score Breakdown (Strict 50:50 Split):
• Curator Score: {{curator_score}} PTS (50% weight)
• Crowd Score: {{crowd_score}} PTS (50% weight)
• Final Combined Score: {{final_combined_score}} PTS

Rating Lock Notice: This track is now permanently finalized and locked. No further rating modifications can be executed. Rater influence gains and penalties have been calibrated.

Review your official song profile:
{{track_url}}

SCOFEN Scoring Authority`,
  },
  {
    id: 'influence_delta',
    name: 'Influence Point Up or Down Notification',
    category: 'Influence & Reputation',
    triggerDescription: 'Triggered when a user earns +1 consensus reward or receives -1 absolute extreme penalty upon song finalization.',
    subject: 'Authority Ledger Shift: {{point_delta}} PTS (New Balance: {{new_total}} PTS)',
    preheader: 'Consensus calculation executed on your recent rating.',
    recipientDescription: 'Rater ({{user_email}})',
    enabled: true,
    variables: ['{{user_name}}', '{{point_delta}}', '{{new_total}}', '{{reason}}', '{{track_title}}', '{{final_score}}', '{{dashboard_url}}'],
    updated_at: new Date().toISOString(),
    body: `Hello {{user_name}},

A consensus calibration has been executed on the Scofen Influence Ledger following the finalization of "{{track_title}}".

Influence Shift:
• Point Delta: {{point_delta}} PTS
• New Authority Index: {{new_total}} PTS
• Determination Reason: {{reason}}

The Scofen Consensus Engine rewards accuracy within 10% of the raw unweighted consensus baseline (+1 pt) and penalizes extreme outlier distortion >= 25.0 points (-1 pt).

Inspect your influence telemetry:
{{dashboard_url}}

SCOFEN Influence Engine`,
  },
  {
    id: 'streaming_submitted',
    name: 'Song Submitted to Scofen Streaming for Monetization',
    category: 'Monetization & Streaming',
    triggerDescription: 'Triggered when a curator pushes an approved track to the Scofen Global Streaming pipeline.',
    subject: 'Streaming Monetization Pipeline: "{{track_title}}" Approved & Dispatched',
    preheader: 'Your song has advanced to Scofen dual-stream royalty monetization.',
    recipientDescription: 'Artist ({{artist_email}}) & Curator ({{host_email}})',
    enabled: true,
    variables: ['{{artist_name}}', '{{host_name}}', '{{track_title}}', '{{board_title}}', '{{royalty_split}}', '{{stream_url}}'],
    updated_at: new Date().toISOString(),
    body: `Hello {{artist_name}},

Congratulations! Host {{host_name}} has officially submitted "{{track_title}}" from "{{board_title}}" to the Scofen Global Streaming Pipeline.

Distribution & Split Matrix:
• Track: {{track_title}}
• Royalty Allocation: {{royalty_split}}
• Access: Full track master playback unlocked across the producer and curator network

Your streaming ledger account is now active and accumulating streaming royalty units.

Listen and verify streaming status:
{{stream_url}}

SCOFEN Royalty Distribution Protocol`,
  },
  {
    id: 'payment_notification',
    name: 'Payment Notifications of All Kinds',
    category: 'Financial Ledger & Stripe',
    triggerDescription: 'Triggered on financial transactions (Crowd Pool entry $50-$100, Curator Skip fee, Curator Payout).',
    subject: 'Receipt: {{payment_type}} (\${{amount}} USD) - Ledger #{{ledger_id}}',
    preheader: 'Financial ledger entry recorded on Scofen protocol.',
    recipientDescription: 'Payer ({{payer_email}}) & Host ({{payee_email}})',
    enabled: true,
    variables: ['{{payer_name}}', '{{payer_email}}', '{{payee_name}}', '{{amount}}', '{{payment_type}}', '{{host_cut}}', '{{platform_cut}}', '{{ledger_id}}', '{{timestamp}}'],
    updated_at: new Date().toISOString(),
    body: `Hello {{payer_name}},

A financial transaction has been successfully recorded in the Scofen Trust Ledger.

Ledger Summary:
• Transaction Reference: #{{ledger_id}}
• Type: {{payment_type}}
• Gross Amount: \${{amount}} USD
• Host Allocation: \${{host_cut}} USD
• Protocol Cut: \${{platform_cut}} USD
• Timestamp: {{timestamp}}

Payment has been processed via Stripe. Payout splits are held in the board ledger pool and disbursed automatically in accordance with the Scofen economic protocol.

Review ledger audit:
https://scofen.com/ledger

SCOFEN Financial Clearinghouse`,
  },
  {
    id: 'someone_follow_you',
    name: 'Someone Follows You',
    category: 'Social Network & Discovery',
    triggerDescription: 'Triggered when another artist, curator, or listener follows a user profile.',
    subject: 'New Connection: {{follower_name}} is now following your catalog',
    preheader: '{{follower_name}} started following you on Scofen.',
    recipientDescription: 'Followed Creator ({{followed_email}})',
    enabled: true,
    variables: ['{{followed_name}}', '{{follower_name}}', '{{follower_role}}', '{{follower_influence}}', '{{follower_profile_url}}'],
    updated_at: new Date().toISOString(),
    body: `Hello {{followed_name}},

{{follower_name}} ({{follower_role}} • {{follower_influence}} PTS) has started following your artist and curator activity on Scofen.

Your latest track uploads, board entries, and curation ratings will now appear directly in their "What is new" activity feed.

Visit {{follower_name}}'s profile:
{{follower_profile_url}}

SCOFEN Creative Network`,
  },
];
