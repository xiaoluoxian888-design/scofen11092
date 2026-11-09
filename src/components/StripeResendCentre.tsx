import React, { useState, useEffect } from 'react';
import { User } from '../types/schema';
import { apiClient } from '../services/apiClient';
import { 
  CreditCard, 
  Mail, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Terminal, 
  Send, 
  Copy, 
  Check, 
  ExternalLink,
  ShieldCheck,
  Percent,
  Layers,
  ArrowRight,
  Clock,
  Trash2,
  FileCode2,
  Edit3
} from 'lucide-react';
import { AdminEmailTemplatesView } from './AdminEmailTemplatesView';

interface IntegrationStatus {
  stripe: {
    configured: boolean;
    mode: 'live' | 'test' | 'sandbox_simulation';
    maskedSecretKey: string;
    publishableKey: string;
    webhookConfigured: boolean;
    supportedCurrencies: string[];
    activeProducts: {
      id: string;
      name: string;
      pricing: string;
      splitRule: string;
    }[];
  };
  resend: {
    configured: boolean;
    mode: 'live' | 'sandbox_simulation';
    maskedApiKey: string;
    fromEmail: string;
    templates: {
      id: string;
      name: string;
      description: string;
    }[];
  };
  envGuide: {
    file: string;
    editableKeys: { name: string; desc: string }[];
  };
}

interface IntegrationLog {
  id: string;
  service: 'stripe' | 'resend';
  type: string;
  status: 'succeeded' | 'simulated' | 'failed' | 'pending';
  summary: string;
  details: Record<string, unknown>;
  timestamp: string;
}

interface StripeResendCentreProps {
  currentUser: User;
  onRefreshLedger?: () => void;
}

export const StripeResendCentre: React.FC<StripeResendCentreProps> = ({ currentUser, onRefreshLedger }) => {
  const isAdmin = Boolean(currentUser && (currentUser.role === 'admin' || currentUser.email === 'scofenreborn@gmail.com'));

  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const [reloadNotice, setReloadNotice] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'stripe' | 'resend' | 'templates' | 'env_config' | 'logs'>('resend');

  // Stripe Test State
  const [testAmount, setTestAmount] = useState<number>(75);
  const [testPaymentType, setTestPaymentType] = useState<'submission_fee' | 'streaming_subscription'>('submission_fee');
  const [isProcessingStripe, setIsProcessingStripe] = useState(false);
  const [stripeResult, setStripeResult] = useState<any | null>(null);

  // Resend Test State
  const [recipientEmail, setRecipientEmail] = useState<string>(currentUser?.email || 'artist@example.com');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('submission_receipt');
  const [customSubject, setCustomSubject] = useState<string>('SCOFEN A&R Evaluation Result');
  const [customBody, setCustomBody] = useState<string>('Your music has been officially curated on SCOFEN.');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailResult, setEmailResult] = useState<any | null>(null);

  // Copy helpers
  const [copiedEnv, setCopiedEnv] = useState(false);

  const fetchStatusAndLogs = async () => {
    if (!isAdmin) return;
    try {
      const [statusData, logsData] = await Promise.all([
        apiClient.getIntegrationStatus(),
        apiClient.getIntegrationLogs(),
      ]);
      setStatus(statusData);
      setLogs(logsData);
    } catch (err) {
      console.error('Failed to load integration data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchStatusAndLogs();
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return null;
  }

  const handleReloadEnv = async () => {
    setIsReloading(true);
    setReloadNotice(null);
    try {
      const res = await apiClient.reloadIntegrationEnv();
      setStatus(res.status);
      setReloadNotice(res.message || 'Environment successfully reloaded.');
      const updatedLogs = await apiClient.getIntegrationLogs();
      setLogs(updatedLogs);
    } catch (err: any) {
      setReloadNotice(`Error: ${err.message}`);
    } finally {
      setIsReloading(false);
      setTimeout(() => setReloadNotice(null), 5000);
    }
  };

  const handleRunStripeTest = async () => {
    setIsProcessingStripe(true);
    setStripeResult(null);
    try {
      const result = await apiClient.createIntegrationStripeCheckout({
        type: testPaymentType,
        payerId: currentUser.id,
        customAmount: testPaymentType === 'submission_fee' ? testAmount : 5.99,
        currency: 'usd',
      });
      setStripeResult(result);
      if (onRefreshLedger) onRefreshLedger();
      const updatedLogs = await apiClient.getIntegrationLogs();
      setLogs(updatedLogs);
    } catch (err: any) {
      setStripeResult({ error: err.message });
    } finally {
      setIsProcessingStripe(false);
    }
  };

  const handleSimulateWebhook = async (eventType: string) => {
    try {
      await apiClient.simulateStripeWebhook(eventType, {
        object: 'event',
        type: eventType,
        data: {
          amount: testAmount * 100,
          currency: 'usd',
          user_id: currentUser.id,
        },
      });
      const updatedLogs = await apiClient.getIntegrationLogs();
      setLogs(updatedLogs);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleSendTestEmail = async () => {
    setIsSendingEmail(true);
    setEmailResult(null);
    try {
      const payload: any = {
        to: recipientEmail,
        templateId: selectedTemplate,
        subject: selectedTemplate === 'custom' ? customSubject : undefined,
        customHtml: selectedTemplate === 'custom' ? `<div style="padding:24px;background:#0d0d0d;color:#fff;font-family:sans-serif;"><h3>SCOFEN</h3><p>${customBody}</p></div>` : undefined,
        data: {
          artistName: `${currentUser.first_name} ${currentUser.last_name}`,
          trackTitle: 'Midnight In Tokyo (Club Mix)',
          boardTitle: 'Global Electronic & Tech A&R',
          entryFee: testAmount,
          curatorName: 'Elena Rostova (Metropolis Sync)',
          finalScore: 92.4,
          payoutAmount: Number((testAmount * 0.7).toFixed(2)),
        },
      };

      const result = await apiClient.sendResendEmail(payload);
      setEmailResult(result);
      const updatedLogs = await apiClient.getIntegrationLogs();
      setLogs(updatedLogs);
    } catch (err: any) {
      setEmailResult({ error: err.message });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleClearLogs = async () => {
    try {
      await apiClient.clearIntegrationLogs();
      setLogs([]);
    } catch (err) {
      console.error(err);
    }
  };

  const envFileTemplate = `# SCOFEN INTEGRATION ENVIRONMENT VARIABLES
# Edit these in your .env file in the application root directory

# Stripe Payment Gateway
STRIPE_SECRET_KEY="sk_test_your_secret_key_here"
STRIPE_PUBLISHABLE_KEY="pk_test_your_publishable_key_here"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret_here"

# Resend Transactional Email Engine
RESEND_API_KEY="re_your_api_key_here"
RESEND_FROM_EMAIL="SCOFEN <onboarding@resend.dev>"`;

  const copyEnvToClipboard = () => {
    navigator.clipboard.writeText(envFileTemplate);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 md:p-8 backdrop-blur-sm relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-widest text-emerald-400 mb-2 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Operations & Finance Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Stripe & Resend Operations Centre
            </h1>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl leading-relaxed">
              Manage sovereign A&R 70/30 fee collection, automated curator royalty disbursements, and transactional email dispatches. API credentials are encrypted server-side and dynamically configurable.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleReloadEnv}
              disabled={isReloading}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 border border-zinc-700/80 text-xs font-medium text-zinc-200 transition-all hover:border-emerald-500/50 disabled:opacity-50 cursor-pointer"
              title="Hot-reloads .env without restarting server"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReloading ? 'animate-spin text-emerald-400' : 'text-zinc-400'}`} />
              <span>{isReloading ? 'Reloading .env...' : 'Reload Environment'}</span>
            </button>
          </div>
        </div>

        {/* Reload notification toast */}
        {reloadNotice && (
          <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{reloadNotice}</span>
          </div>
        )}

        {/* Integration Status Badges */}
        {status && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-6 border-t border-zinc-800/80">
            {/* Stripe Gateway */}
            <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-mono uppercase text-zinc-400 font-semibold flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                  Stripe Gateway
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold uppercase ${
                  status.stripe.mode === 'live' 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                    : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {status.stripe.mode === 'live' ? 'Live Mode' : 'Test Mode Active'}
                </span>
              </div>
              <div className="text-xs font-mono text-zinc-300 truncate" title={status.stripe.maskedSecretKey}>
                {status.stripe.maskedSecretKey}
              </div>
              <div className="text-[10px] font-mono text-emerald-400 mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Test Card: 4242 •••• 4242</span>
              </div>
            </div>

            {/* Resend Engine */}
            <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-mono uppercase text-zinc-400 font-semibold flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-emerald-400" />
                  Resend Email
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold uppercase ${
                  status.resend.mode === 'live'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                }`}>
                  {status.resend.mode === 'live' ? 'Live Connected' : 'Sandbox Ready'}
                </span>
              </div>
              <div className="text-xs font-mono text-zinc-300 truncate" title={status.resend.maskedApiKey}>
                {status.resend.maskedApiKey}
              </div>
            </div>

            {/* Sovereign Split Rule */}
            <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-mono uppercase text-zinc-400 font-semibold flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-emerald-400" />
                  Split Matrix
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Automated
                </span>
              </div>
              <div className="text-xs font-semibold text-white">
                70% Curator / 30% SCOFEN
              </div>
            </div>

            {/* Sender Identity */}
            <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-mono uppercase text-zinc-400 font-semibold flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  From Address
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono text-zinc-400 bg-zinc-900 border border-zinc-800">
                  Verified
                </span>
              </div>
              <div className="text-xs text-zinc-300 font-mono truncate" title={status.resend.fromEmail}>
                {status.resend.fromEmail}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Operations Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-zinc-800/80 pb-3">
        <button
          onClick={() => setActiveSubTab('stripe')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
            activeSubTab === 'stripe'
              ? 'bg-zinc-850 text-white font-semibold border border-emerald-500/40 shadow-sm'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <CreditCard className="w-4 h-4 text-emerald-400" />
          <span>Stripe Payments & Checkout</span>
        </button>

        <button
          onClick={() => setActiveSubTab('resend')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
            activeSubTab === 'resend'
              ? 'bg-zinc-850 text-white font-semibold border border-emerald-500/40 shadow-sm'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <Mail className="w-4 h-4 text-emerald-400" />
          <span>Resend Transactional Emails</span>
        </button>

        <button
          onClick={() => setActiveSubTab('templates')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
            activeSubTab === 'templates'
              ? 'bg-zinc-850 text-white font-semibold border border-purple-500/40 shadow-sm'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <Edit3 className="w-4 h-4 text-purple-400" />
          <span>Email Template Editor</span>
        </button>

        <button
          onClick={() => setActiveSubTab('env_config')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
            activeSubTab === 'env_config'
              ? 'bg-zinc-850 text-white font-semibold border border-emerald-500/40 shadow-sm'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <FileCode2 className="w-4 h-4 text-emerald-400" />
          <span>API Keys & Environment Guide</span>
        </button>

        <button
          onClick={() => setActiveSubTab('logs')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
            activeSubTab === 'logs'
              ? 'bg-zinc-850 text-white font-semibold border border-emerald-500/40 shadow-sm'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span>Activity Audit Ledger ({logs.length})</span>
        </button>
      </div>

      {/* SUB-TAB 1: STRIPE PAYMENTS */}
      {activeSubTab === 'stripe' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Payment Runner (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6">
              <h3 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                Live Payment Execution & Simulation
              </h3>
              <p className="text-xs text-zinc-400 mb-6">
                Trigger real Stripe Checkout sessions or run simulated transactions to verify automated 70/30 host royalty accounting.
              </p>

              {/* Payment Type Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div 
                  onClick={() => setTestPaymentType('submission_fee')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    testPaymentType === 'submission_fee'
                      ? 'bg-zinc-850 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                      : 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-white">Curator Submission Fee</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      70/30 Split
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Artist pays host curator entry fee ($50 - $100). Host receives 70% net upon clearing.
                  </p>
                </div>

                <div 
                  onClick={() => setTestAmount(25)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    testAmount === 25
                      ? 'bg-zinc-850 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                      : 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-white">Producer Fast-Track Review ($25.00)</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                      Expedited Queue
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Expedited 24-hour stem audition and criteria breakdown for producer submissions.
                  </p>
                </div>
              </div>

              {/* Amount Configuration */}
              {testPaymentType === 'submission_fee' && (
                <div className="mb-6 p-4 rounded-xl bg-zinc-950/80 border border-zinc-800">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-zinc-300">
                      Submission Entry Fee (Host Autonomy)
                    </label>
                    <span className="text-base font-mono font-bold text-emerald-400">
                      ${testAmount.toFixed(2)} USD
                    </span>
                  </div>

                  <input 
                    type="range"
                    min="50"
                    max="100"
                    step="5"
                    value={testAmount}
                    onChange={(e) => setTestAmount(Number(e.target.value))}
                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />

                  <div className="flex justify-between text-[10px] text-zinc-400 mt-2 font-mono">
                    <span>$50 Min</span>
                    <span>$75 Baseline</span>
                    <span>$100 Max</span>
                  </div>

                  {/* Mathematical Split Breakdown Preview */}
                  <div className="mt-4 pt-4 border-t border-zinc-800/80 grid grid-cols-2 gap-4">
                    <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
                      <div className="text-[10px] text-zinc-400 font-mono">Curator Cut (70%)</div>
                      <div className="text-sm font-mono font-bold text-white mt-0.5">
                        ${(testAmount * 0.7).toFixed(2)}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
                      <div className="text-[10px] text-zinc-400 font-mono">Platform Infrastructure (30%)</div>
                      <div className="text-sm font-mono font-bold text-zinc-300 mt-0.5">
                        ${(testAmount * 0.3).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Run Button */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={handleRunStripeTest}
                  disabled={isProcessingStripe}
                  className="w-full sm:w-auto flex-1 flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>
                    {isProcessingStripe
                      ? 'Creating Checkout Session...'
                      : `Execute Test Checkout ($${testAmount.toFixed(2)})`}
                  </span>
                </button>

                <button
                  onClick={() => handleSimulateWebhook('checkout.session.completed')}
                  className="w-full sm:w-auto px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-xs text-zinc-200 transition-all font-mono"
                  title="Simulates an inbound verified webhook event from Stripe"
                >
                  Test Webhook Event
                </button>
              </div>

              {/* Result display */}
              {stripeResult && (
                <div className="mt-6 p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Checkout Session Created ({stripeResult.mode})
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {stripeResult.sessionId}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-300">
                    {stripeResult.message || `Amount: $${(stripeResult.amountCents / 100).toFixed(2)} | Host Net: $${(stripeResult.hostCutCents / 100).toFixed(2)} (70%)`}
                  </p>

                  {stripeResult.checkoutUrl && (
                    <div className="pt-2 border-t border-zinc-800/80">
                      <a
                        href={stripeResult.checkoutUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-mono underline"
                      >
                        <span>Open Checkout URL in New Window</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Architecture Details */}
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6">
              <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-3 font-semibold">
                Sovereign Billing Mechanics
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-zinc-300">
                <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                  <div className="font-semibold text-white mb-1">Self-Friction Gatekeeping</div>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    Unfiltered DM spam is eliminated. Independent creators pre-fund evaluation labor, creating an ungameable signal of serious artistic intent.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                  <div className="font-semibold text-white mb-1">Direct Split Routing</div>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    Stripe Transfer metadata or instant database ledger routing locks 70% directly to the host's accrued payout balance with zero manual calculations.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar / Parameters (1 col) */}
          <div className="space-y-6">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5">
              <h4 className="text-xs font-mono uppercase tracking-wider text-emerald-400 mb-4 font-semibold">
                Active Stripe Products
              </h4>

              <div className="space-y-3">
                {status?.stripe.activeProducts.map((p) => (
                  <div key={p.id} className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80">
                    <div className="text-xs font-semibold text-white mb-1">{p.name}</div>
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-emerald-400">{p.pricing}</span>
                      <span className="text-zinc-400">{p.splitRule}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5">
              <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-3 font-semibold">
                Webhook Listener Ready
              </h4>
              <p className="text-[11px] text-zinc-400 mb-3 leading-relaxed">
                Configure your Stripe webhook URL in the Stripe Dashboard to automatically process incoming events:
              </p>
              <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-[11px] text-zinc-300 break-all">
                https://your-domain.com/api/integrations/stripe/webhook
              </div>
              <div className="mt-3 text-[10px] text-zinc-500 font-mono">
                Listening: checkout.session.completed, payment_intent.succeeded
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: RESEND TRANSACTIONAL EMAILS */}
      {activeSubTab === 'resend' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Dispatcher (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Mail className="w-4 h-4 text-purple-400" />
                  Resend Transactional Email Engine
                </h3>
                {status?.resend.configured ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Live Resend Key Configured ({status.resend.maskedApiKey})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Sandbox Simulation (RESEND_API_KEY Unset)
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mb-6">
                Send curated notifications to artists and host curators. When <code className="text-purple-400 font-mono">RESEND_API_KEY</code> is set in <code className="text-purple-400 font-mono">.env</code>, emails are dispatched live to real recipient inboxes. In sandbox mode, emails are simulated safely without crashing.
              </p>

              {/* Template Selector */}
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono uppercase tracking-wider text-purple-400 font-semibold block">
                    Select Core Scofen Transactional Event
                  </label>
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('templates')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-purple-300 hover:text-white bg-purple-950/60 hover:bg-purple-900/80 border border-purple-500/40 transition-all cursor-pointer shadow-sm"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-purple-400" />
                    <span>Open Template Editor</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                  <div
                    onClick={() => setSelectedTemplate('welcome_artist')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedTemplate === 'welcome_artist'
                        ? 'bg-purple-950/40 border-purple-500 shadow-sm shadow-purple-900/30'
                        : 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-white">1A. Welcome: Artist Role</span>
                      <span className="text-[10px] font-mono text-purple-400">Account</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-snug">
                      Confirms artist account, baseline 1 Influence Point, and single CTA to dashboard.
                    </p>
                  </div>

                  <div
                    onClick={() => setSelectedTemplate('welcome_host')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedTemplate === 'welcome_host'
                        ? 'bg-purple-950/40 border-purple-500 shadow-sm shadow-purple-900/30'
                        : 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-white">1B. Welcome: Host Role</span>
                      <span className="text-[10px] font-mono text-purple-400">Authority</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-snug">
                      Confirms host authority, 70% revenue split, and board establishment CTA.
                    </p>
                  </div>

                  <div
                    onClick={() => setSelectedTemplate('password_reset')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedTemplate === 'password_reset'
                        ? 'bg-purple-950/40 border-purple-500 shadow-sm shadow-purple-900/30'
                        : 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-white">2. Credential Reset</span>
                      <span className="text-[10px] font-mono text-amber-400">Security</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-snug">
                      Secure reset authorization link with strict 1-hour expiration notice.
                    </p>
                  </div>

                  <div
                    onClick={() => setSelectedTemplate('submission_receipt')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedTemplate === 'submission_receipt'
                        ? 'bg-purple-950/40 border-purple-500 shadow-sm shadow-purple-900/30'
                        : 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-white">3. Payment & Entry Receipt</span>
                      <span className="text-[10px] font-mono text-emerald-400">Stripe Webhook</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-snug">
                      Track Title, Artist Name, Board/Host Name, Amount Paid, and Transaction ID.
                    </p>
                  </div>

                  <div
                    onClick={() => setSelectedTemplate('submission_result')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedTemplate === 'submission_result'
                        ? 'bg-purple-950/40 border-purple-500 shadow-sm shadow-purple-900/30'
                        : 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-white">4. Score Finalized (/100)</span>
                      <span className="text-[10px] font-mono text-purple-400">Numerical</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-snug">
                      Pure numerical score, rank placement, and board standings link (zero written prose).
                    </p>
                  </div>

                  <div
                    onClick={() => setSelectedTemplate('board_published')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedTemplate === 'board_published'
                        ? 'bg-purple-950/40 border-purple-500 shadow-sm shadow-purple-900/30'
                        : 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-white">5. Host Board Launch</span>
                      <span className="text-[10px] font-mono text-blue-400">Curator</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-snug">
                      Board Title, Entry Fee, Shareable URL, and 70/30 sovereign split terms.
                    </p>
                  </div>

                  <div
                    onClick={() => setSelectedTemplate('host_payout')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedTemplate === 'host_payout'
                        ? 'bg-purple-950/40 border-purple-500 shadow-sm shadow-purple-900/30'
                        : 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-white">6. Host Connect Payout</span>
                      <span className="text-[10px] font-mono text-emerald-400">Disbursement</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-snug">
                      Gross revenue, platform fee (30%), net payout (70%), and bank arrival window.
                    </p>
                  </div>

                  <div
                    onClick={() => setSelectedTemplate('stripe_dispute')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedTemplate === 'stripe_dispute'
                        ? 'bg-purple-950/40 border-purple-500 shadow-sm shadow-purple-900/30'
                        : 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-white">7. Dispute / Chargeback Alert</span>
                      <span className="text-[10px] font-mono text-red-400">Internal Admin</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-snug">
                      Alerts admin@scofen.com on charge.dispute.created with evidence link.
                    </p>
                  </div>
                </div>
              </div>

              {/* Recipient Input */}
              <div className="mb-6 space-y-4">
                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                    Recipient Email Address
                  </label>
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="curator@agency.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  <span className="text-[10px] text-zinc-500 mt-1 block">
                    Note: For testing with unverified domains, Resend allows sending to the email registered with your Resend account.
                  </span>
                </div>
              </div>

              {/* Dispatch Button */}
              <button
                onClick={handleSendTestEmail}
                disabled={isSendingEmail || !recipientEmail}
                className="flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{isSendingEmail ? 'Dispatching via Resend...' : 'Send Transactional Notification'}</span>
              </button>

              {/* Email dispatch result */}
              {emailResult && (
                <div className={`mt-6 p-4 rounded-xl border space-y-2 ${
                  emailResult.success && !emailResult.isSimulated
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-zinc-200'
                    : 'bg-amber-950/20 border-amber-500/40 text-amber-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold flex items-center gap-1.5">
                      {emailResult.success && !emailResult.isSimulated ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400">Live Email Dispatched via Resend</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-amber-400" />
                          <span className="text-amber-400">Sandbox Simulation (Live Delivery Inactive)</span>
                        </>
                      )}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {emailResult.messageId}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-300">
                    Recipient: <strong className="text-white">{emailResult.recipient}</strong> — Subject: <em>{emailResult.subject}</em>
                  </p>

                  {emailResult.isSimulated && (
                    <div className="text-[11px] text-amber-300/90 pt-1 leading-relaxed bg-amber-950/40 p-2.5 rounded-lg border border-amber-500/20">
                      <strong>Why was an email not received?</strong> The server does not have a live <code className="font-mono bg-black/40 px-1 py-0.5 rounded text-amber-200">RESEND_API_KEY</code> set in <code className="font-mono bg-black/40 px-1 py-0.5 rounded text-amber-200">.env</code>. Once an API key (<code className="font-mono text-amber-200">re_...</code>) is configured in <code className="font-mono text-amber-200">.env</code>, live emails will immediately transmit to recipient inboxes.
                    </div>
                  )}

                  {emailResult.error && !emailResult.isSimulated && (
                    <div className="text-[11px] text-red-400 pt-1">
                      Error: {emailResult.error}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Email Preview & Specs (1 col) */}
          <div className="space-y-6">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5">
              <h4 className="text-xs font-mono uppercase tracking-wider text-emerald-400 mb-3 font-semibold">
                Sender Identity & Deliverability
              </h4>
              <div className="space-y-2.5 text-xs text-zinc-300">
                <div className="flex justify-between py-1.5 border-b border-zinc-800">
                  <span className="text-zinc-400">From Name:</span>
                  <span className="font-semibold text-white">SCOFEN Sovereign A&R</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-zinc-800">
                  <span className="text-zinc-400">Sender:</span>
                  <span className="font-mono text-zinc-200 truncate max-w-[150px]">{status?.resend.fromEmail}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-zinc-800">
                  <span className="text-zinc-400">DKIM / SPF:</span>
                  <span className="text-emerald-400 font-mono">Enabled</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-zinc-400">Engine:</span>
                  <span className="font-mono text-zinc-300">{status?.resend.mode}</span>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5">
              <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-3 font-semibold">
                Automated Event Triggers
              </h4>
              <ul className="space-y-2 text-[11px] text-zinc-400">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                  <span><strong>On Track Submit:</strong> Dispatches submission confirmation and links creator to board queue.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                  <span><strong>On Score Finalize:</strong> Dispatches calculated rubric breakdown and discovery chart inclusion.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                  <span><strong>On Payout Settle:</strong> Dispatches host net royalty credit statement.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB: EMAIL TEMPLATE EDITOR */}
      {activeSubTab === 'templates' && (
        <div className="space-y-6">
          <AdminEmailTemplatesView adminEmail={currentUser.email} />
        </div>
      )}

      {/* SUB-TAB 3: EDITABLE API KEYS & CONFIGURATION GUIDE */}
      {activeSubTab === 'env_config' && (
        <div className="space-y-6">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <FileCode2 className="w-4 h-4 text-emerald-400" />
                  Dynamic Server-Side Key Configuration
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  API keys are stored strictly in server-side environment files (<code className="text-emerald-400 font-mono">.env</code>) and proxy routes (<code className="text-emerald-400 font-mono">/api/*</code>). Secret keys are never exposed in browser bundles.
                </p>
              </div>

              <button
                onClick={copyEnvToClipboard}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-xs font-medium text-zinc-200 transition-all cursor-pointer flex-shrink-0"
              >
                {copiedEnv ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
                <span>{copiedEnv ? 'Copied .env template!' : 'Copy .env Template'}</span>
              </button>
            </div>

            {/* Code Block */}
            <div className="relative rounded-xl bg-black border border-zinc-800 p-4 font-mono text-xs text-zinc-300 overflow-x-auto leading-relaxed shadow-inner">
              <pre>{envFileTemplate}</pre>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 pt-6 border-t border-zinc-800/80">
              <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800">
                <div className="text-[11px] font-mono text-emerald-400 font-bold mb-1">STEP 01</div>
                <div className="text-xs font-semibold text-white mb-1.5">Open or Create .env</div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  In your workspace root, create or edit the <code className="text-zinc-200 font-mono">.env</code> file (derived from <code className="text-zinc-200 font-mono">.env.example</code>).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800">
                <div className="text-[11px] font-mono text-emerald-400 font-bold mb-1">STEP 02</div>
                <div className="text-xs font-semibold text-white mb-1.5">Paste Stripe & Resend Keys</div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Add your live or test keys: <code className="text-zinc-200 font-mono">STRIPE_SECRET_KEY</code> and <code className="text-zinc-200 font-mono">RESEND_API_KEY</code>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800">
                <div className="text-[11px] font-mono text-emerald-400 font-bold mb-1">STEP 03</div>
                <div className="text-xs font-semibold text-white mb-1.5">Click "Reload Environment"</div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Click the reload button at the top of this hub. The server instantly hot-reloads keys without downtime or restart.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: ACTIVITY AUDIT LEDGER */}
      {activeSubTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                Integration Activity & Delivery Audit Trail
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Real-time log of payment checkouts, webhook payloads, and transactional email dispatches.
              </p>
            </div>

            {logs.length > 0 && (
              <button
                onClick={handleClearLogs}
                className="flex items-center space-x-1.5 text-xs text-zinc-400 hover:text-rose-400 px-3 py-1.5 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Logs</span>
              </button>
            )}
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
            {logs.length === 0 ? (
              <div className="p-12 text-center text-xs font-mono text-zinc-500">
                No integration events recorded yet. Run a Stripe checkout or Resend email dispatch above.
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/80">
                {logs.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-zinc-850/50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center space-x-2">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                          log.service === 'stripe'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                        }`}>
                          {log.service}
                        </span>
                        <span className="text-xs font-semibold text-white">{log.summary}</span>
                      </div>

                      <div className="flex items-center space-x-3 text-[11px] font-mono text-zinc-400">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                          log.status === 'succeeded'
                            ? 'text-emerald-400 bg-emerald-500/10'
                            : 'text-zinc-300 bg-zinc-800'
                        }`}>
                          {log.status}
                        </span>
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>

                    {/* Expandable JSON Details */}
                    <div className="mt-2 p-2.5 rounded-lg bg-black/60 border border-zinc-800/60 font-mono text-[10px] text-zinc-400 overflow-x-auto">
                      <pre>{JSON.stringify(log.details, null, 2)}</pre>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
