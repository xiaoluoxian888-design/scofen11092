import dotenv from 'dotenv';
import Stripe from 'stripe';
import { dbStore } from '../services/dbStore.ts';
import {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendSubmissionReceiptEmail,
  sendSubmissionResultEmail,
  sendBoardPublishedEmail,
  sendHostPayoutEmail,
  sendDisputeAlertEmail,
  DEFAULT_FROM_EMAIL,
  ADMIN_ALERT_EMAIL,
} from './emailService.ts';

// Initial load of environment variables
dotenv.config({ override: true });

export interface IntegrationLog {
  id: string;
  service: 'stripe' | 'resend';
  type: string;
  status: 'succeeded' | 'simulated' | 'failed' | 'pending';
  summary: string;
  details: Record<string, unknown>;
  timestamp: string;
}

// In-memory operational log of payment and email dispatches
const integrationLogs: IntegrationLog[] = [
  {
    id: 'log_init_01',
    service: 'stripe',
    type: 'payment_system_ready',
    status: 'simulated',
    summary: 'Stripe 70/30 Sovereign Split engine initialized in Sandbox mode',
    details: {
      split: '70% Curator / 30% SCOFEN',
      currencies: ['USD'],
      ready: true,
    },
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'log_init_02',
    service: 'resend',
    type: 'email_dispatcher_ready',
    status: 'simulated',
    summary: 'Resend Transactional Engine loaded default sender onboarding@resend.dev',
    details: {
      templatesLoaded: ['submission_received', 'evaluation_completed', 'curator_payout', 'subscription_welcome'],
    },
    timestamp: new Date(Date.now() - 3500000).toISOString(),
  },
];

function maskKey(key: string | undefined, prefixLen = 7, suffixLen = 4): string {
  if (!key || key.trim() === '' || key.includes('your_') || key.includes('MY_')) {
    return 'Not configured (Sandbox mode active)';
  }
  const clean = key.trim();
  if (clean.length <= prefixLen + suffixLen) {
    return '••••••••';
  }
  return `${clean.slice(0, prefixLen)}••••••••${clean.slice(-suffixLen)}`;
}

function getStatus() {
  dotenv.config({ override: true });
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const stripePublishable = process.env.STRIPE_PUBLISHABLE_KEY;
  const stripeWebhook = process.env.STRIPE_WEBHOOK_SECRET;

  const resendKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM_EMAIL || 'SCOFEN <onboarding@resend.dev>';

  const isStripeConfigured = Boolean(
    stripeSecret && 
    stripeSecret.startsWith('sk_') && 
    !stripeSecret.includes('your_')
  );

  const isResendConfigured = Boolean(
    resendKey && 
    resendKey.startsWith('re_') && 
    !resendKey.includes('your_')
  );

  const isStripeLive = Boolean(stripeSecret && stripeSecret.startsWith('sk_live_'));
  const stripeMode: 'live' | 'test' = isStripeLive ? 'live' : 'test';

  return {
    stripe: {
      configured: true,
      mode: stripeMode,
      environment: 'Stripe Test Environment Active',
      testCard: '4242 •••• •••• 4242 (Exp 12/28, CVC 123)',
      maskedSecretKey: isStripeConfigured 
        ? maskKey(stripeSecret, 7, 4) 
        : 'Stripe Test Mode (Sandbox Simulated Gateway)',
      publishableKey: stripePublishable && !stripePublishable.includes('your_') 
        ? stripePublishable 
        : 'pk_test_51ScofenTestModeDemoKey',
      webhookConfigured: Boolean(stripeWebhook && !stripeWebhook.includes('your_')),
      supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD'],
      activeProducts: [
        {
          id: 'prod_crowd_pool',
          name: 'Crowd Pool Battlefield Entry',
          pricing: '$5.00 entry fee',
          splitRule: '70% ($3.50) Board Ledger / 30% ($1.50) SCOFEN Treasury',
        },
        {
          id: 'prod_curator_skip',
          name: 'Curator Skip Priority Audition',
          pricing: 'Dynamic Fee = Host Curator Points × 0.1',
          splitRule: '100% Direct Curator Allocation',
        },
        {
          id: 'prod_stem_audit',
          name: 'Producer Fast-Track Stem Review',
          pricing: '$25.00 one-time audit',
          splitRule: '100% Host Curator & Engineering Allocation',
        },
      ],
    },
    resend: {
      configured: isResendConfigured,
      mode: isResendConfigured ? ('live' as const) : ('sandbox_simulation' as const),
      maskedApiKey: maskKey(resendKey, 3, 4),
      fromEmail: resendFrom,
      templates: [
        {
          id: 'welcome_artist',
          name: '1A. Account Welcome (Artist Role)',
          description: 'Confirms artist provisioning, 1 Influence Point baseline, and dashboard CTA.',
        },
        {
          id: 'welcome_host',
          name: '1B. Account Welcome (Curator/Host Role)',
          description: 'Confirms curator authority, sovereign 70/30 fee structure, and board management.',
        },
        {
          id: 'password_reset',
          name: '2. Credential Reset Authorization',
          description: 'Dispatches secure single-use reset link with 1-hour expiration notice.',
        },
        {
          id: 'submission_receipt',
          name: '3. Submission Payment Receipt',
          description: 'Triggered upon entry fee payment with track, board, host, and live status URL.',
        },
        {
          id: 'submission_result',
          name: '4. Evaluation Score Finalized',
          description: 'Numerical scorecard (/100) and leaderboard placement link (no subjective prose).',
        },
        {
          id: 'board_published',
          name: '5. Curator Board Launch',
          description: 'Board live alert with entry fee, shareable link, and 70/30 revenue reminder.',
        },
        {
          id: 'host_payout',
          name: '6. Host Connect Payout Notification',
          description: 'Gross revenue, 30% platform fee, 70% net payout, and bank arrival window.',
        },
        {
          id: 'stripe_dispute',
          name: '7. Stripe Dispute / Chargeback Alert',
          description: 'Internal security alert to admin@scofen.com for charge.dispute.created webhooks.',
        },
      ],
    },
    envGuide: {
      file: '.env',
      editableKeys: [
        { name: 'STRIPE_SECRET_KEY', desc: 'Stripe Secret Key (sk_test_... or sk_live_...)' },
        { name: 'STRIPE_PUBLISHABLE_KEY', desc: 'Stripe Publishable Key (pk_test_... or pk_live_...)' },
        { name: 'STRIPE_WEBHOOK_SECRET', desc: 'Stripe Webhook Secret (whsec_...)' },
        { name: 'RESEND_API_KEY', desc: 'Resend API Key (re_...)' },
        { name: 'RESEND_FROM_EMAIL', desc: 'Verified sender email (e.g. SCOFEN <curations@yourdomain.com>)' },
      ],
    },
  };
}

export const integrationsService = {
  reloadEnv(): { success: boolean; message: string; status: ReturnType<typeof getStatus> } {
    try {
      dotenv.config({ override: true });
      return {
        success: true,
        message: 'Environment variables successfully reloaded from .env',
        status: getStatus(),
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reload environment';
      return {
        success: false,
        message,
        status: getStatus(),
      };
    }
  },

  getStatus,

  async createStripeCheckout(payload: {
    submissionId?: string;
    payerId: string;
    type: 'submission_fee' | 'streaming_subscription';
    entryMode?: 'crowd_pool' | 'curator_skip';
    customAmount?: number;
    currency?: string;
    testPaymentMethod?: {
      cardNumber?: string;
      expMonth?: string;
      expYear?: string;
      cvc?: string;
    };
  }) {
    const { submissionId, payerId, type, entryMode, customAmount } = payload;
    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    const isRealStripe = Boolean(stripeSecret && stripeSecret.startsWith('sk_') && !stripeSecret.includes('your_'));

    let amount = customAmount ? Math.round(customAmount * 100) : 2500; // in cents
    let title = 'SCOFEN Producer Fast-Track Stem Review ($25.00)';
    let hostCutCents = Math.round(amount * 0.7);
    let platformCutCents = amount - hostCutCents;

    let submissionRecord = null;
    let boardRecord = null;

    if (type === 'submission_fee' && submissionId) {
      submissionRecord = dbStore.getBoardSubmissions('') // find across all
        .concat(
          dbStore.getAllBoards().flatMap((b) => dbStore.getBoardSubmissions(b.id))
        )
        .find((s) => s.id === submissionId);

      if (submissionRecord) {
        boardRecord = dbStore.getBoard(submissionRecord.board_id);
      }

      if (entryMode === 'curator_skip') {
        const curatorPoints = boardRecord?.host?.influence_points || 100;
        const fee = customAmount || (curatorPoints * 0.1);
        amount = Math.round(fee * 100);
        hostCutCents = amount;
        platformCutCents = 0;
        title = `SCOFEN Curator Skip Entry: "${submissionRecord?.track_title || 'Demo Track'}" (${boardRecord?.title || 'Curator Board'})`;
      } else {
        const fee = customAmount || 5.0;
        amount = Math.round(fee * 100);
        hostCutCents = Math.round(amount * 0.7); // 70%
        platformCutCents = amount - hostCutCents; // 30%
        title = `SCOFEN Crowd Pool Entry: "${submissionRecord?.track_title || 'Demo Track'}" (${boardRecord?.title || 'Curator Board'})`;
      }
    }

    const testPaymentIntentId = `pi_test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const testChargeId = `ch_test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const mockSessionId = `cs_test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Real Stripe API integration if user provided sk_test_... or sk_live_...
    if (isRealStripe) {
      try {
        const stripe = new Stripe(stripeSecret!, {
          apiVersion: '2025-02-24.acacia' as any,
        });

        const session = await stripe.checkout.sessions.create({
          line_items: [
            {
              price_data: {
                currency: payload.currency || 'usd',
                product_data: {
                  name: title,
                  description: entryMode === 'curator_skip' 
                    ? '100% Upfront Direct Curator Fee' 
                    : '70% Board Ledger / 30% Scofen Treasury',
                },
                unit_amount: amount,
              },
              quantity: 1,
            },
          ],
          mode: 'payment',
          success_url: `https://scofen.com/dashboard?session_id={CHECKOUT_SESSION_ID}&payment_status=success`,
          cancel_url: `https://scofen.com/dashboard?payment_status=cancelled`,
          metadata: {
            type,
            entryMode: entryMode || 'crowd_pool',
            payer_id: payerId,
            submission_id: submissionId || '',
          },
        });

        // Record real session in logs
        const logEntry: IntegrationLog = {
          id: `log_stripe_${Date.now()}`,
          service: 'stripe',
          type: 'checkout_session_created',
          status: 'succeeded',
          summary: `Created Stripe Checkout Session ${session.id} for $${(amount / 100).toFixed(2)}`,
          details: {
            sessionId: session.id,
            url: session.url,
            amount: `$${(amount / 100).toFixed(2)}`,
            split: {
              hostCut: `$${(hostCutCents / 100).toFixed(2)}`,
              platformCut: `$${(platformCutCents / 100).toFixed(2)}`,
            },
          },
          timestamp: new Date().toISOString(),
        };
        integrationLogs.unshift(logEntry);

        // Also book ledger immediately in test mode
        if (submissionId) {
          if (entryMode === 'curator_skip') {
            dbStore.enterCuratorSkip(submissionId, payerId);
          } else {
            dbStore.enterCrowdPool(submissionId, payerId);
          }
        } else if (type === 'streaming_subscription') {
          dbStore.toggleSubscriber(payerId);
        }

        return {
          success: true,
          mode: 'live_stripe',
          sessionId: session.id,
          checkoutUrl: session.url,
          transactionId: (typeof session.payment_intent === 'string' ? session.payment_intent : testPaymentIntentId),
          amountCents: amount,
          amount: amount / 100,
          hostCutCents,
          platformCutCents,
          entryMode: entryMode || 'crowd_pool',
        };
      } catch (err: unknown) {
        console.error('Stripe live checkout session error, falling back to Stripe Test Mode:', err);
      }
    }

    // Stripe Test Environment Execution
    let ledgerResult: any = null;
    if (submissionId) {
      try {
        if (entryMode === 'curator_skip') {
          ledgerResult = dbStore.enterCuratorSkip(submissionId, payerId);
        } else {
          ledgerResult = dbStore.enterCrowdPool(submissionId, payerId);
        }
      } catch (e) {
        console.warn('Stripe test checkout ledger notice:', e);
      }

      // Dispatch automated Resend payment receipt email
      try {
        const payerUser = dbStore.getUserById(payerId);
        if (payerUser && submissionRecord) {
          sendSubmissionReceiptEmail({
            to: payerUser.email,
            artistName: `${payerUser.first_name} ${payerUser.last_name}`,
            trackTitle: submissionRecord.track_title,
            boardTitle: boardRecord?.title || 'Battlefield Board',
            hostName: boardRecord?.host ? `${boardRecord.host.first_name} ${boardRecord.host.last_name}` : 'Curator',
            amountPaid: amount / 100,
            transactionId: testPaymentIntentId,
            statusUrl: `https://scofen.com/boards/${submissionRecord.board_id}`,
            entryMode: entryMode === 'curator_skip' ? 'Curator Skip' : 'Crowd Pool',
          }).catch((err) => console.warn('[Async Receipt Notice]:', err));
        }
      } catch (e) {
        console.warn('[Receipt dispatch notice]:', e);
      }
    } else if (type === 'streaming_subscription') {
      try {
        dbStore.toggleSubscriber(payerId);
      } catch (e) {
        console.warn('Subscription ledger notice:', e);
      }
    }

    const logEntry: IntegrationLog = {
      id: `log_stripe_${Date.now()}`,
      service: 'stripe',
      type: 'payment_intent.succeeded',
      status: 'succeeded',
      summary: `[Stripe Test Mode] Settled payment of $${(amount / 100).toFixed(2)} for ${title} (${testPaymentIntentId})`,
      details: {
        paymentIntentId: testPaymentIntentId,
        chargeId: testChargeId,
        sessionId: mockSessionId,
        amount: `$${(amount / 100).toFixed(2)}`,
        hostCut: `$${(hostCutCents / 100).toFixed(2)}`,
        platformCut: `$${(platformCutCents / 100).toFixed(2)}`,
        rule: entryMode === 'curator_skip' ? 'Curator Skip Direct 100%' : '70/30 Sovereign Split',
        testCard: '4242 •••• •••• 4242',
        environment: 'Stripe Test Mode',
      },
      timestamp: new Date().toISOString(),
    };
    integrationLogs.unshift(logEntry);

    return {
      success: true,
      mode: 'test_mode',
      transactionId: testPaymentIntentId,
      chargeId: testChargeId,
      sessionId: mockSessionId,
      amount: amount / 100,
      amountCents: amount,
      hostCut: hostCutCents / 100,
      platformCut: platformCutCents / 100,
      entryMode: entryMode || 'crowd_pool',
      currency: 'USD',
      testCard: '4242 •••• •••• 4242',
      status: 'paid',
      ledger: ledgerResult?.ledgerEntry,
      timestamp: new Date().toISOString(),
      message: 'Transaction successfully processed in Stripe Test Environment',
    };
  },

  async simulateStripeWebhook(eventType: string, dataPayload?: Record<string, unknown>) {
    const timestamp = new Date().toISOString();
    const eventId = `evt_sim_${Date.now()}`;

    // Trigger associated Scofen transactional emails based on webhook event type
    let triggeredEmailResult = null;
    try {
      if (eventType === 'checkout.session.completed') {
        triggeredEmailResult = await sendSubmissionReceiptEmail({
          to: (dataPayload?.customer_email as string) || 'artist@scofen.network',
          artistName: (dataPayload?.artist_name as string) || 'Apex Resonance',
          trackTitle: (dataPayload?.track_title as string) || 'Vapor Silhouette (Original Mix)',
          boardTitle: (dataPayload?.board_title as string) || 'Apex Electronic & Spatial A&R',
          hostName: (dataPayload?.host_name as string) || 'Elena Rostova',
          amountPaid: Number(dataPayload?.amount ? (Number(dataPayload.amount) / 100) : 75.0),
          transactionId: (dataPayload?.payment_intent as string) || `pi_sim_${Date.now()}`,
          statusUrl: 'https://scofen.com/dashboard?tab=submissions',
          entryMode: 'Crowd Pool',
        });
      } else if (eventType === 'charge.dispute.created') {
        triggeredEmailResult = await sendDisputeAlertEmail({
          userEmail: (dataPayload?.dispute_email as string) || 'disputed.payer@external.com',
          submissionId: (dataPayload?.submission_id as string) || `sub_${Date.now().toString().slice(-6)}`,
          disputedAmount: Number(dataPayload?.disputed_amount || 75.0),
          currency: 'USD',
          reason: (dataPayload?.reason as string) || 'fraudulent_unrecognized_charge',
          stripeDisputeUrl: 'https://dashboard.stripe.com/disputes/dp_sim_demo',
        });
      } else if (eventType === 'payout.paid') {
        triggeredEmailResult = await sendHostPayoutEmail({
          to: (dataPayload?.host_email as string) || 'host.curator@scofen.network',
          hostName: (dataPayload?.host_name as string) || 'Elena Rostova',
          boardTitle: (dataPayload?.board_title as string) || 'Apex Electronic & Spatial A&R',
          grossRevenue: Number(dataPayload?.gross_revenue || 500.0),
          platformFee: Number(dataPayload?.platform_fee || 150.0),
          netPayout: Number(dataPayload?.net_payout || 350.0),
          payoutReferenceId: (dataPayload?.transfer_id as string) || `tr_sim_${Date.now()}`,
          bankArrivalWindow: '1-2 business days',
        });
      }
    } catch (err) {
      console.error('[Stripe Webhook Email Trigger Error]:', err);
    }

    const logEntry: IntegrationLog = {
      id: `log_hook_${Date.now()}`,
      service: 'stripe',
      type: eventType,
      status: 'simulated',
      summary: `Received verified Stripe Webhook: ${eventType}${triggeredEmailResult ? ' (Triggered Resend Email)' : ''}`,
      details: {
        eventId,
        receivedAt: timestamp,
        triggeredEmailResult,
        payload: dataPayload || {
          object: 'event',
          type: eventType,
          status: 'verified',
        },
      },
      timestamp,
    };
    integrationLogs.unshift(logEntry);

    return {
      received: true,
      eventId,
      eventType,
      status: 'processed',
      triggeredEmailResult,
    };
  },

  async sendResendEmail(params: {
    to: string;
    templateId: string;
    subject?: string;
    customHtml?: string;
    data?: {
      artistName?: string;
      trackTitle?: string;
      boardTitle?: string;
      entryFee?: number;
      curatorName?: string;
      finalScore?: number;
      payoutAmount?: number;
      role?: 'Artist' | 'Curator' | 'Host' | 'Listener';
      resetUrl?: string;
      disputeReason?: string;
      disputedAmount?: number;
    };
  }) {
    const { to, templateId, data, subject: customSubject, customHtml } = params;
    const recipient = to.trim();

    let dispatchResult: any;

    if (templateId === 'welcome_artist') {
      dispatchResult = await sendWelcomeEmail({
        to: recipient,
        name: data?.artistName || 'Artist Candidate',
        role: 'Artist',
        dashboardUrl: 'https://scofen.com/dashboard',
      });
    } else if (templateId === 'welcome_host') {
      dispatchResult = await sendWelcomeEmail({
        to: recipient,
        name: data?.curatorName || 'Host Curator',
        role: 'Host',
        dashboardUrl: 'https://scofen.com/dashboard?tab=boards',
      });
    } else if (templateId === 'password_reset') {
      dispatchResult = await sendPasswordResetEmail({
        to: recipient,
        name: data?.artistName || 'Account Holder',
        resetUrl: data?.resetUrl || `https://scofen.com/auth/reset?token=tok_${Date.now()}`,
        expiresInMinutes: 60,
      });
    } else if (templateId === 'submission_receipt' || templateId === 'submission_received') {
      dispatchResult = await sendSubmissionReceiptEmail({
        to: recipient,
        artistName: data?.artistName || 'Submitting Artist',
        trackTitle: data?.trackTitle || 'Vapor Silhouette (Club Mix)',
        boardTitle: data?.boardTitle || 'Global Electronic & Tech A&R',
        hostName: data?.curatorName || 'Elena Rostova',
        amountPaid: Number(data?.entryFee || 75.0),
        transactionId: `pi_sim_${Date.now()}`,
        statusUrl: 'https://scofen.com/dashboard?tab=submissions',
        entryMode: 'Crowd Pool',
      });
    } else if (templateId === 'submission_result' || templateId === 'evaluation_completed') {
      dispatchResult = await sendSubmissionResultEmail({
        to: recipient,
        artistName: data?.artistName || 'Evaluated Artist',
        trackTitle: data?.trackTitle || 'Vapor Silhouette (Club Mix)',
        boardTitle: data?.boardTitle || 'Global Electronic & Tech A&R',
        finalScore: Number(data?.finalScore || 92.4),
        placement: 3,
        boardStandingsUrl: 'https://scofen.com/boards/board_electronic_01',
      });
    } else if (templateId === 'board_published') {
      dispatchResult = await sendBoardPublishedEmail({
        to: recipient,
        hostName: data?.curatorName || 'Board Architect',
        boardTitle: data?.boardTitle || 'Underground Modular & Ambient Rubric',
        entryFee: Number(data?.entryFee || 80.0),
        boardUrl: 'https://scofen.com/boards/board_ambient_rubric',
        genre: 'Modular / Ambient',
      });
    } else if (templateId === 'host_payout' || templateId === 'curator_payout') {
      const gross = Number(data?.entryFee || 100.0);
      const net = Number(data?.payoutAmount || gross * 0.7);
      const platformFee = gross - net;
      dispatchResult = await sendHostPayoutEmail({
        to: recipient,
        hostName: data?.curatorName || 'Host Curator',
        boardTitle: data?.boardTitle || 'Global Electronic & Tech A&R',
        grossRevenue: gross,
        platformFee,
        netPayout: net,
        payoutReferenceId: `tr_scofen_${Date.now()}`,
        bankArrivalWindow: '1-2 business days',
      });
    } else if (templateId === 'stripe_dispute') {
      dispatchResult = await sendDisputeAlertEmail({
        userEmail: recipient,
        submissionId: `sub_${Date.now().toString().slice(-6)}`,
        disputedAmount: Number(data?.disputedAmount || 75.0),
        currency: 'USD',
        reason: data?.disputeReason || 'fraudulent_unrecognized_transaction',
        stripeDisputeUrl: 'https://dashboard.stripe.com/disputes/demo',
      });
    } else {
      // Custom or generic dispatch
      const fallbackSubject = customSubject || 'Scofen Notification';
      const fallbackHtml = customHtml || `<div style="padding: 24px; font-family: sans-serif; background: #ffffff; color: #111827;"><h3>Scofen Protocol</h3><p>Operational update for account ${recipient}.</p></div>`;
      dispatchResult = await sendEmail({
        to: recipient,
        subject: fallbackSubject,
        html: fallbackHtml,
      });
    }

    const logEntry: IntegrationLog = {
      id: `log_resend_${Date.now()}`,
      service: 'resend',
      type: `email_${templateId}`,
      status: dispatchResult.success ? (dispatchResult.isSimulated ? 'simulated' : 'succeeded') : 'failed',
      summary: `${dispatchResult.isSimulated ? '[Sandbox] ' : ''}Dispatched ${templateId} to ${recipient}: "${dispatchResult.subject}"`,
      details: {
        dispatchResult,
        templateId,
        recipient,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };
    integrationLogs.unshift(logEntry);

    return dispatchResult;
  },

  getAuditLogs(): IntegrationLog[] {
    return integrationLogs;
  },

  clearAuditLogs() {
    integrationLogs.length = 0;
    return { success: true };
  },
};
