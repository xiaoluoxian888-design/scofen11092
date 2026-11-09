import dotenv from 'dotenv';
import { Resend } from 'resend';

// Load environment variables with override enabled
dotenv.config({ override: true });

/**
 * SCOFEN Production-Ready Transactional Email System
 * 
 * Brand & Tone Guidelines:
 * - Brand: Scofen (hardcore music industry evaluation & infrastructure platform)
 * - Accent Color: Deep Purple (#6B21A8)
 * - Typography/Body: Dark Charcoal (#111827), Slate Muted (#6B7280)
 * - Canvas: Clean White (#FFFFFF), Surface Card (#F9FAFB), Border (#E5E7EB)
 * - Tone: Direct, professional, authoritative. Zero conversational filler, zero emojis.
 */

// Dynamic client resolver to support runtime .env changes and hot-reloads
export function getResendClient(): { client: Resend | null; apiKey: string; fromEmail: string } {
  dotenv.config({ override: true });
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  const fromEmail = (process.env.RESEND_FROM_EMAIL || 'Scofen <onboarding@resend.dev>').trim();
  const isKeyConfigured = apiKey.startsWith('re_') && !apiKey.includes('your_');

  return {
    client: isKeyConfigured ? new Resend(apiKey) : null,
    apiKey,
    fromEmail,
  };
}

// Default sender address & admin alert
export const DEFAULT_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Scofen <onboarding@resend.dev>';
export const ADMIN_ALERT_EMAIL = process.env.ADMIN_ALERT_EMAIL || 'admin@scofen.com';

// ==========================================
// TYPESCRIPT PAYLOAD INTERFACES
// ==========================================

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
}

export interface EmailDispatchResult {
  success: boolean;
  messageId?: string;
  error?: string;
  isSimulated?: boolean;
  timestamp: string;
  recipient: string;
  subject: string;
}

// 1. Account & Authentication Payloads
export interface WelcomeEmailPayload {
  to: string;
  name: string;
  role: 'Artist' | 'Curator' | 'Host' | 'Listener';
  dashboardUrl?: string;
}

export interface PasswordResetEmailPayload {
  to: string;
  name: string;
  resetUrl: string;
  expiresInMinutes?: number;
}

// 2. Music Submission & Payment Receipt Payload
export interface SubmissionReceiptPayload {
  to: string;
  artistName: string;
  trackTitle: string;
  boardTitle: string;
  hostName: string;
  amountPaid: number;
  transactionId: string;
  statusUrl: string;
  entryMode?: 'Crowd Pool' | 'Curator Skip';
}

// 3. Submission Status Update Payload
export interface SubmissionResultPayload {
  to: string;
  artistName: string;
  trackTitle: string;
  boardTitle: string;
  finalScore: number;
  placement?: string | number;
  boardStandingsUrl: string;
}

// 4. Host/Curator Board Launch Payload
export interface BoardPublishedPayload {
  to: string;
  hostName: string;
  boardTitle: string;
  entryFee: number;
  boardUrl: string;
  genre?: string;
}

// 5. Host Payout Notification Payload
export interface HostPayoutPayload {
  to: string;
  hostName: string;
  boardTitle: string;
  grossRevenue: number;
  platformFee: number; // 30%
  netPayout: number;    // 70%
  bankArrivalWindow?: string;
  payoutReferenceId: string;
}

// 6. Stripe Dispute / Chargeback Alert Payload (Internal)
export interface DisputeAlertPayload {
  userEmail: string;
  submissionId: string;
  disputedAmount: number;
  currency?: string;
  reason: string;
  stripeDisputeUrl: string;
}

// ==========================================
// BASE HTML EMAIL TEMPLATE BUILDER
// ==========================================

interface BaseTemplateProps {
  preheader: string;
  heading: string;
  subheading?: string;
  contentHtml: string;
  ctaButton?: {
    label: string;
    url: string;
  };
}

function buildBaseEmailHtml({ preheader, heading, subheading, contentHtml, ctaButton }: BaseTemplateProps): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${heading}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #F3F4F6;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #111827;
      -webkit-font-smoothing: antialiased;
    }
    table {
      border-collapse: collapse;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111827;">
  <!-- Preheader text for inbox preview -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; color: #F3F4F6;">
    ${preheader}
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F3F4F6; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 6px; overflow: hidden; text-align: left;">
          
          <!-- Brand Header -->
          <tr>
            <td style="padding: 28px 36px 20px 36px; border-bottom: 1px solid #E5E7EB;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span style="font-family: monospace; font-size: 16px; font-weight: 800; letter-spacing: 0.15em; color: #111827; text-transform: uppercase;">
                      SCOFEN
                    </span>
                    <span style="display: inline-block; width: 6px; height: 6px; background-color: #6B21A8; border-radius: 50%; margin-left: 6px; vertical-align: middle;"></span>
                  </td>
                  <td align="right" style="font-family: monospace; font-size: 11px; text-transform: uppercase; color: #6B7280; letter-spacing: 0.05em;">
                    Protocol Infrastructure
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Heading Area -->
          <tr>
            <td style="padding: 32px 36px 8px 36px;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; line-height: 1.3; color: #111827; letter-spacing: -0.01em;">
                ${heading}
              </h1>
              ${subheading ? `
              <p style="margin: 6px 0 0 0; font-size: 13px; color: #6B7280; line-height: 1.5;">
                ${subheading}
              </p>` : ''}
            </td>
          </tr>

          <!-- Dynamic Body Content -->
          <tr>
            <td style="padding: 16px 36px 28px 36px; font-size: 14px; line-height: 1.6; color: #374151;">
              ${contentHtml}

              <!-- Call To Action Button -->
              ${ctaButton ? `
              <div style="margin-top: 32px; padding-top: 8px;">
                <a href="${ctaButton.url}" target="_blank" style="display: inline-block; background-color: #6B21A8; color: #FFFFFF; font-size: 13px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 4px; letter-spacing: 0.02em;">
                  ${ctaButton.label} &rarr;
                </a>
              </div>` : ''}
            </td>
          </tr>

          <!-- Formal Ledger Footer -->
          <tr>
            <td style="padding: 24px 36px; background-color: #F9FAFB; border-top: 1px solid #E5E7EB; font-size: 11px; line-height: 1.5; color: #6B7280;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <div style="font-weight: 600; color: #374151; font-family: monospace; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">
                      SCOFEN Music Platform
                    </div>
                    <div>
                      Decentralized multi-criteria evaluation infrastructure and trust ledger.
                    </div>
                    <div style="margin-top: 6px; color: #9CA3AF;">
                      All entries, evaluations, and payouts are immutable ledger events.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ==========================================
// CENTRALIZED RESEND DISPATCH WRAPPER
// ==========================================

export async function sendEmail({
  to,
  subject,
  html,
  from,
  replyTo,
  tags = [],
}: SendEmailOptions): Promise<EmailDispatchResult> {
  const recipient = Array.isArray(to) ? to.join(', ') : to;
  const timestamp = new Date().toISOString();
  const { client, apiKey, fromEmail } = getResendClient();
  const activeFrom = from || fromEmail || 'Scofen <onboarding@resend.dev>';

  // 1. Live Resend API Dispatch
  if (client) {
    try {
      let response = await client.emails.send({
        from: activeFrom,
        to,
        subject,
        html,
        replyTo,
        tags,
      });

      // If failed due to unverified custom domain, gracefully retry once with default onboarding@resend.dev
      if (response.error && response.error.message && response.error.message.toLowerCase().includes('domain') && !activeFrom.includes('onboarding@resend.dev')) {
        console.warn('[Resend Domain Warning] Unverified custom domain detected, attempting delivery via onboarding@resend.dev...');
        response = await client.emails.send({
          from: 'Scofen <onboarding@resend.dev>',
          to,
          subject,
          html,
          replyTo,
          tags,
        });
      }

      if (response.error) {
        console.error('[Resend Error]', {
          timestamp,
          to: recipient,
          subject,
          error: response.error,
        });
        return {
          success: false,
          error: `${response.error.message} (Note: Unverified Resend domains can only send to your account email address via onboarding@resend.dev)`,
          recipient,
          subject,
          timestamp,
        };
      }

      console.log('[Resend Delivered]', {
        timestamp,
        messageId: response.data?.id,
        to: recipient,
        subject,
      });

      return {
        success: true,
        messageId: response.data?.id,
        recipient,
        subject,
        timestamp,
        isSimulated: false,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown network failure';
      console.error('[Resend Exception]', {
        timestamp,
        to: recipient,
        subject,
        error: errorMsg,
      });
      return {
        success: false,
        error: errorMsg,
        recipient,
        subject,
        timestamp,
      };
    }
  }

  // 2. Sandbox Simulation Mode (Key not configured)
  const simulatedId = `resend_sim_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const errorNotice = 'RESEND_API_KEY is not configured in .env. Live email was NOT sent to inbox. Please provide your Resend API key (re_...) to activate live email delivery.';
  console.warn('[Resend Sandbox Simulated - Key Unset]', {
    timestamp,
    simulatedId,
    from: activeFrom,
    to: recipient,
    subject,
    notice: errorNotice,
  });

  return {
    success: false,
    error: errorNotice,
    messageId: simulatedId,
    isSimulated: true,
    recipient,
    subject,
    timestamp,
  };
}

// ==========================================
// 7 CORE TRANSACTIONAL EMAIL TRIGGERS
// ==========================================

/**
 * 1A. Account Welcome Email
 * Confirms registration with direct role differentiation and single CTA.
 */
export async function sendWelcomeEmail(payload: WelcomeEmailPayload): Promise<EmailDispatchResult> {
  const { to, name, role, dashboardUrl = 'https://scofen.com/dashboard' } = payload;
  const isHost = role === 'Curator' || role === 'Host';

  const contentHtml = `
    <p style="margin: 0 0 16px 0;">
      Hello ${name},
    </p>
    <p style="margin: 0 0 16px 0;">
      Your account registration on the Scofen protocol has been verified and provisioned.
    </p>
    <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 4px; padding: 16px; margin: 20px 0;">
      <table width="100%" cellpadding="4" cellspacing="0" border="0" style="font-size: 13px;">
        <tr>
          <td style="color: #6B7280; width: 140px;">Registered Identifier:</td>
          <td style="color: #111827; font-weight: 600; font-family: monospace;">${to}</td>
        </tr>
        <tr>
          <td style="color: #6B7280;">Account Authority Role:</td>
          <td style="color: #6B21A8; font-weight: 700;">${role}</td>
        </tr>
        <tr>
          <td style="color: #6B7280;">Baseline Authority:</td>
          <td style="color: #111827; font-weight: 600;">1 Influence Point</td>
        </tr>
      </table>
    </div>
    <p style="margin: 0 0 16px 0;">
      ${isHost
        ? 'As a Host/Curator, you have authority to establish genre-specific evaluation boards, configure multi-criteria grading matrices, and evaluate submissions with sovereign 70% revenue retention.'
        : 'As an Artist, you can enter tracks into live curator boards via the $5.00 Crowd Pool or direct Curator Skip, receive weighted evaluations, and qualify for global streaming monetization.'
      }
    </p>
    <p style="margin: 0;">
      Access your account terminal below to review live boards and active submissions.
    </p>
  `;

  const html = buildBaseEmailHtml({
    preheader: `Your Scofen ${role} account has been confirmed.`,
    heading: `Account Provisioned: ${role}`,
    subheading: 'Decentralized Music Evaluation Infrastructure',
    contentHtml,
    ctaButton: {
      label: 'Open Dashboard Terminal',
      url: dashboardUrl,
    },
  });

  return sendEmail({
    to,
    subject: `Scofen Account Provisioned: ${name} (${role})`,
    html,
    tags: [{ name: 'event', value: 'account_welcome' }],
  });
}

/**
 * 1B. Password Reset Email
 * Secure credential reset link with clear 1-hour expiration notice.
 */
export async function sendPasswordResetEmail(payload: PasswordResetEmailPayload): Promise<EmailDispatchResult> {
  const { to, name, resetUrl, expiresInMinutes = 60 } = payload;

  const contentHtml = `
    <p style="margin: 0 0 16px 0;">
      Hello ${name},
    </p>
    <p style="margin: 0 0 16px 0;">
      A request has been authorized to reset the authentication credentials associated with <strong>${to}</strong>.
    </p>
    <div style="background-color: #FEF3C7; border: 1px solid #FDE68A; border-radius: 4px; padding: 14px 16px; margin: 20px 0; font-size: 12px; color: #92400E;">
      <strong>Security Notice:</strong> This authorization link is single-use and will expire in <strong>${expiresInMinutes} minutes</strong>. If you did not initiate this request, your account remains secured and no action is required.
    </div>
    <p style="margin: 0 0 8px 0;">
      Click the button below to specify new credentials:
    </p>
  `;

  const html = buildBaseEmailHtml({
    preheader: `Security authorization: Password reset request for ${to}. Valid for ${expiresInMinutes} minutes.`,
    heading: 'Credential Reset Authorization',
    subheading: 'Account Security Protocol',
    contentHtml,
    ctaButton: {
      label: 'Reset Account Credentials',
      url: resetUrl,
    },
  });

  return sendEmail({
    to,
    subject: `Security Alert: Scofen Credential Reset Request`,
    html,
    tags: [{ name: 'event', value: 'password_reset' }],
  });
}

/**
 * 2. Music Submission & Payment Receipt
 * Triggered via Stripe webhook upon successful submission payment.
 */
export async function sendSubmissionReceiptEmail(payload: SubmissionReceiptPayload): Promise<EmailDispatchResult> {
  const {
    to,
    artistName,
    trackTitle,
    boardTitle,
    hostName,
    amountPaid,
    transactionId,
    statusUrl,
    entryMode = 'Crowd Pool',
  } = payload;

  const contentHtml = `
    <p style="margin: 0 0 16px 0;">
      Hello ${artistName},
    </p>
    <p style="margin: 0 0 16px 0;">
      Payment receipt confirmed. Your track has officially entered the evaluation ledger for board <strong>${boardTitle}</strong>.
    </p>
    <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 4px; padding: 16px; margin: 20px 0;">
      <table width="100%" cellpadding="6" cellspacing="0" border="0" style="font-size: 13px;">
        <tr>
          <td style="color: #6B7280; width: 140px;">Track Title:</td>
          <td style="color: #111827; font-weight: 700;">${trackTitle}</td>
        </tr>
        <tr>
          <td style="color: #6B7280;">Board Battlefield:</td>
          <td style="color: #111827; font-weight: 600;">${boardTitle}</td>
        </tr>
        <tr>
          <td style="color: #6B7280;">Host Curator:</td>
          <td style="color: #111827;">${hostName}</td>
        </tr>
        <tr>
          <td style="color: #6B7280;">Entry Mode:</td>
          <td style="color: #6B21A8; font-weight: 600;">${entryMode}</td>
        </tr>
        <tr>
          <td style="color: #6B7280;">Amount Paid:</td>
          <td style="color: #111827; font-weight: 700;">$${amountPaid.toFixed(2)} USD</td>
        </tr>
        <tr>
          <td style="color: #6B7280;">Stripe Reference:</td>
          <td style="color: #374151; font-family: monospace; font-size: 12px;">${transactionId}</td>
        </tr>
      </table>
    </div>
    <p style="margin: 0 0 16px 0;">
      Economic Allocation: 70% of entry funds are credited directly to the board ledger, and 30% funds discovery infrastructure.
    </p>
    <p style="margin: 0;">
      You can inspect live crowd evaluations, score convergence, and board standings at any time.
    </p>
  `;

  const html = buildBaseEmailHtml({
    preheader: `Payment Receipt: $${amountPaid.toFixed(2)} USD for track "${trackTitle}" on "${boardTitle}".`,
    heading: 'Submission Payment Confirmed',
    subheading: `Transaction ID: ${transactionId}`,
    contentHtml,
    ctaButton: {
      label: 'Track Submission Status',
      url: statusUrl,
    },
  });

  return sendEmail({
    to,
    subject: `Receipt: Entry Confirmed for "${trackTitle}" ($${amountPaid.toFixed(2)} USD)`,
    html,
    tags: [{ name: 'event', value: 'submission_receipt' }],
  });
}

/**
 * 3. Submission Status Update (Purely Numerical Score)
 * Triggered when a track completes evaluation/scoring on a board.
 */
export async function sendSubmissionResultEmail(payload: SubmissionResultPayload): Promise<EmailDispatchResult> {
  const {
    to,
    artistName,
    trackTitle,
    boardTitle,
    finalScore,
    placement,
    boardStandingsUrl,
  } = payload;

  const contentHtml = `
    <p style="margin: 0 0 16px 0;">
      Hello ${artistName},
    </p>
    <p style="margin: 0 0 16px 0;">
      Evaluation complete. The multi-criteria evaluation for <strong>"${trackTitle}"</strong> on <strong>${boardTitle}</strong> has finalized and locked.
    </p>
    <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 4px; padding: 24px; margin: 24px 0; text-align: center;">
      <div style="font-size: 11px; font-family: monospace; text-transform: uppercase; letter-spacing: 0.1em; color: #6B7280;">
        Official Numerical Score
      </div>
      <div style="font-size: 44px; font-weight: 800; color: #6B21A8; line-height: 1.1; margin: 8px 0;">
        ${finalScore.toFixed(1)} <span style="font-size: 18px; font-weight: 500; color: #9CA3AF;">/ 100</span>
      </div>
      ${placement ? `
      <div style="font-size: 13px; font-weight: 600; color: #111827; margin-top: 6px;">
        Leaderboard Placement: #${placement}
      </div>` : ''}
      <div style="font-size: 11px; color: #6B7280; margin-top: 8px;">
        Enforced 50:50 weight split between Curator and Crowd baseline.
      </div>
    </div>
    <p style="margin: 0 0 16px 0;">
      Note: Scofen evaluations are strictly numerical and mathematical. Scores are calculated through host rubrics and weighted crowd consensus without subjective prose.
    </p>
    <p style="margin: 0;">
      Review the finalized board standings and rank distribution below.
    </p>
  `;

  const html = buildBaseEmailHtml({
    preheader: `Evaluation Finalized: "${trackTitle}" scored ${finalScore.toFixed(1)}/100 on ${boardTitle}.`,
    heading: 'Evaluation Score Finalized',
    subheading: 'Numerical Scorecard Locked on Platform Ledger',
    contentHtml,
    ctaButton: {
      label: 'View Board Standings',
      url: boardStandingsUrl,
    },
  });

  return sendEmail({
    to,
    subject: `Score Released: "${trackTitle}" Scored ${finalScore.toFixed(1)} on ${boardTitle}`,
    html,
    tags: [{ name: 'event', value: 'submission_result' }],
  });
}

/**
 * 4. Host/Curator Board Launch
 * Triggered when a Host successfully establishes and publishes a new board.
 */
export async function sendBoardPublishedEmail(payload: BoardPublishedPayload): Promise<EmailDispatchResult> {
  const { to, hostName, boardTitle, entryFee, boardUrl, genre = 'Hybrid / Multigenre' } = payload;

  const contentHtml = `
    <p style="margin: 0 0 16px 0;">
      Hello ${hostName},
    </p>
    <p style="margin: 0 0 16px 0;">
      Your curator battlefield board <strong>"${boardTitle}"</strong> is live on the Scofen discovery network.
    </p>
    <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 4px; padding: 16px; margin: 20px 0;">
      <table width="100%" cellpadding="6" cellspacing="0" border="0" style="font-size: 13px;">
        <tr>
          <td style="color: #6B7280; width: 140px;">Board Title:</td>
          <td style="color: #111827; font-weight: 700;">${boardTitle}</td>
        </tr>
        <tr>
          <td style="color: #6B7280;">Genre / Domain:</td>
          <td style="color: #111827;">${genre}</td>
        </tr>
        <tr>
          <td style="color: #6B7280;">Curator Entry Fee:</td>
          <td style="color: #111827; font-weight: 700;">$${entryFee.toFixed(2)} USD</td>
        </tr>
        <tr>
          <td style="color: #6B7280;">Sovereign Revenue Split:</td>
          <td style="color: #6B21A8; font-weight: 700;">70% Host / 30% Platform Infrastructure</td>
        </tr>
      </table>
    </div>
    <div style="background-color: #F3F4F6; border-left: 3px solid #6B21A8; padding: 12px 16px; margin: 20px 0; font-size: 12px; color: #374151;">
      <strong>Revenue Model Reminder:</strong> As the board host, you retain <strong>70%</strong> of every audition fee paid to this board. Payouts accumulate in your board ledger and disburse automatically upon evaluation completion.
    </div>
    <p style="margin: 0;">
      Share your board URL directly with recording artists and communities to begin receiving submissions:
    </p>
  `;

  const html = buildBaseEmailHtml({
    preheader: `Your curator board "${boardTitle}" is live. Host retains 70% of all audition fees.`,
    heading: 'Curator Board Deployed',
    subheading: 'Platform Discovery Network',
    contentHtml,
    ctaButton: {
      label: 'Open Board Management',
      url: boardUrl,
    },
  });

  return sendEmail({
    to,
    subject: `Board Live: "${boardTitle}" Deployed on Scofen`,
    html,
    tags: [{ name: 'event', value: 'board_published' }],
  });
}

/**
 * 5. Host Payout Notification
 * Triggered when funds are disbursed to a Host via Stripe Connect.
 */
export async function sendHostPayoutEmail(payload: HostPayoutPayload): Promise<EmailDispatchResult> {
  const {
    to,
    hostName,
    boardTitle,
    grossRevenue,
    platformFee,
    netPayout,
    bankArrivalWindow = '1-2 business days',
    payoutReferenceId,
  } = payload;

  const contentHtml = `
    <p style="margin: 0 0 16px 0;">
      Hello ${hostName},
    </p>
    <p style="margin: 0 0 16px 0;">
      A payout transfer has been executed to your connected bank account via Stripe Connect for curation labor on <strong>${boardTitle}</strong>.
    </p>
    <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 4px; padding: 16px; margin: 20px 0;">
      <table width="100%" cellpadding="6" cellspacing="0" border="0" style="font-size: 13px;">
        <tr>
          <td style="color: #6B7280; width: 160px;">Gross Entry Revenue:</td>
          <td style="color: #111827; font-weight: 600;">$${grossRevenue.toFixed(2)} USD</td>
        </tr>
        <tr>
          <td style="color: #6B7280;">Platform Cut (30%):</td>
          <td style="color: #DC2626;">-$${platformFee.toFixed(2)} USD</td>
        </tr>
        <tr>
          <td style="color: #6B7280;">Net Host Payout (70%):</td>
          <td style="color: #6B21A8; font-weight: 800; font-size: 16px;">+$${netPayout.toFixed(2)} USD</td>
        </tr>
        <tr>
          <td style="color: #6B7280;">Bank Arrival Window:</td>
          <td style="color: #111827;">${bankArrivalWindow}</td>
        </tr>
        <tr>
          <td style="color: #6B7280;">Transfer Reference:</td>
          <td style="color: #374151; font-family: monospace; font-size: 12px;">${payoutReferenceId}</td>
        </tr>
      </table>
    </div>
    <p style="margin: 0 0 8px 0;">
      This payout reflects finalized track evaluations on your board. You can review complete accounting history on your platform ledger.
    </p>
  `;

  const html = buildBaseEmailHtml({
    preheader: `Stripe Payout: +$${netPayout.toFixed(2)} USD transferred for board ${boardTitle}.`,
    heading: 'Curator Payout Disbursed',
    subheading: `Transfer Reference: ${payoutReferenceId}`,
    contentHtml,
    ctaButton: {
      label: 'View Financial Ledger',
      url: 'https://scofen.com/dashboard?tab=financials',
    },
  });

  return sendEmail({
    to,
    subject: `Stripe Payout Disbursed: $${netPayout.toFixed(2)} USD (${boardTitle})`,
    html,
    tags: [{ name: 'event', value: 'host_payout' }],
  });
}

/**
 * 6. Stripe Dispute / Chargeback Alert (Internal Admin Alert)
 * Triggered on Stripe charge.dispute.created webhook.
 */
export async function sendDisputeAlertEmail(payload: DisputeAlertPayload): Promise<EmailDispatchResult> {
  const {
    userEmail,
    submissionId,
    disputedAmount,
    currency = 'USD',
    reason,
    stripeDisputeUrl,
  } = payload;

  const contentHtml = `
    <p style="margin: 0 0 16px 0; color: #DC2626; font-weight: 700;">
      URGENT: A formal payment dispute / chargeback has been filed via Stripe.
    </p>
    <div style="background-color: #FEF2F2; border: 1px solid #FCA5A5; border-radius: 4px; padding: 16px; margin: 20px 0;">
      <table width="100%" cellpadding="6" cellspacing="0" border="0" style="font-size: 13px;">
        <tr>
          <td style="color: #991B1B; font-weight: 600; width: 140px;">Disputed Amount:</td>
          <td style="color: #991B1B; font-weight: 800; font-size: 16px;">$${disputedAmount.toFixed(2)} ${currency.toUpperCase()}</td>
        </tr>
        <tr>
          <td style="color: #6B7280;">User Email:</td>
          <td style="color: #111827; font-weight: 600; font-family: monospace;">${userEmail}</td>
        </tr>
        <tr>
          <td style="color: #6B7280;">Submission ID:</td>
          <td style="color: #111827; font-family: monospace;">${submissionId}</td>
        </tr>
        <tr>
          <td style="color: #6B7280;">Stripe Reason:</td>
          <td style="color: #111827; font-weight: 600;">${reason}</td>
        </tr>
        <tr>
          <td style="color: #6B7280;">Timestamp:</td>
          <td style="color: #374151; font-family: monospace;">${new Date().toISOString()}</td>
        </tr>
      </table>
    </div>
    <p style="margin: 0 0 16px 0;">
      Action Required: Access the Stripe Dashboard immediately to review cardholder evidence requirements, submit counter-evidence, or accept the dispute before deadline.
    </p>
  `;

  const html = buildBaseEmailHtml({
    preheader: `URGENT DISPUTE ALERT: $${disputedAmount.toFixed(2)} chargeback filed by ${userEmail}.`,
    heading: 'Stripe Dispute Notice (Chargeback)',
    subheading: `Submission: ${submissionId}`,
    contentHtml,
    ctaButton: {
      label: 'Open Stripe Dispute Page',
      url: stripeDisputeUrl,
    },
  });

  return sendEmail({
    to: ADMIN_ALERT_EMAIL,
    subject: `[ACTION REQUIRED] Stripe Dispute Created: $${disputedAmount.toFixed(2)} by ${userEmail}`,
    html,
    tags: [{ name: 'event', value: 'stripe_dispute' }],
  });
}
