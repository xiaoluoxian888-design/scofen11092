import React, { useState } from 'react';
import { User } from '../types/schema';
import { apiClient } from '../services/apiClient';

interface HostSignUpPageProps {
  onSignupSuccess: (user: User) => void;
  onOpenLoginModal: () => void;
  onOpenMarketing: () => void;
  onBackToHome: () => void;
}

const INDUSTRY_ROLES = [
  'Record Label Executive',
  'Music Supervisor / Sync Agent',
  'Playlist Curator / Tastemaker',
  'Audio Engineer / Producer',
  'Independent Recording Artist',
  'Public Listener / Subscriber',
] as const;

export const HostSignUpPage: React.FC<HostSignUpPageProps> = ({
  onSignupSuccess,
  onOpenLoginModal,
  onOpenMarketing,
  onBackToHome,
}) => {
  // Step 1: Host Account Credentials
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');

  // Step 2: Embedded Initial Assessment Fields
  const [industryRole, setIndustryRole] = useState<string>(INDUSTRY_ROLES[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [verificationLinks, setVerificationLinks] = useState('');
  const [audienceMetrics, setAudienceMetrics] = useState('');
  const [curationCriteria, setCurationCriteria] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    setErrorMessage(null);

    // Validate account credentials
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setErrorMessage('Please provide first name, last name, and professional email.');
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      setErrorMessage('Please provide a valid corporate or professional email address.');
      return;
    }

    // Validate embedded assessment fields
    if (!verificationLinks.trim() || !audienceMetrics.trim() || !curationCriteria.trim()) {
      setErrorMessage('All verification and curation fields are required for the initial assessment.');
      return;
    }

    setSubmitting(true);

    try {
      const result = await apiClient.signupHostWithAssessment(
        firstName.trim(),
        lastName.trim(),
        email.trim(),
        bio.trim() || `Host & A&R Curator (${industryRole})`,
        {
          industryRole,
          verificationLinks: verificationLinks.trim(),
          audienceMetrics: audienceMetrics.trim(),
          curationCriteria: curationCriteria.trim(),
        }
      );

      onSignupSuccess(result.user);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Host registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-zinc-100 font-sans flex flex-col selection:bg-emerald-500 selection:text-zinc-950">
      {/* Top Header Navigation */}
      <header className="w-full bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between font-mono text-[11px] uppercase tracking-widest text-zinc-400">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onBackToHome}
              className="text-white hover:text-emerald-400 font-bold transition-colors cursor-pointer"
            >
              SCOFEN
            </button>
            <span className="text-zinc-600">/</span>
            <span className="text-emerald-400 font-semibold">HOST ONBOARDING INTAKE</span>
          </div>

          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={onOpenMarketing}
              className="hidden sm:inline text-zinc-400 hover:text-emerald-400 transition-colors cursor-pointer underline underline-offset-4"
            >
              Curator Briefing &amp; Economics
            </button>
            <button
              type="button"
              onClick={onOpenLoginModal}
              className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors cursor-pointer"
            >
              Sign In →
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Hero Context & Authority Badge */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 flex-wrap gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 font-mono text-[11px] uppercase tracking-wider text-emerald-400 font-bold">
              INVITE-ONLY JURISDICTION
            </span>
            <span className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 font-mono text-[11px] uppercase tracking-wider text-zinc-400">
              50:50 DISTORTION-KILL MATRIX
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-white leading-tight">
            HOST &amp; BOARD CURATOR ONBOARDING
          </h1>

          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-2xl">
            Register your curator identity and complete the embedded Initial Influence Assessment. Your dossier will be routed directly to the Admin Terminal for manual review and initial point calibration (≥100 PTS required to host battlefields).
          </p>
        </div>

        {/* Informational Guidance Callout */}
        <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-[11px] font-mono uppercase font-bold text-emerald-400 tracking-wider">
              Protocol Authority Invariant
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Every newly created account registers at the baseline index of <strong>1 Influence Point</strong>. The embedded assessment below allows invited curators to submit active footprint metrics to the Admin Terminal to calibrate their starting authority.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenMarketing}
            className="shrink-0 text-xs font-mono text-emerald-400 hover:text-emerald-300 underline underline-offset-4 cursor-pointer"
          >
            Review Curator Terms →
          </button>
        </div>

        {/* Error Alert if any */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs sm:text-sm font-mono flex items-center justify-between">
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-white ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Unified Host Onboarding Form */}
        <form onSubmit={handleSubmit} className="space-y-8 bg-zinc-900/50 border border-zinc-800/90 rounded-3xl p-6 sm:p-10 shadow-2xl">
          {/* ========================================================
              SECTION 1: HOST ACCOUNT CREDENTIALS
             ======================================================== */}
          <div className="space-y-5 border-b border-zinc-800 pb-8">
            <div className="flex items-center justify-between font-mono text-xs uppercase tracking-wider text-zinc-400">
              <span className="text-emerald-400 font-bold">SECTION 01 // HOST CREDENTIALS</span>
              <span>ACCOUNT CREATION</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-mono uppercase tracking-wider text-zinc-300 font-bold">
                  First Name <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Helena"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono uppercase tracking-wider text-zinc-300 font-bold">
                  Last Name <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Vance"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-300 font-bold">
                Professional / Corporate Email <span className="text-emerald-400">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="curator@label-or-domain.com"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <p className="text-[11px] font-mono text-zinc-500">
                Used for single-device ledger authentication, curator payout dispatches, and Admin Terminal reviews.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-300 font-bold">
                Organization / Curator Headline
              </label>
              <input
                type="text"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="e.g. A&R Director at Neon Soundworks // Electronic & Cyberpunk"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          {/* ========================================================
              SECTION 2: EMBEDDED INITIAL INFLUENCE ASSESSMENT
             ======================================================== */}
          <div className="space-y-6 border-b border-zinc-800 pb-8">
            <div className="flex items-center justify-between font-mono text-xs uppercase tracking-wider text-zinc-400">
              <span className="text-emerald-400 font-bold">SECTION 02 // EMBEDDED INITIAL ASSESSMENT</span>
              <span>ADMIN LEDGER VERIFICATION</span>
            </div>

            {/* Field 1: Industry Role */}
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                1. Current Industry Role / Primary Affiliation <span className="text-emerald-400">*</span>
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

            {/* Field 2: Verification Links */}
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                2. Primary Portfolio / Verification Links <span className="text-emerald-400">*</span>
              </label>
              <p className="font-mono italic text-xs text-zinc-400 leading-relaxed">
                Provide explicit URLs to your primary active footprint (e.g., Spotify Artist Profile, Apple Music Link, SoundCloud Catalog, Verified Curated Playlists, Label Corporate Site, or LinkedIn Professional Profile).
              </p>
              <textarea
                rows={3}
                required
                value={verificationLinks}
                onChange={(e) => setVerificationLinks(e.target.value)}
                placeholder="https://open.spotify.com/playlist/... &#10;https://www.linkedin.com/in/... &#10;https://labelname.com"
                className="w-full bg-zinc-950 text-zinc-100 border border-zinc-800 focus:border-emerald-500 rounded-2xl p-3.5 font-mono text-xs sm:text-sm focus:outline-none transition-colors"
              />
            </div>

            {/* Field 3: Audience & List Density Metrics */}
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                3. Audience &amp; List Density Metrics <span className="text-emerald-400">*</span>
              </label>
              <p className="font-mono italic text-xs text-zinc-400 leading-relaxed">
                State your estimated direct audience reach or active network parameters across your private/public distribution channels (e.g., Mailing list subscriber counts, active membership metrics, or platform following).
              </p>
              <input
                type="text"
                required
                value={audienceMetrics}
                onChange={(e) => setAudienceMetrics(e.target.value)}
                placeholder="e.g., 28,000 monthly listeners, 4,500 newsletter subscribers, Discord of 1,200 active artists"
                className="w-full bg-zinc-950 text-zinc-100 border border-zinc-800 focus:border-emerald-500 rounded-2xl p-3.5 font-mono text-xs sm:text-sm focus:outline-none transition-colors"
              />
            </div>

            {/* Field 4: Philosophical Filter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                  4. Core Curation Focus &amp; Criteria (Max 150 Words) <span className="text-emerald-400">*</span>
                </label>
                <span className="font-mono text-xs text-emerald-400 font-semibold">{wordCount} / 150 WORDS</span>
              </div>
              <p className="font-mono italic text-xs text-zinc-400 leading-relaxed">
                Describe your specific structural criteria for distinguishing high-integrity recording competence and raw performance from algorithmic background noise.
              </p>
              <textarea
                rows={4}
                required
                value={curationCriteria}
                onChange={(e) => handleCriteriaChange(e.target.value)}
                placeholder="Detail the sonic arrangement, vocal balance, sync readiness, or thematic originality you prioritize when grading submissions..."
                className="w-full bg-zinc-950 text-zinc-100 border border-zinc-800 focus:border-emerald-500 rounded-2xl p-3.5 font-mono text-xs sm:text-sm focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* ========================================================
              SECTION 3: SYSTEM NOTICE & SUBMIT
             ======================================================== */}
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800">
              <p className="font-mono text-xs leading-relaxed text-zinc-400">
                <strong className="text-amber-400">NOTICE:</strong> The Initial Influence Assessment is a singular execution event. Your entries are contractually locked upon account creation and routed directly to the Admin Terminal for manual verification. Inaccurate or unverifiable metrics will result in your score defaulting permanently to the baseline index of 1.
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 py-4 px-6 rounded-2xl text-xs sm:text-sm font-black uppercase tracking-widest cursor-pointer text-center transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'CREATING ACCOUNT & ROUTING ASSESSMENT...' : 'CREATE HOST ACCOUNT & SUBMIT TO ADMIN ->'}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={onOpenLoginModal}
                className="text-xs font-mono text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Already invited and have an account?{' '}
                <span className="text-emerald-400 hover:text-emerald-300 font-bold underline underline-offset-4">
                  Log in here
                </span>
              </button>
            </div>
          </div>
        </form>
      </main>

      {/* Footer */}
      <footer className="w-full bg-zinc-950 border-t border-zinc-800/80 py-4 px-6 text-center text-xs font-mono text-zinc-500 shrink-0">
        SCOFEN PROTOCOL // DECENTRALIZED MULTI-CRITERIA MUSIC DISCOVERY &amp; TRUST LEDGER
      </footer>
    </div>
  );
};
