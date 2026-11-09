import React, { useState } from 'react';
import { Submission, User } from '../types/schema';
import { apiClient } from '../services/apiClient';
import { calculateCuratorEntryFee, splitCrowdPoolFee } from '../services/mathEngine';
import { 
  X, 
  ShieldCheck, 
  Music, 
  Sparkles, 
  Coins, 
  CreditCard, 
  CheckCircle2, 
  Lock, 
  ArrowRight,
  ExternalLink,
  Receipt
} from 'lucide-react';

interface CheckoutModalProps {
  submission: Submission | null;
  currentUser: User;
  onClose: () => void;
  onPaymentSuccess: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  submission,
  currentUser,
  onClose,
  onPaymentSuccess,
}) => {
  const [selectedMode, setSelectedMode] = useState<'crowd_pool' | 'curator_skip'>('crowd_pool');
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [expiry, setExpiry] = useState('12/28');
  const [cvc, setCvc] = useState('123');
  const [zip, setZip] = useState('90210');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentSuccessData, setPaymentSuccessData] = useState<{
    transactionId: string;
    amount: number;
    hostCut: number;
    platformCut: number;
    entryMode: string;
    checkoutUrl?: string;
  } | null>(null);

  if (!submission) return null;

  const curatorPoints = submission.board?.host?.influence_points || 100;
  const curatorSkipFee = calculateCuratorEntryFee(curatorPoints);
  const crowdSplit = splitCrowdPoolFee(5.0);
  const currentFee = selectedMode === 'crowd_pool' ? 5.0 : curatorSkipFee;

  const handleExecutePayment = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.createIntegrationStripeCheckout({
        submissionId: submission.id,
        payerId: currentUser.id,
        type: 'submission_fee',
        entryMode: selectedMode,
        customAmount: currentFee,
        currency: 'usd',
        testPaymentMethod: {
          cardNumber,
          expMonth: '12',
          expYear: '28',
          cvc,
        },
      });

      if (res.error) {
        throw new Error(res.error);
      }

      setPaymentSuccessData({
        transactionId: res.transactionId || `pi_test_${Date.now()}`,
        amount: res.amount || currentFee,
        hostCut: res.hostCut !== undefined ? res.hostCut : (selectedMode === 'crowd_pool' ? 3.5 : currentFee),
        platformCut: res.platformCut !== undefined ? res.platformCut : (selectedMode === 'crowd_pool' ? 1.5 : 0),
        entryMode: selectedMode === 'curator_skip' ? 'Curator Skip (Priority)' : 'Crowd Pool Battlefield',
        checkoutUrl: res.checkoutUrl,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Stripe payment execution failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteAndClose = () => {
    onPaymentSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 relative shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-zinc-400 hover:text-white p-1 cursor-pointer transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="border-b border-zinc-850 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
                <Music className="w-4 h-4" />
              </span>
              <h2 className="text-base font-bold text-white tracking-tight">
                Battlefield Entry Checkout
              </h2>
            </div>
            {/* Stripe Test Mode Live Pill */}
            <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Stripe Test Mode</span>
            </div>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Section 2 Sovereign Entry: Select Crowd Pool battle pool or direct Curator Skip via Stripe Test Gateway.
          </p>
        </div>

        {paymentSuccessData ? (
          /* Payment Confirmation Receipt Screen */
          <div className="space-y-4 py-2 animate-in fade-in duration-200">
            <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold tracking-wider">
                  Stripe Test Transaction Confirmed
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  ${paymentSuccessData.amount.toFixed(2)} USD Settled
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Track <strong>&ldquo;{submission.track_title}&rdquo;</strong> is confirmed and queued on{' '}
                  <span className="text-zinc-200">{submission.board?.title}</span>.
                </p>
              </div>

              {/* Transaction Spec Block */}
              <div className="bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-800 text-left text-xs font-mono space-y-1.5">
                <div className="flex justify-between items-center text-zinc-400">
                  <span>Stripe Reference:</span>
                  <span className="text-emerald-400 font-bold truncate max-w-[210px]">
                    {paymentSuccessData.transactionId}
                  </span>
                </div>
                <div className="flex justify-between items-center text-zinc-400">
                  <span>Entry Mechanism:</span>
                  <span className="text-zinc-200 font-semibold">{paymentSuccessData.entryMode}</span>
                </div>
                <div className="flex justify-between items-center text-zinc-400">
                  <span>Curator / Board Cut (70%):</span>
                  <span className="text-amber-400 font-bold">${paymentSuccessData.hostCut.toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between items-center text-zinc-400">
                  <span>Scofen Platform Fee (30%):</span>
                  <span className="text-cyan-400 font-bold">${paymentSuccessData.platformCut.toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between items-center text-zinc-400 pt-1 border-t border-zinc-800 text-[11px]">
                  <span>Payer Receipt:</span>
                  <span className="text-zinc-300 truncate">{currentUser.email}</span>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-zinc-400 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800 flex items-center space-x-2">
              <Receipt className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>An automated Resend payment confirmation notice has been dispatched to your email.</span>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              {paymentSuccessData.checkoutUrl && (
                <a
                  href={paymentSuccessData.checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 px-4 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold flex items-center justify-center space-x-1.5 border border-zinc-700 transition-colors"
                >
                  <span>View Stripe Hosted Receipt</span>
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                </a>
              )}
              <button
                type="button"
                onClick={handleCompleteAndClose}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center justify-center space-x-1.5 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                <span>Enter Board Queue &amp; Standings</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Active Checkout Form */
          <>
            {error && (
              <div className="bg-rose-950/40 border border-rose-800/60 p-3 rounded-2xl text-xs text-rose-300 font-medium">
                {error}
              </div>
            )}

            {/* Track & Board Overview Card */}
            <div className="bg-zinc-900/60 p-3.5 rounded-2xl border border-zinc-800 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">Track:</span>
                <span className="text-white font-semibold truncate max-w-[200px]">{submission.track_title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Battlefield Board:</span>
                <span className="text-zinc-200">{submission.board?.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Host Curator:</span>
                <span className="text-emerald-400 font-medium">
                  {submission.board?.host ? `${submission.board.host.first_name} ${submission.board.host.last_name}` : 'Curator'}
                  <span className="text-zinc-500 ml-1.5 font-mono">({curatorPoints} PTS)</span>
                </span>
              </div>
            </div>

            {/* Entry Mode Selection Tabs */}
            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => setSelectedMode('crowd_pool')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  selectedMode === 'crowd_pool'
                    ? 'bg-amber-500/10 border-amber-500/50 shadow-md shadow-amber-500/10'
                    : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center space-x-1.5 text-amber-400 font-bold text-xs mb-1">
                  <Coins className="w-3.5 h-3.5" />
                  <span>Crowd Pool ($5.00)</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-tight">
                  Standard $5 entry. $3.50 held in board ledger (70%), $1.50 to Scofen (30%).
                </p>
              </div>

              <div
                onClick={() => setSelectedMode('curator_skip')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  selectedMode === 'curator_skip'
                    ? 'bg-emerald-500/10 border-emerald-500/50 shadow-md shadow-emerald-500/10'
                    : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center space-x-1.5 text-emerald-400 font-bold text-xs mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Curator Skip (${curatorSkipFee.toFixed(2)})</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-tight">
                  Priority direct evaluation (Points × 0.1). Skips crowd pool directly to curator queue.
                </p>
              </div>
            </div>

            {/* Breakdown for Selected Mode */}
            {selectedMode === 'crowd_pool' ? (
              <div className="bg-zinc-900 p-3.5 rounded-2xl border border-zinc-800 space-y-1.5 text-xs font-mono">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
                  Crowd Pool Sovereign Fee Split (70 / 30)
                </div>
                <div className="flex justify-between items-center text-zinc-300">
                  <span>Held in Board Ledger (70%):</span>
                  <span className="text-amber-400 font-bold">${crowdSplit.boardLedgerCut.toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between items-center text-zinc-300">
                  <span>Scofen Platform Margin (30%):</span>
                  <span className="text-cyan-400 font-bold">${crowdSplit.scofenCut.toFixed(2)} USD</span>
                </div>
                <div className="pt-1.5 border-t border-zinc-800 flex justify-between items-center text-white font-bold text-sm">
                  <span>Total Entry Charge:</span>
                  <span className="text-amber-400 text-base">$5.00 USD</span>
                </div>
              </div>
            ) : (
              <div className="bg-zinc-900 p-3.5 rounded-2xl border border-zinc-800 space-y-1.5 text-xs font-mono">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
                  Curator Skip Calculation Formula
                </div>
                <div className="flex justify-between items-center text-zinc-300">
                  <span>Curator Authority Formula:</span>
                  <span className="text-zinc-400">{curatorPoints} PTS × 0.1</span>
                </div>
                <div className="flex justify-between items-center text-zinc-300">
                  <span>Direct to Curator:</span>
                  <span className="text-emerald-400 font-bold">${curatorSkipFee.toFixed(2)} USD</span>
                </div>
                <div className="pt-1.5 border-t border-zinc-800 flex justify-between items-center text-white font-bold text-sm">
                  <span>Total Skip Fee:</span>
                  <span className="text-emerald-400 text-base">${curatorSkipFee.toFixed(2)} USD</span>
                </div>
              </div>
            )}

            {/* Stripe Test Mode Card Input Section */}
            <div className="p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold flex items-center space-x-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Stripe Test Card Elements</span>
                </span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                  Auto-Populated
                </span>
              </div>

              {/* Card Number Input */}
              <div className="relative">
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="4242 4242 4242 4242"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500 pr-16"
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center space-x-1 text-[10px] font-mono text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                  <Lock className="w-2.5 h-2.5 text-emerald-400" />
                  <span>TEST</span>
                </div>
              </div>

              {/* Exp, CVC, Zip Inputs */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[9px] font-mono text-zinc-500 uppercase block mb-1">Expiry</label>
                  <input
                    type="text"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    placeholder="12/28"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-mono text-zinc-500 uppercase block mb-1">CVC</label>
                  <input
                    type="text"
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value)}
                    placeholder="123"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-mono text-zinc-500 uppercase block mb-1">Postal Code</label>
                  <input
                    type="text"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    placeholder="90210"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="text-[10px] text-zinc-500 font-mono">
                * Simulated card tokenization via Stripe Test Mode. No actual funds will be charged.
              </div>
            </div>

            {/* Execute Payment CTA */}
            <button
              onClick={handleExecutePayment}
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>
                {loading
                  ? 'Processing via Stripe Test Environment...'
                  : selectedMode === 'crowd_pool'
                  ? 'Confirm & Pay $5.00 via Stripe Test Mode'
                  : `Confirm & Pay $${curatorSkipFee.toFixed(2)} via Stripe Test Mode`}
              </span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
