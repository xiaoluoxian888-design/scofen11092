import React, { useState, useEffect } from 'react';
import { User, ActivityFeedItem, Submission } from '../types/schema';
import { apiClient } from '../services/apiClient';
import { 
  Sparkles, 
  Play, 
  Pause, 
  Disc, 
  Flame, 
  UserPlus, 
  UserCheck, 
  Clock, 
  ChevronRight, 
  Radio, 
  Music, 
  ShieldCheck, 
  Filter, 
  ArrowUpRight,
  TrendingUp,
  Volume2
} from 'lucide-react';

interface WhatIsNewFeedProps {
  currentUser: User;
  onPlayTrack?: (submission: Submission) => void;
  currentTrackId?: string;
  isPlaying?: boolean;
  onOpenSongProfile?: (songId: string) => void;
  onNavigateToBoard?: (boardId: string) => void;
  onRefreshData?: () => void;
  onOpenUserProfile?: (userId: string) => void;
}

export const WhatIsNewFeed: React.FC<WhatIsNewFeedProps> = ({
  currentUser,
  onPlayTrack,
  currentTrackId,
  isPlaying,
  onOpenSongProfile,
  onNavigateToBoard,
  onRefreshData,
  onOpenUserProfile,
}) => {
  const [feedItems, setFeedItems] = useState<ActivityFeedItem[]>([]);
  const [followedUserIds, setFollowedUserIds] = useState<string[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'curate_track' | 'enter_board' | 'rate_track' | 'create_board'>('all');
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [togglePending, setTogglePending] = useState<Record<string, boolean>>({});

  const loadFeed = async () => {
    try {
      setLoading(true);
      const res = await apiClient.getWhatIsNew(currentUser.id);
      setFeedItems(res.feed || []);
      setFollowedUserIds(res.followedUserIds || []);
      setSuggestedUsers(res.suggestedUsers || []);

      const map: Record<string, boolean> = {};
      (res.followedUserIds || []).forEach((id: string) => {
        map[id] = true;
      });
      setFollowingMap(map);
    } catch (err) {
      console.error('Failed to load what is new feed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, [currentUser.id]);

  const handleToggleFollow = async (targetUser: User) => {
    try {
      setTogglePending((prev) => ({ ...prev, [targetUser.id]: true }));
      const newStatus = await apiClient.toggleFollow(currentUser.id, targetUser.id);
      setFollowingMap((prev) => ({ ...prev, [targetUser.id]: newStatus }));
      if (newStatus) {
        setFollowedUserIds((prev) => [...prev, targetUser.id]);
      } else {
        setFollowedUserIds((prev) => prev.filter((id) => id !== targetUser.id));
      }

      // Refresh feed in background to reflect new follow
      const updated = await apiClient.getWhatIsNew(currentUser.id);
      setFeedItems(updated.feed || []);
      setSuggestedUsers(updated.suggestedUsers || []);
      onRefreshData?.();
    } catch (err) {
      console.error('Toggle follow failed', err);
    } finally {
      setTogglePending((prev) => ({ ...prev, [targetUser.id]: false }));
    }
  };

  const handleTrackAction = (trackId?: string, trackTitle?: string) => {
    if (!trackId) return;
    if (onPlayTrack) {
      // Mock basic submission object if onPlayTrack expects it
      const sub: any = {
        id: trackId,
        track_title: trackTitle || 'Track',
        audio_url: '/audio/cyber_bass.wav',
        preview_url: '/audio/cyber_bass.wav',
        bpm: 124,
      };
      onPlayTrack(sub);
    }
  };

  const filteredItems = feedItems.filter((item) => {
    if (filterType === 'all') return true;
    return item.action_type === filterType;
  });

  const formatRelativeTime = (timestamp: string) => {
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${diffDays}d ago`;
  };

  const getActionBadge = (type: ActivityFeedItem['action_type']) => {
    switch (type) {
      case 'curate_track':
        return {
          label: 'Curator Evaluation',
          bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
          icon: ShieldCheck,
        };
      case 'enter_board':
        return {
          label: 'New Board Entry',
          bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
          icon: Disc,
        };
      case 'create_board':
        return {
          label: 'Battlefield Deployed',
          bg: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
          icon: Radio,
        };
      case 'rate_track':
        return {
          label: 'Crowd Rating',
          bg: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
          icon: Music,
        };
      case 'gain_influence':
        return {
          label: 'Authority Shift',
          bg: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
          icon: Sparkles,
        };
      case 'follow_user':
        return {
          label: 'Connection',
          bg: 'bg-zinc-800 text-zinc-300 border-zinc-700',
          icon: UserPlus,
        };
      default:
        return {
          label: 'Activity',
          bg: 'bg-zinc-800 text-zinc-400 border-zinc-700',
          icon: Clock,
        };
    }
  };

  return (
    <div className="rounded-3xl bg-zinc-900/60 border border-zinc-800 p-6 space-y-5 backdrop-blur-sm">
      {/* Feed Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-mono uppercase font-bold tracking-widest text-emerald-400">
              LIVE NETWORK PULSE
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              • Following {followedUserIds.length} {followedUserIds.length === 1 ? 'creator' : 'creators'}
            </span>
          </div>
          <h2 className="text-lg font-black text-white tracking-tight mt-0.5 flex items-center space-x-2">
            <span>What is New</span>
            <span className="text-xs font-normal text-zinc-400 font-mono">
              (Live feed of curators & artists you follow)
            </span>
          </h2>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar text-xs">
          {[
            { id: 'all', label: 'All Updates' },
            { id: 'curate_track', label: 'Evaluations' },
            { id: 'enter_board', label: 'Entries' },
            { id: 'create_board', label: 'Battlefields' },
            { id: 'rate_track', label: 'Ratings' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id as any)}
              className={`px-3 py-1 rounded-xl font-medium whitespace-nowrap transition-colors cursor-pointer text-xs ${
                filterType === f.id
                  ? 'bg-emerald-500 text-zinc-950 font-bold shadow-md shadow-emerald-500/10'
                  : 'bg-zinc-950/80 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Suggested Curators & Creators to Follow (Discovery Strip) */}
      {suggestedUsers.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-[10px] uppercase font-bold text-zinc-400 flex items-center space-x-1.5">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>Suggested Curators & Creators to Follow</span>
            </span>
            <span className="text-[10px] font-mono text-zinc-500">
              Follow creators to populate your What is new feed
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {suggestedUsers.map((su) => {
              const isFollowing = !!followingMap[su.id];
              const isPending = !!togglePending[su.id];
              return (
                <div
                  key={su.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-colors"
                >
                  <div 
                    onClick={() => onOpenUserProfile?.(su.id)}
                    className="flex items-center space-x-2.5 min-w-0 pr-2 cursor-pointer group"
                    title={`View ${su.first_name}'s public profile`}
                  >
                    <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 group-hover:border-emerald-500 transition-colors">
                      {su.first_name[0]}{su.last_name[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                        {su.first_name} {su.last_name}
                      </div>
                      <div className="text-[10px] font-mono text-zinc-400 flex items-center space-x-1 truncate">
                        <span className="text-emerald-400 font-semibold">{su.influence_points} PTS</span>
                        <span>•</span>
                        <span className="uppercase text-[9px] text-zinc-500">{su.role || 'Artist'}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleToggleFollow(su)}
                    className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex-shrink-0 ${
                      isFollowing
                        ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold shadow-sm'
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck className="w-3 h-3 text-emerald-400" />
                        <span>Following</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3 h-3" />
                        <span>Follow</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Activity Feed Grid */}
      {loading ? (
        <div className="p-8 text-center text-xs text-zinc-500 font-mono">
          Loading network updates...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-8 rounded-2xl bg-zinc-950/60 border border-zinc-800 text-center space-y-2">
          <p className="text-xs text-zinc-400">
            No activities recorded in this view yet.
          </p>
          <p className="text-[11px] text-zinc-500 font-mono">
            Follow additional curators and creators above to receive live notifications on your feed.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredItems.map((item) => {
            const badge = getActionBadge(item.action_type);
            const BadgeIcon = badge.icon;
            const isThisTrackPlaying = isPlaying && currentTrackId === item.track_id;

            return (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 hover:border-zinc-750 hover:bg-zinc-950 transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Top line: Badge & Relative Time */}
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold border flex items-center space-x-1 ${badge.bg}`}
                    >
                      <BadgeIcon className="w-2.5 h-2.5 mr-1" />
                      <span>{badge.label}</span>
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">
                      {formatRelativeTime(item.timestamp)}
                    </span>
                  </div>

                  {/* Title & Actor */}
                  <h3 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors leading-snug">
                    {item.title}
                  </h3>

                  {/* Description */}
                  <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed line-clamp-2">
                    {item.description}
                  </p>
                </div>

                {/* Bottom Context & Quick Actions */}
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-zinc-900/80 text-xs">
                  <div className="flex items-center space-x-2 text-[11px] text-zinc-400 font-mono">
                    {onOpenUserProfile && item.actor_id ? (
                      <div
                        onClick={() => onOpenUserProfile(item.actor_id)}
                        className="inline-flex items-center space-x-1.5 hover:text-emerald-400 transition-colors cursor-pointer group"
                        title={`View ${item.actor_name}'s public profile`}
                      >
                        <div className="w-4 h-4 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[8px] font-bold text-zinc-300 group-hover:border-emerald-500 group-hover:text-emerald-400 transition-colors">
                          {item.actor_name?.[0] || 'U'}
                        </div>
                        <span className="font-semibold text-zinc-300 group-hover:text-emerald-400 underline underline-offset-2">
                          {item.actor_name}
                        </span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center space-x-1.5">
                        <div className="w-4 h-4 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[8px] font-bold text-zinc-300">
                          {item.actor_name?.[0] || 'U'}
                        </div>
                        <span className="font-semibold text-zinc-300">{item.actor_name}</span>
                      </div>
                    )}
                    {item.actor_role && (
                      <span className="text-[10px] uppercase text-zinc-500">({item.actor_role})</span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Play Track Quick Trigger */}
                    {item.track_id && onPlayTrack && (
                      <button
                        type="button"
                        onClick={() => handleTrackAction(item.track_id, item.track_title)}
                        className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          isThisTrackPlaying
                            ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                            : 'bg-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-750'
                        }`}
                        title="Listen to track"
                      >
                        {isThisTrackPlaying ? (
                          <>
                            <Pause className="w-3 h-3" />
                            <span>Playing</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 fill-current" />
                            <span>Play</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* View Track Profile */}
                    {item.track_id && onOpenSongProfile && (
                      <button
                        type="button"
                        onClick={() => onOpenSongProfile(item.track_id!)}
                        className="p-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                        title="View Track Profile"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Navigate to Board */}
                    {item.board_id && onNavigateToBoard && !item.track_id && (
                      <button
                        type="button"
                        onClick={() => onNavigateToBoard(item.board_id!)}
                        className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-[11px] transition-colors"
                        title="Open Battlefield Board"
                      >
                        <span>Board</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
