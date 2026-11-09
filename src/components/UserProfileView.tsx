import React, { useState, useEffect } from 'react';
import { User, Board, Submission, UserProfileData, RatedTrackReportItem, InfluencePointEvent } from '../types/schema';
import { apiClient } from '../services/apiClient';
import { 
  User as UserIcon, 
  Calendar, 
  Mail, 
  Award, 
  LayoutGrid, 
  Disc, 
  CheckCircle2, 
  Clock, 
  Play, 
  Pause,
  UserCheck, 
  UserPlus, 
  DollarSign, 
  Lock, 
  Unlock,
  Radio,
  Music,
  Headphones,
  Sparkles,
  Upload,
  ArrowLeft,
  Share2,
  Edit3,
  Save,
  X,
  Star,
  Sliders,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  Flame,
  Volume2,
  ExternalLink
} from 'lucide-react';

interface UserProfileViewProps {
  viewUserId: string;
  currentUserId: string;
  onPlayTrack: (submission: Submission) => void;
  currentTrackId?: string;
  isPlaying?: boolean;
  onOpenBoard: (boardId: string) => void;
  onOpenSongProfile?: (songIdOrSubId: string) => void;
  onOpenUserProfile?: (userId: string) => void;
  onCheckoutPendingTrack: (submission: Submission) => void;
  onToggleSubscription: () => void;
  onBack?: () => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  viewUserId,
  currentUserId,
  onPlayTrack,
  currentTrackId,
  isPlaying,
  onOpenBoard,
  onOpenSongProfile,
  onOpenUserProfile,
  onCheckoutPendingTrack,
  onToggleSubscription,
  onBack,
}) => {
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [followPending, setFollowPending] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'boards' | 'songs' | 'rated' | 'influence'>('boards');
  const [ratedFilter, setRatedFilter] = useState<'all' | 'curator' | 'crowd'>('all');
  
  // Follow modal state
  const [showFollowModal, setShowFollowModal] = useState<'followers' | 'following' | null>(null);

  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const isSelf = viewUserId === currentUserId;

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getUserProfile(viewUserId, currentUserId);
      setProfileData(data);
      setIsFollowing(Boolean(data.isFollowing));
      setEditFirstName(data.user.first_name);
      setEditLastName(data.user.last_name);
      setEditBio(data.user.bio || '');
    } catch (err) {
      console.error('Failed to load user profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [viewUserId, currentUserId]);

  const handleToggleFollow = async () => {
    if (isSelf || followPending) return;
    setFollowPending(true);
    // Optimistic toggle
    const nextState = !isFollowing;
    setIsFollowing(nextState);
    if (profileData) {
      setProfileData({
        ...profileData,
        followersCount: nextState 
          ? profileData.followersCount + 1 
          : Math.max(0, profileData.followersCount - 1),
      });
    }

    try {
      const actualState = await apiClient.toggleFollow(currentUserId, viewUserId);
      setIsFollowing(actualState);
      // Reload fresh relations
      const fresh = await apiClient.getUserProfile(viewUserId, currentUserId);
      setProfileData(fresh);
    } catch (err) {
      console.error('Failed to toggle follow status:', err);
      // Revert optimistic
      setIsFollowing(!nextState);
      loadData();
    } finally {
      setFollowPending(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profileData) return;
    setIsSavingProfile(true);
    try {
      const updated = await apiClient.updateUserProfile(viewUserId, {
        first_name: editFirstName,
        last_name: editLastName,
        bio: editBio,
      });
      setProfileData({
        ...profileData,
        user: updated,
      });
      setIsEditingProfile(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleShareProfile = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  if (loading || !profileData) {
    return (
      <div className="bg-zinc-950/80 border border-zinc-800 rounded-3xl p-16 text-center space-y-4">
        <div className="w-12 h-12 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <div className="text-xs font-mono text-zinc-400 uppercase tracking-widest">
          Loading Scofen Public Profile...
        </div>
      </div>
    );
  }

  const { user, hostedBoards, submittedTracks, followersCount, followingCount, followers, following, influenceEvents, ratedTracks } = profileData;

  // Filtered rated tracks
  const filteredRatedTracks = (ratedTracks || []).filter((r) => {
    if (ratedFilter === 'curator') return r.evaluation_role === 'curator';
    if (ratedFilter === 'crowd') return r.evaluation_role === 'crowd_voter';
    return true;
  });

  return (
    <div className="space-y-8 pb-20">
      {/* Top Navigation Bar / Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack || (() => window.history.back())}
          className="inline-flex items-center space-x-2 text-xs font-mono text-zinc-400 hover:text-white transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>BACK TO DISCOVERY</span>
        </button>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleShareProfile}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 font-mono transition-colors cursor-pointer"
            title="Share Public Profile"
          >
            <Share2 className="w-3.5 h-3.5 text-zinc-400" />
            <span>{copiedLink ? 'COPIED LINK' : 'SHARE'}</span>
          </button>

          {isSelf && (
            <button
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 font-mono transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isEditingProfile ? 'CANCEL' : 'EDIT PROFILE'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Public Profile Card Header */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-950 to-black border border-zinc-800 p-6 sm:p-8 shadow-2xl">
        {/* Subtle ambient accent glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-8">
          {/* Identity info */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
            {/* Avatar with authority glow */}
            <div className="relative shrink-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-700 to-zinc-900 p-1 shadow-2xl">
                <div className="w-full h-full rounded-[22px] bg-zinc-950 flex items-center justify-center text-3xl font-black text-emerald-400 font-mono">
                  {user.first_name?.[0] || 'U'}{user.last_name?.[0] || ''}
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-emerald-500 text-zinc-950 text-[10px] font-black uppercase tracking-wider shadow-lg flex items-center space-x-1">
                <Radio className="w-2.5 h-2.5" />
                <span>PRO</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {user.first_name} {user.last_name}
                </h1>
                
                {/* Role badge */}
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700 uppercase tracking-wider">
                  {user.role || (user.email === 'scofenreborn@gmail.com' ? 'Protocol Admin' : 'Artist')}
                </span>

                {user.assessment_status === 'assessed' && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Vetted Curator</span>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-zinc-400">
                <span className="flex items-center space-x-1 text-zinc-300">
                  <Mail className="w-3 h-3 text-zinc-500" />
                  <span>{user.email}</span>
                </span>
                <span>•</span>
                <span className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3 text-zinc-500" />
                  <span>Joined {new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
                </span>
              </div>

              {/* Bio / Manifesto */}
              {isEditingProfile ? (
                <div className="space-y-3 pt-2 max-w-xl">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-mono uppercase text-zinc-400">First Name</label>
                      <input
                        type="text"
                        value={editFirstName}
                        onChange={(e) => setEditFirstName(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono uppercase text-zinc-400">Last Name</label>
                      <input
                        type="text"
                        value={editLastName}
                        onChange={(e) => setEditLastName(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase text-zinc-400">Artist Statement / Bio</label>
                    <textarea
                      rows={3}
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      placeholder="Share your musical style, production gear, curation criteria, or release history..."
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 leading-relaxed font-sans"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleSaveProfile}
                      disabled={isSavingProfile}
                      className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSavingProfile ? 'SAVING...' : 'SAVE CHANGES'}</span>
                    </button>
                    <button
                      onClick={() => setIsEditingProfile(false)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white text-xs font-mono cursor-pointer"
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-zinc-300 max-w-2xl leading-relaxed pt-1">
                  {user.bio || 'Independent music artist and verified evaluator on the Scofen discovery network.'}
                </p>
              )}
            </div>
          </div>

          {/* Authority card & Action buttons */}
          <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-between gap-5 border-t md:border-t-0 pt-4 md:pt-0 border-zinc-800/80">
            {/* Influence Points Indicator */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 w-full md:w-56 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Influence Points</span>
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black text-white font-mono">{user.influence_points}</span>
                <span className="text-xs font-mono text-emerald-400 font-semibold">PTS</span>
              </div>
              <div className="text-[10px] text-zinc-500 font-mono">
                Voting Weight: <strong className="text-zinc-300">{(user.influence_points / 100).toFixed(2)}x</strong>
              </div>
              {user.influence_points >= 100 ? (
                <div className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center space-x-1">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  <span>Board Hosting Unlocked</span>
                </div>
              ) : (
                <div className="text-[10px] font-mono text-zinc-500 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                  {100 - user.influence_points} PTS to Host Boards
                </div>
              )}
            </div>

            {/* Social Counts & Action */}
            <div className="flex items-center space-x-6 text-xs w-full md:w-auto justify-between md:justify-end">
              <button
                onClick={() => setShowFollowModal('followers')}
                className="text-left md:text-right hover:opacity-80 transition-opacity cursor-pointer group"
              >
                <div className="text-lg font-black text-white font-mono group-hover:text-emerald-400 transition-colors">
                  {followersCount}
                </div>
                <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">
                  Followers
                </div>
              </button>

              <button
                onClick={() => setShowFollowModal('following')}
                className="text-left md:text-right hover:opacity-80 transition-opacity cursor-pointer group"
              >
                <div className="text-lg font-black text-white font-mono group-hover:text-emerald-400 transition-colors">
                  {followingCount}
                </div>
                <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">
                  Following
                </div>
              </button>
            </div>

            {/* Follow / Subscription Action */}
            <div className="w-full md:w-auto">
              {!isSelf ? (
                <button
                  type="button"
                  disabled={followPending}
                  onClick={handleToggleFollow}
                  className={`w-full md:w-auto px-6 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-lg ${
                    isFollowing
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <UserCheck className="w-4 h-4 text-emerald-400" />
                      <span>FOLLOWING</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>FOLLOW ARTIST</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="w-full md:w-auto px-5 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center justify-center space-x-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <Headphones className="w-3.5 h-3.5 text-emerald-400" />
                  <span>PRODUCER SUITE ACTIVE</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex border-b border-zinc-800 overflow-x-auto space-x-8">
        <button
          onClick={() => setActiveTab('boards')}
          className={`pb-3 text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'boards'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Disc className="w-4 h-4" />
          <span>Curated Boards ({hostedBoards.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('songs')}
          className={`pb-3 text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'songs'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Music className="w-4 h-4" />
          <span>Submitted Songs ({submittedTracks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('rated')}
          className={`pb-3 text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'rated'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Star className="w-4 h-4" />
          <span>Rated Songs ({ratedTracks?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('influence')}
          className={`pb-3 text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'influence'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Influence Ledger ({influenceEvents?.length || 0})</span>
        </button>
      </div>

      {/* TAB CONTENT 1: HOSTED BOARDS */}
      {activeTab === 'boards' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
            <span>BOARDS ESTABLISHED & CURATED BY {user.first_name.toUpperCase()}</span>
            <span>TOTAL: {hostedBoards.length}</span>
          </div>

          {hostedBoards.length === 0 ? (
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-12 text-center space-y-3">
              <Disc className="w-8 h-8 text-zinc-600 mx-auto" />
              <div className="text-sm font-semibold text-white">No Curator Boards Established Yet</div>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                {user.first_name} has not created any public evaluation battlefields. Once their authority balance hits 100 PTS, they can establish curation rooms.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {hostedBoards.map((b) => (
                <div
                  key={b.id}
                  className="bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-5 space-y-4 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                        {b.genre || 'Electronic / Hybrid'}
                      </span>
                      <h3
                        onClick={() => onOpenBoard(b.id)}
                        className="text-base font-bold text-white hover:text-emerald-400 transition-colors cursor-pointer"
                      >
                        {b.title}
                      </h3>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30 shrink-0">
                      ${b.entry_fee.toFixed(2)} Fee
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400 line-clamp-2">
                    {b.description || 'Evaluation and curation test board hosted on Scofen.'}
                  </p>

                  {/* Board Criteria */}
                  {b.criteria && b.criteria.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {b.criteria.map((crit) => (
                        <span
                          key={crit.id}
                          className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-950 text-zinc-300 border border-zinc-800"
                        >
                          {crit.criterion_name} ({crit.weight}%)
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-zinc-800 text-xs font-mono">
                    <span className="text-zinc-500">
                      Submissions: <strong className="text-zinc-300">{b.submissions_count || 0}</strong>
                    </span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onOpenBoard(b.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center space-x-1 cursor-pointer transition-colors"
                      >
                        <Upload className="w-3 h-3" />
                        <span>ENTER BOARD</span>
                      </button>
                      <button
                        onClick={() => onOpenBoard(b.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs flex items-center space-x-1 cursor-pointer"
                      >
                        <span>VIEW →</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 2: SUBMITTED SONGS / DISCOGRAPHY */}
      {activeTab === 'songs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
            <span>SONGS SUBMITTED BY {user.first_name.toUpperCase()} ACROSS BOARDS</span>
            <span>TOTAL: {submittedTracks.length}</span>
          </div>

          {submittedTracks.length === 0 ? (
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-12 text-center space-y-3">
              <Music className="w-8 h-8 text-zinc-600 mx-auto" />
              <div className="text-sm font-semibold text-white">No Tracks Submitted Yet</div>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                {user.first_name} has not submitted any original tracks to Scofen boards yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {submittedTracks.map((sub) => {
                const isThisTrackPlaying = isPlaying && currentTrackId === sub.id;
                const isPaid = sub.payment_status === 'confirmed';

                return (
                  <div
                    key={sub.id}
                    className="bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 transition-colors space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Left: Play button and Song info */}
                      <div className="flex items-start sm:items-center space-x-3.5 min-w-0">
                        <button
                          type="button"
                          onClick={() => onPlayTrack(sub)}
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-all cursor-pointer ${
                            isThisTrackPlaying
                              ? 'bg-emerald-500 text-zinc-950 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                              : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-emerald-500/50 hover:text-emerald-400'
                          }`}
                          title={isThisTrackPlaying ? 'Pause Playback' : 'Play Track'}
                        >
                          {isThisTrackPlaying ? (
                            <Pause className="w-5 h-5 fill-current" />
                          ) : (
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                          )}
                        </button>

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3
                              onClick={() => onOpenSongProfile?.(sub.song_id || sub.id)}
                              className="text-sm font-bold text-white hover:text-emerald-400 transition-colors cursor-pointer truncate"
                            >
                              {sub.track_title}
                            </h3>

                            {/* Entry Mode pill */}
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 uppercase">
                              {sub.entry_mode === 'curator_skip' ? 'Curator Skip' : 'Crowd Pool'}
                            </span>

                            {isPaid ? (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                <span>CONFIRMED</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center space-x-1">
                                <Clock className="w-2.5 h-2.5" />
                                <span>UNPAID</span>
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 font-mono">
                            <span
                              onClick={() => sub.board_id && onOpenBoard(sub.board_id)}
                              className="hover:text-emerald-400 transition-colors cursor-pointer"
                            >
                              Board: <strong className="text-zinc-200">{sub.board?.title || 'Active Board'}</strong>
                            </span>
                            <span>•</span>
                            <span>{sub.genre || 'Electronic'}</span>
                            {sub.bpm && (
                              <>
                                <span>•</span>
                                <span>{sub.bpm} BPM</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Scores */}
                      <div className="flex items-center space-x-4 self-end sm:self-center shrink-0">
                        {sub.crowd_rating !== null && (
                          <div className="text-right">
                            <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">Crowd</div>
                            <div className="text-xs font-mono font-bold text-zinc-300">
                              {sub.crowd_rating.toFixed(1)}
                            </div>
                          </div>
                        )}

                        <div className="text-right pl-3 border-l border-zinc-800">
                          <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">Score</div>
                          <div className={`text-base font-mono font-black ${
                            sub.final_score >= 88 ? 'text-emerald-400' : 'text-zinc-100'
                          }`}>
                            {sub.final_score > 0 ? `${sub.final_score.toFixed(1)} PTS` : 'Pending'}
                          </div>
                        </div>

                        {onOpenSongProfile && (
                          <button
                            onClick={() => onOpenSongProfile(sub.song_id || sub.id)}
                            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                            title="Open Song Profile & Lyrics"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Criteria score chips if evaluated */}
                    {sub.scores && sub.scores.length > 0 && isPaid && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-2 border-t border-zinc-800/80 text-[10px] font-mono">
                        {sub.scores.map((sc) => (
                          <div key={sc.id} className="bg-zinc-950 p-2 rounded-lg border border-zinc-800/80 flex items-center justify-between">
                            <span className="text-zinc-400 truncate max-w-[100px]">{sc.criterion_name}</span>
                            <span className="text-emerald-400 font-bold">{sc.raw_score}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Unpaid checkout CTA if self */}
                    {!isPaid && isSelf && (
                      <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                        <span className="text-xs font-mono text-amber-300">
                          Entry fee unpaid. Complete checkout to unlock curation review.
                        </span>
                        <button
                          onClick={() => onCheckoutPendingTrack(sub)}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-mono font-bold flex items-center space-x-1 cursor-pointer"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>Pay Entry (${sub.board?.entry_fee.toFixed(2) || '5.00'})</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 3: RATED SONGS & CURATION HISTORY ("rated songs etc.") */}
      {activeTab === 'rated' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
            <span className="text-zinc-400">
              SONGS RATED & EVALUATED BY {user.first_name.toUpperCase()} ({filteredRatedTracks.length})
            </span>

            {/* Filter pills */}
            <div className="flex items-center space-x-1.5 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
              <button
                onClick={() => setRatedFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                  ratedFilter === 'all' ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
                }`}
              >
                All ({ratedTracks?.length || 0})
              </button>
              <button
                onClick={() => setRatedFilter('curator')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                  ratedFilter === 'curator' ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Curator Reviews ({ratedTracks?.filter((r) => r.evaluation_role === 'curator').length || 0})
              </button>
              <button
                onClick={() => setRatedFilter('crowd')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                  ratedFilter === 'crowd' ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Crowd Ratings ({ratedTracks?.filter((r) => r.evaluation_role === 'crowd_voter').length || 0})
              </button>
            </div>
          </div>

          {filteredRatedTracks.length === 0 ? (
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-12 text-center space-y-3">
              <Star className="w-8 h-8 text-zinc-600 mx-auto" />
              <div className="text-sm font-semibold text-white">No Track Evaluations Found</div>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                {user.first_name} has not submitted any crowd votes or curator scorecards in this category yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRatedTracks.map((item, idx) => {
                const isThisTrackPlaying = isPlaying && currentTrackId === item.submission_id;

                return (
                  <div
                    key={`${item.submission_id}-${idx}`}
                    className="bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 transition-colors space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Left: Play button and track info */}
                      <div className="flex items-start sm:items-center space-x-3.5 min-w-0">
                        <button
                          type="button"
                          onClick={() => {
                            // Construct submission mock for playback
                            const mockSub: Submission = {
                              id: item.submission_id,
                              board_id: item.board_id,
                              owner_id: item.artist_id || '',
                              track_title: item.track_title,
                              audio_url: item.audio_url || '',
                              preview_url: item.audio_url || '',
                              entry_mode: 'crowd_pool',
                              curator_fee_paid: 0,
                              payment_status: 'confirmed',
                              crowd_rating: item.crowd_rating,
                              curator_rating: item.curator_rating,
                              final_score: item.final_score,
                              is_locked: item.is_locked,
                              escalation_status: 'crowd_pool',
                              streaming_status: 'none',
                              created_at: item.rated_at,
                              audio_preset: item.audio_preset || 'cyber_bass',
                              genre: item.genre,
                            };
                            onPlayTrack(mockSub);
                          }}
                          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-all cursor-pointer ${
                            isThisTrackPlaying
                              ? 'bg-emerald-500 text-zinc-950 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                              : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-emerald-500/50 hover:text-emerald-400'
                          }`}
                          title="Play Track"
                        >
                          {isThisTrackPlaying ? (
                            <Pause className="w-4 h-4 fill-current" />
                          ) : (
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          )}
                        </button>

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3
                              onClick={() => onOpenSongProfile?.(item.submission_id)}
                              className="text-sm font-bold text-white hover:text-emerald-400 transition-colors cursor-pointer truncate"
                            >
                              {item.track_title}
                            </h3>

                            {/* Evaluation Role Tag */}
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                              item.evaluation_role === 'curator'
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                            }`}>
                              {item.evaluation_role === 'curator' ? 'Curator Scorecard' : 'Crowd Rating Vote'}
                            </span>

                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                              item.is_locked
                                ? 'bg-zinc-800 text-zinc-300'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            }`}>
                              {item.status}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 font-mono">
                            {/* Clickable Artist Avatar & Name */}
                            <span className="inline-flex items-center space-x-1.5">
                              <span className="text-zinc-500">Artist:</span>
                              {item.artist_id && onOpenUserProfile ? (
                                <button
                                  type="button"
                                  onClick={() => onOpenUserProfile(item.artist_id!)}
                                  className="inline-flex items-center space-x-1.5 text-zinc-200 hover:text-emerald-400 font-semibold transition-colors cursor-pointer group"
                                  title={`View ${item.artist_name}'s public profile`}
                                >
                                  <span className="w-4 h-4 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[8px] font-bold text-zinc-300 group-hover:border-emerald-500 group-hover:text-emerald-400 transition-colors">
                                    {item.artist_name?.[0] || 'A'}
                                  </span>
                                  <span className="underline underline-offset-2">
                                    {item.artist_name}
                                  </span>
                                </button>
                              ) : (
                                <strong className="text-zinc-200">{item.artist_name}</strong>
                              )}
                            </span>
                            <span>•</span>
                            <span
                              onClick={() => onOpenBoard(item.board_id)}
                              className="hover:text-emerald-400 transition-colors cursor-pointer"
                            >
                              Board: <strong className="text-zinc-200">{item.board_title}</strong>
                            </span>
                            <span>•</span>
                            <span>{new Date(item.rated_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: User's given score & track final score */}
                      <div className="flex items-center space-x-5 self-end sm:self-center shrink-0">
                        <div className="text-right">
                          <div className="text-[10px] uppercase font-mono tracking-wider text-emerald-400 font-bold">
                            Score Awarded
                          </div>
                          <div className="text-lg font-mono font-black text-emerald-400">
                            {item.user_score.toFixed(1)} PTS
                          </div>
                        </div>

                        <div className="text-right pl-4 border-l border-zinc-800">
                          <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">
                            Final Score
                          </div>
                          <div className="text-sm font-mono font-bold text-zinc-300">
                            {item.final_score > 0 ? `${item.final_score.toFixed(1)} PTS` : 'In Progress'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Breakdown scores */}
                    {item.dimension_scores && Object.keys(item.dimension_scores).length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-zinc-800/80 text-[10px] font-mono">
                        {Object.entries(item.dimension_scores).map(([critId, score]) => (
                          <div key={critId} className="bg-zinc-950 p-2 rounded-lg border border-zinc-800/80 flex items-center justify-between">
                            <span className="text-zinc-400 truncate">Criterion Score</span>
                            <span className="text-emerald-400 font-bold">{score} / 100</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Influence delta reasoning */}
                    {item.influence_reason && (
                      <div className="text-[11px] font-mono text-zinc-400 bg-zinc-950/70 p-2.5 rounded-xl border border-zinc-800/60 flex items-center justify-between">
                        <span className="truncate pr-2">{item.influence_reason}</span>
                        {item.influence_delta !== null && item.influence_delta !== 0 && (
                          <span className={`shrink-0 font-bold ${
                            item.influence_delta > 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {item.influence_delta > 0 ? `+${item.influence_delta}` : item.influence_delta} PTS
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 4: INFLUENCE & ACTIVITY LEDGER */}
      {activeTab === 'influence' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
            <span>INFLUENCE REWARD EVENTS & AUTHORITY TIMELINE</span>
            <span>BALANCE: {user.influence_points} PTS</span>
          </div>

          {influenceEvents?.length === 0 ? (
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-12 text-center space-y-3">
              <TrendingUp className="w-8 h-8 text-zinc-600 mx-auto" />
              <div className="text-sm font-semibold text-white">No Influence Events Logged Yet</div>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                Ratings submitted by {user.first_name} that align with community consensus generate points and appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 font-mono text-xs">
              {influenceEvents?.map((ev, idx) => (
                <div
                  key={`${ev.submission_id}-${ev.timestamp}-${idx}`}
                  className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 flex items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        ev.point_delta >= 0 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}>
                        {ev.point_delta >= 0 ? `+${ev.point_delta} PTS` : `${ev.point_delta} PTS`}
                      </span>
                      <span className="text-white font-medium truncate">{ev.reason}</span>
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      {new Date(ev.timestamp).toLocaleString()}
                    </div>
                  </div>

                  <span className="text-xs text-zinc-400 font-bold shrink-0">
                    Verified
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FOLLOWERS / FOLLOWING LIST MODAL */}
      {showFollowModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2">
                <UserIcon className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  {showFollowModal === 'followers' ? `Followers (${followersCount})` : `Following (${followingCount})`}
                </h3>
              </div>
              <button
                onClick={() => setShowFollowModal(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {(showFollowModal === 'followers' ? followers : following)?.length === 0 ? (
                <div className="text-center py-8 text-xs text-zinc-500 font-mono">
                  No {showFollowModal} recorded yet.
                </div>
              ) : (
                (showFollowModal === 'followers' ? followers : following)?.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-colors"
                  >
                    <div 
                      onClick={() => {
                        setShowFollowModal(null);
                        onOpenUserProfile?.(u.id);
                      }}
                      className="flex items-center space-x-3 min-w-0 pr-2 cursor-pointer group flex-1"
                      title={`View ${u.first_name}'s public profile`}
                    >
                      <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 group-hover:border-emerald-500 flex items-center justify-center text-xs font-bold text-emerald-400 font-mono shrink-0 transition-colors">
                        {u.first_name[0]}{u.last_name[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                          {u.first_name} {u.last_name}
                        </div>
                        <div className="text-[10px] font-mono text-zinc-400 flex items-center space-x-1 truncate">
                          <span className="text-emerald-400">{u.influence_points} PTS</span>
                          <span>•</span>
                          <span className="uppercase text-zinc-500">{u.role || 'Artist'}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowFollowModal(null);
                        onOpenUserProfile?.(u.id);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-emerald-500 hover:text-zinc-950 text-xs font-mono font-semibold text-zinc-200 transition-colors cursor-pointer shrink-0"
                    >
                      VIEW PROFILE
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-zinc-800 text-right">
              <button
                onClick={() => setShowFollowModal(null)}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-mono text-zinc-300 cursor-pointer"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
