import React, { useState, useEffect } from 'react';
import { SongProfile, User, Board, Submission } from '../types/schema';
import { apiClient } from '../services/apiClient';
import { 
  Play, 
  Pause, 
  X, 
  Disc, 
  Edit3, 
  FileText, 
  Layers, 
  CheckCircle2, 
  Lock, 
  Plus, 
  ExternalLink,
  Music,
  ArrowRight,
  TrendingUp,
  Sliders,
  DollarSign,
  AlertCircle
} from 'lucide-react';

interface SongProfileModalProps {
  songIdOrSubId: string;
  currentUser: User;
  boards: Board[];
  onClose: () => void;
  onPlayTrack: (track: Submission) => void;
  currentTrackId?: string;
  isPlaying?: boolean;
  onSongUpdated?: () => void;
  onOpenUserProfile?: (userId: string) => void;
}

export const SongProfileModal: React.FC<SongProfileModalProps> = ({
  songIdOrSubId,
  currentUser,
  boards,
  onClose,
  onPlayTrack,
  currentTrackId,
  isPlaying,
  onSongUpdated,
  onOpenUserProfile,
}) => {
  const [profile, setProfile] = useState<SongProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form edit state
  const [activeTab, setActiveTab] = useState<'boards' | 'lyrics' | 'edit'>('boards');
  const [editTitle, setEditTitle] = useState('');
  const [editGenre, setEditGenre] = useState('');
  const [editLyrics, setEditLyrics] = useState('');
  const [editAbout, setEditAbout] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Enter another board state
  const [showEnterBoardModal, setShowEnterBoardModal] = useState(false);
  const [selectedTargetBoardId, setSelectedTargetBoardId] = useState<string>('');
  const [selectedEntryMode, setSelectedEntryMode] = useState<'crowd_pool' | 'curator_skip'>('crowd_pool');
  const [isEnteringBoard, setIsEnteringBoard] = useState(false);
  const [enterBoardError, setEnterBoardError] = useState<string | null>(null);

  // Load song profile
  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getSongProfile(songIdOrSubId);
      setProfile(data);
      setEditTitle(data.track_title);
      setEditGenre(data.genre);
      setEditLyrics(data.lyrics || '');
      setEditAbout(data.about_track || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load song profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [songIdOrSubId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      setIsSaving(true);
      setSaveSuccess(false);
      const updated = await apiClient.updateSongProfile(profile.song_id, {
        track_title: editTitle,
        genre: editGenre,
        lyrics: editLyrics,
        about_track: editAbout,
      });
      setProfile(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      if (onSongUpdated) onSongUpdated();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEnterAnotherBoard = async () => {
    if (!profile || !selectedTargetBoardId) return;
    try {
      setIsEnteringBoard(true);
      setEnterBoardError(null);
      const res = await apiClient.enterSongIntoBoard(profile.song_id, selectedTargetBoardId, selectedEntryMode);
      setProfile(res.songProfile);
      setShowEnterBoardModal(false);
      setSelectedTargetBoardId('');
      if (onSongUpdated) onSongUpdated();
    } catch (err) {
      setEnterBoardError(err instanceof Error ? err.message : 'Failed to enter board');
    } finally {
      setIsEnteringBoard(false);
    }
  };

  // Build a dummy or real Submission object to pass to onPlayTrack
  const buildCurrentSubmission = (): Submission | null => {
    if (!profile) return null;
    const firstEntry = profile.entries[0];
    return {
      id: firstEntry ? firstEntry.submission_id : profile.song_id,
      song_id: profile.song_id,
      board_id: firstEntry ? firstEntry.board_id : (boards[0]?.id || ''),
      owner_id: profile.owner_id,
      track_title: profile.track_title,
      lyrics: profile.lyrics,
      audio_url: profile.audio_url,
      preview_url: profile.preview_url,
      entry_mode: firstEntry ? firstEntry.entry_mode : 'crowd_pool',
      curator_fee_paid: firstEntry ? firstEntry.curator_fee_paid : 0,
      payment_status: 'confirmed',
      crowd_rating: firstEntry ? firstEntry.crowd_rating : null,
      curator_rating: firstEntry ? firstEntry.curator_rating : null,
      final_score: firstEntry ? firstEntry.final_score : 0,
      is_locked: firstEntry ? firstEntry.is_locked : false,
      escalation_status: firstEntry ? firstEntry.escalation_status : 'crowd_pool',
      streaming_status: firstEntry ? firstEntry.streaming_status : 'none',
      bpm: profile.bpm,
      genre: profile.genre,
      cover_gradient: profile.cover_gradient,
      duration_seconds: profile.duration_seconds,
      created_at: profile.created_at,
    };
  };

  const isCurrentTrackPlaying = profile && currentTrackId === (profile.entries[0]?.submission_id || profile.song_id) && isPlaying;

  // Filter available boards that this track has NOT entered yet
  const availableBoards = boards.filter(
    (b) => !profile?.entries.some((entry) => entry.board_id === b.id)
  );

  const selectedTargetBoard = boards.find((b) => b.id === selectedTargetBoardId);
  const curatorFeeForSelectedBoard = selectedTargetBoard ? Number((selectedTargetBoard.entry_fee || 10).toFixed(2)) : 0;

  const isOwnerOrAdmin = profile && (profile.owner_id === currentUser.id || currentUser.role === 'admin');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60">
          <div className="flex items-center space-x-2.5">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Music className="w-4 h-4" />
            </span>
            <div>
              <span className="text-xs uppercase tracking-wider font-bold text-zinc-400">Song Architecture Profile</span>
              <span className="text-[11px] text-zinc-500 font-mono ml-2">ID: {profile?.song_id.slice(0, 13)}...</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="py-20 text-center text-sm font-mono text-zinc-500">
              Loading song profile & board ledger records...
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {profile && (
            <>
              {/* Song Hero Banner */}
              <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900/40 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="flex items-center space-x-5">
                  {/* Artwork & Play overlay */}
                  <div className={`relative w-24 h-24 rounded-2xl bg-gradient-to-br ${profile.cover_gradient} flex-shrink-0 shadow-xl border border-white/10 flex items-center justify-center overflow-hidden group`}>
                    <button
                      onClick={() => {
                        const sub = buildCurrentSubmission();
                        if (sub) onPlayTrack(sub);
                      }}
                      className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 text-white flex items-center justify-center hover:scale-105 transition-transform"
                    >
                      {isCurrentTrackPlaying ? (
                        <Pause className="w-5 h-5 text-emerald-400 fill-emerald-400" />
                      ) : (
                        <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                      )}
                    </button>
                    {isCurrentTrackPlaying && (
                      <div className="absolute bottom-1 inset-x-2 flex items-center justify-center space-x-0.5">
                        <span className="w-1 h-3 bg-emerald-400 animate-pulse rounded-full" />
                        <span className="w-1 h-5 bg-emerald-400 animate-pulse delay-75 rounded-full" />
                        <span className="w-1 h-2 bg-emerald-400 animate-pulse delay-150 rounded-full" />
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium">
                        {profile.genre}
                      </span>
                      <span className="text-xs text-zinc-500 font-mono">
                        {profile.bpm} BPM • {Math.floor(profile.duration_seconds / 60)}:{String(profile.duration_seconds % 60).padStart(2, '0')}
                      </span>
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">{profile.track_title}</h1>
                    <div className="flex items-center space-x-2 text-sm text-zinc-400 font-medium mt-1">
                      <span>Artist:</span>
                      {onOpenUserProfile && profile.owner_id ? (
                        <div
                          onClick={() => {
                            onClose();
                            onOpenUserProfile(profile.owner_id);
                          }}
                          className="inline-flex items-center space-x-1.5 cursor-pointer group"
                          title={`View ${profile.owner_name}'s public profile`}
                        >
                          <div className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[9px] font-bold text-zinc-300 group-hover:border-emerald-500 group-hover:text-emerald-400 transition-colors">
                            {profile.owner_name?.[0] || 'A'}
                          </div>
                          <span className="text-emerald-400 group-hover:text-emerald-300 font-semibold underline underline-offset-2 transition-colors">
                            {profile.owner_name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-zinc-200">{profile.owner_name}</span>
                      )}
                    </div>
                    {profile.about_track && (
                      <p className="text-xs text-zinc-300 italic mt-2 bg-zinc-900/80 border border-zinc-800/80 px-3.5 py-2 rounded-xl max-w-xl">
                        "{profile.about_track}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Right side CTA: Enter another board (only for song owner) */}
                {profile.owner_id === currentUser.id && (
                  <div className="flex items-center space-x-3 w-full sm:w-auto">
                    <button
                      onClick={() => setShowEnterBoardModal(true)}
                      className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition-colors shadow-lg shadow-emerald-500/20"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Enter Another Board</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center space-x-2 border-b border-zinc-800 pb-2">
                <button
                  onClick={() => setActiveTab('boards')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    activeTab === 'boards'
                      ? 'bg-zinc-800 text-white border border-zinc-700'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  <Disc className="w-4 h-4 text-emerald-400" />
                  <span>Boards Entered ({profile.entries.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('lyrics')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    activeTab === 'lyrics'
                      ? 'bg-zinc-800 text-white border border-zinc-700'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  <FileText className="w-4 h-4 text-teal-400" />
                  <span>Lyrics Sheet</span>
                </button>
                {isOwnerOrAdmin && (
                  <button
                    onClick={() => setActiveTab('edit')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      activeTab === 'edit'
                        ? 'bg-zinc-800 text-white border border-zinc-700'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                    }`}
                  >
                    <Edit3 className="w-4 h-4 text-amber-400" />
                    <span>Edit Song Details</span>
                  </button>
                )}
              </div>

              {/* Tab 1: Boards Entered */}
              {activeTab === 'boards' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider font-mono">
                      Battlefield Deployments across Domain Boards
                    </h2>
                    <span className="text-xs text-zinc-400">
                      Total Entries: {profile.entries.length}
                    </span>
                  </div>

                  {profile.entries.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl bg-zinc-900/40 border border-zinc-800 text-zinc-500 text-xs">
                      This song has not yet entered any boards. Click "Enter Another Board" to launch a campaign.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3.5">
                      {profile.entries.map((entry) => (
                        <div
                          key={entry.submission_id}
                          className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/90 hover:border-zinc-700 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                        >
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                              <span className="text-sm font-bold text-white tracking-wide">
                                {entry.board_title}
                              </span>
                              <div className="flex items-center space-x-1.5 text-xs text-zinc-400">
                                <span>Host Curator:</span>
                                {entry.curator_id && onOpenUserProfile ? (
                                  <div
                                    onClick={() => {
                                      onClose();
                                      onOpenUserProfile(entry.curator_id!);
                                    }}
                                    className="inline-flex items-center space-x-1 cursor-pointer group"
                                    title={`View ${entry.curator_name}'s public profile`}
                                  >
                                    <div className="w-4 h-4 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[8px] font-bold text-zinc-300 group-hover:border-emerald-500 group-hover:text-emerald-400 transition-colors">
                                      {entry.curator_name?.[0] || 'C'}
                                    </div>
                                    <span className="text-zinc-300 group-hover:text-emerald-400 font-semibold underline underline-offset-2 transition-colors">
                                      {entry.curator_name}
                                    </span>
                                  </div>
                                ) : (
                                  <strong className="text-zinc-300">{entry.curator_name}</strong>
                                )}
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                                entry.entry_mode === 'curator_skip'
                                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                  : 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                              }`}>
                                {entry.entry_mode === 'curator_skip' ? 'Curator Skip' : 'Crowd Pool'}
                              </span>
                              {entry.is_locked && (
                                <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
                                  <Lock className="w-3 h-3 text-amber-400" />
                                  <span>Rating Locked</span>
                                </span>
                              )}
                            </div>

                            <div className="text-xs text-zinc-400 flex items-center space-x-4">
                              <span>Entry Date: {new Date(entry.created_at).toLocaleDateString()}</span>
                              <span>Fee Paid: ${entry.curator_fee_paid > 0 ? entry.curator_fee_paid.toFixed(2) : '5.00'}</span>
                              <span className="font-mono text-emerald-400 font-medium">
                                Status: {entry.escalation_status.replace(/_/g, ' ')}
                              </span>
                            </div>
                          </div>

                          {/* Scores Snapshot */}
                          <div className="flex items-center space-x-3 bg-zinc-950/70 px-4 py-2.5 rounded-xl border border-zinc-800/80">
                            <div className="text-center px-2">
                              <div className="text-[10px] uppercase font-mono text-zinc-500 font-bold">Crowd</div>
                              <div className="text-sm font-bold text-zinc-300">
                                {entry.crowd_rating !== null ? entry.crowd_rating.toFixed(1) : '—'}
                              </div>
                            </div>
                            <div className="w-[1px] h-6 bg-zinc-800" />
                            <div className="text-center px-2">
                              <div className="text-[10px] uppercase font-mono text-zinc-500 font-bold">Curator</div>
                              <div className="text-sm font-bold text-zinc-300">
                                {entry.curator_rating !== null ? entry.curator_rating.toFixed(1) : '—'}
                              </div>
                            </div>
                            <div className="w-[1px] h-6 bg-zinc-800" />
                            <div className="text-center px-2">
                              <div className="text-[10px] uppercase font-mono text-emerald-400 font-bold">Combined (50:50)</div>
                              <div className="text-base font-extrabold text-emerald-400">
                                {entry.final_score > 0 ? entry.final_score.toFixed(1) : '0.0'}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Lyrics Sheet */}
              {activeTab === 'lyrics' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider font-mono">
                      Official Song Lyrics
                    </h2>
                    {isOwnerOrAdmin && (
                      <button
                        onClick={() => setActiveTab('edit')}
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center space-x-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Lyrics</span>
                      </button>
                    )}
                  </div>

                  <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-sm font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed shadow-inner">
                    {profile.lyrics && profile.lyrics.trim().length > 0 ? (
                      profile.lyrics
                    ) : (
                      <span className="text-zinc-500 italic">No lyrics provided for this track yet. Click "Edit Song Details" to add lyrics.</span>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: Edit Song Details */}
              {activeTab === 'edit' && isOwnerOrAdmin && (
                <form onSubmit={handleSave} className="space-y-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider font-mono">
                      Modify Track Metadata & Lyrics
                    </h2>
                    {saveSuccess && (
                      <span className="flex items-center space-x-1 text-xs text-emerald-400 font-semibold animate-in fade-in">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Changes Saved Successfully across all boards!</span>
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider font-mono">
                        Track Title
                      </label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        required
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider font-mono">
                        Genre
                      </label>
                      <input
                        type="text"
                        value={editGenre}
                        onChange={(e) => setEditGenre(e.target.value)}
                        required
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider font-mono">
                      About the Track (Story, Sync Inspiration & Background)
                    </label>
                    <textarea
                      rows={3}
                      value={editAbout}
                      onChange={(e) => setEditAbout(e.target.value)}
                      placeholder="Share the inspiration, sound design technique, emotional arc, or sync licensing mood..."
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-sans text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider font-mono">
                      Lyrics (Supports Verses, Chorus, Ad-libs)
                    </label>
                    <textarea
                      rows={6}
                      value={editLyrics}
                      onChange={(e) => setEditLyrics(e.target.value)}
                      placeholder="[Verse 1]&#10;Write lyrics here...&#10;&#10;[Chorus]&#10;Add chorus..."
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-mono text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors leading-relaxed"
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditTitle(profile.track_title);
                        setEditGenre(profile.genre);
                        setEditLyrics(profile.lyrics || '');
                        setEditAbout(profile.about_track || '');
                        setActiveTab('boards');
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold text-xs transition-colors shadow-lg shadow-emerald-500/20"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isSaving ? 'Saving Changes...' : 'Save Updates'}</span>
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>

      {/* Enter Another Board Sub-Modal */}
      {showEnterBoardModal && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2">
                <Disc className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Enter Song into Another Board
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowEnterBoardModal(false);
                  setEnterBoardError(null);
                }}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {enterBoardError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
                {enterBoardError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider font-mono">
                Select Destination Curator Board
              </label>
              {availableBoards.length === 0 ? (
                <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 text-center">
                  This song has already entered all currently available boards!
                </div>
              ) : (
                <select
                  value={selectedTargetBoardId}
                  onChange={(e) => setSelectedTargetBoardId(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Select a Board --</option>
                  {availableBoards.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} (Curator: {b.host?.first_name} {b.host?.last_name} • Fee: ${b.entry_fee.toFixed(2)})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedTargetBoard && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono">
                  Select Entry Logistics
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedEntryMode('crowd_pool')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedEntryMode === 'crowd_pool'
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
                    }`}
                  >
                    <div className="text-xs font-bold text-white flex items-center justify-between">
                      <span>Crowd Pool</span>
                      <span className="text-emerald-400">$5.00</span>
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-1">
                      $3.50 held in board ledger, $1.50 Scofen margin
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedEntryMode('curator_skip')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedEntryMode === 'curator_skip'
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
                    }`}
                  >
                    <div className="text-xs font-bold text-white flex items-center justify-between">
                      <span>Curator Skip</span>
                      <span className="text-amber-400">${curatorFeeForSelectedBoard.toFixed(2)}</span>
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-1">
                      Direct rating by {selectedTargetBoard.host?.first_name}
                    </div>
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setShowEnterBoardModal(false);
                  setEnterBoardError(null);
                }}
                className="px-4 py-2 text-xs text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedTargetBoardId || isEnteringBoard}
                onClick={handleEnterAnotherBoard}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold text-xs transition-colors flex items-center space-x-2"
              >
                <span>{isEnteringBoard ? 'Deploying...' : 'Confirm Entry'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
