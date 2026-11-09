import React, { useState } from 'react';
import { User } from '../types/schema';
import { apiClient } from '../services/apiClient';

interface InfluenceAssessmentPageProps {
  currentUser: User;
  onAssessmentCompleted: (updatedUser: User) => void;
  onBack: () => void;
}

const INDUSTRY_ROLES = [
  'Independent Recording Artist',
  'Record Label Executive',
  'Music Supervisor / Sync Agent',
  'Playlist Curator / Tastemaker',
  'Audio Engineer / Producer',
  'Public Listener / Subscriber',
] as const;

export const InfluenceAssessmentPage: React.FC<InfluenceAssessmentPageProps> = ({
  currentUser,
  onAssessmentCompleted,
  onBack,
}) => {
  const [industryRole, setIndustryRole] = useState<string>(INDUSTRY_ROLES[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [verificationLinks, setVerificationLinks] = useState('');
  const [audienceMetrics, setAudienceMetrics] = useState('');
  const [curationCriteria, setCurationCriteria] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isCompleted = Boolean(currentUser.is_assessment_completed);

  const wordCount = curationCriteria.trim()
    ? curationCriteria.trim().split(/\s+/).length
    : 0;

  const handleCriteriaChange = (val: string) => {
    const words = val.trim().split(/\s+/);
    if (val.trim() === '' || words.length <= 150) {
      setCurationCriteria(val);
    } else {
      setCurationCriteria(words.slice(0, 150).join(' '));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCompleted) return;
    setError(null);

    if (!verificationLinks.trim() || !audienceMetrics.trim() || !curationCriteria.trim()) {
      setError('All specification fields are mandatory for ledger routing.');
      return;
    }

    try {
      setSubmitting(true);
      const updatedUser = await apiClient.submitInfluenceAssessment(currentUser.id, {
        industryRole,
        verificationLinks: verificationLinks.trim(),
        audienceMetrics: audienceMetrics.trim(),
        curationCriteria: curationCriteria.trim(),
      });
      onAssessmentCompleted(updatedUser);
    } catch (err: any) {
      setError(err?.message || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isCompleted) {
    return (
      <div className="w-full max-w-3xl mx-auto bg-zinc-900/70 border border-zinc-800 rounded-3xl p-8 sm:p-12 shadow-2xl space-y-8">
        <div className="border-b border-zinc-800 pb-4 flex items-center justify-between font-mono text-xs uppercase text-zinc-400">
          <span className="text-emerald-400 font-bold">SCOFEN // INITIAL INFLUENCE ASSESSMENT</span>
          <button
            type="button"
            onClick={onBack}
            className="text-zinc-300 hover:text-white underline underline-offset-4 cursor-pointer"
          >
            Return to Dashboard
          </button>
        </div>

        <div className="py-10 text-center space-y-4 max-w-xl mx-auto">
          <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 font-mono text-[11px] uppercase tracking-widest text-emerald-400 font-bold">
            Status // Locked
          </span>
          <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight leading-snug text-white">
            APPLICATION ROUTED TO ADMIN LEDGER. RE-ENTRY ATTEMPT SHUT DOWN. VERIFICATION IN PROGRESS.
          </h2>
          <p className="font-mono text-xs text-zinc-400">
            Account: <span className="text-zinc-200">{currentUser.email}</span> • Current Baseline Index:{' '}
            <strong className="text-emerald-400">{currentUser.influence_points} PTS</strong>
          </p>
        </div>

        <div className="border-t border-zinc-800 pt-4 font-mono text-[11px] uppercase text-zinc-500 flex justify-between">
          <span>Singular Execution Event</span>
          <span className="text-emerald-400">is_assessment_completed = TRUE</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto bg-zinc-900/70 border border-zinc-800 rounded-3xl p-6 sm:p-10 shadow-2xl">
      {/* Top Bar */}
      <div className="border-b border-zinc-800 pb-4 mb-8 flex items-center justify-between font-mono text-xs uppercase text-zinc-400">
        <span className="text-emerald-400 font-bold">SCOFEN // INITIAL INFLUENCE ASSESSMENT</span>
        <button
          type="button"
          onClick={onBack}
          className="text-zinc-300 hover:text-white underline underline-offset-4 cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Field 1: Professional Identity Node */}
        <div className="space-y-2">
          <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
            1. CURRENT INDUSTRY ROLE / PRIMARY AFFILIATION
          </label>
          <div className="relative w-full">
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="w-full bg-zinc-950 text-zinc-100 border border-zinc-800 hover:border-zinc-700 rounded-2xl px-4 py-3 text-left font-mono text-xs sm:text-sm flex items-center justify-between cursor-pointer transition-colors"
            >
              <span>{industryRole}</span>
              <span className="text-emerald-400 text-xs">{isDropdownOpen ? '▲' : '▼'}</span>
            </button>
            {isDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl z-20">
                {INDUSTRY_ROLES.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      setIndustryRole(role);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 font-mono text-xs sm:text-sm cursor-pointer transition-colors ${
                      industryRole === role
                        ? 'bg-emerald-500 text-zinc-950 font-bold'
                        : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Field 2: Hard Ledger Verification Assets */}
        <div className="space-y-2">
          <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
            2. PRIMARY PORTFOLIO / VERIFICATION LINKS
          </label>
          <p className="font-mono italic text-xs text-zinc-400 leading-relaxed">
            Provide explicit URLs to your primary active footprint (e.g., Spotify Artist Profile, Apple Music Link, SoundCloud Catalog, Verified Curated Playlists, Label Corporate Site, or LinkedIn Professional Profile).
          </p>
          <textarea
            rows={4}
            value={verificationLinks}
            onChange={(e) => setVerificationLinks(e.target.value)}
            placeholder="https://..."
            className="w-full bg-zinc-950 text-zinc-100 border border-zinc-800 focus:border-emerald-500 rounded-2xl p-3.5 font-mono text-xs sm:text-sm focus:outline-none transition-colors"
          />
        </div>

        {/* Field 3: Private Domain Mass Indicator */}
        <div className="space-y-2">
          <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
            3. AUDIENCE &amp; LIST DENSITY METRICS
          </label>
          <p className="font-mono italic text-xs text-zinc-400 leading-relaxed">
            State your estimated direct audience reach or active network parameters across your private/public distribution channels (e.g., Mailing list subscriber counts, active membership metrics, or platform following).
          </p>
          <input
            type="text"
            value={audienceMetrics}
            onChange={(e) => setAudienceMetrics(e.target.value)}
            placeholder="e.g., 14,500 mailing list subscribers; 42,000 monthly listeners"
            className="w-full bg-zinc-950 text-zinc-100 border border-zinc-800 focus:border-emerald-500 rounded-2xl p-3.5 font-mono text-xs sm:text-sm focus:outline-none transition-colors"
          />
        </div>

        {/* Field 4: The Philosophical Filter Node */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
              4. CORE CURATION FOCUS &amp; CRITERIA (MAX 150 WORDS)
            </label>
            <span className="font-mono text-xs text-emerald-400 font-semibold">{wordCount} / 150 WORDS</span>
          </div>
          <p className="font-mono italic text-xs text-zinc-400 leading-relaxed">
            Describe your specific structural criteria for distinguishing high-integrity recording competence and raw performance from algorithmic background noise.
          </p>
          <textarea
            rows={5}
            value={curationCriteria}
            onChange={(e) => handleCriteriaChange(e.target.value)}
            placeholder="State your structural evaluation criteria..."
            className="w-full bg-zinc-950 text-zinc-100 border border-zinc-800 focus:border-emerald-500 rounded-2xl p-3.5 font-mono text-xs sm:text-sm focus:outline-none transition-colors"
          />
        </div>

        {error && (
          <div className="font-mono text-xs text-rose-300 border border-rose-500/40 rounded-2xl p-3.5 bg-rose-500/10">
            {error}
          </div>
        )}

        {/* Frame Anchor System Notice & Submission Action */}
        <div className="space-y-4 pt-2">
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800">
            <p className="font-mono text-xs leading-relaxed text-zinc-400">
              <strong className="text-amber-400">NOTICE:</strong> The Initial Influence Assessment is a singular execution event. Your entries are contractually locked upon submission and routed directly to the Admin Terminal for manual verification. Inaccurate or unverifiable metrics will result in your score defaulting permanently to the baseline index of 1.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 py-4 px-6 rounded-2xl text-xs sm:text-sm font-black uppercase tracking-widest cursor-pointer text-center transition-colors shadow-lg shadow-emerald-500/20"
          >
            {submitting ? 'ROUTING TO ADMIN TERMINAL...' : 'SUBMIT APPLICATION TO ADMIN TERMINAL ->'}
          </button>
        </div>
      </form>
    </div>
  );
};
