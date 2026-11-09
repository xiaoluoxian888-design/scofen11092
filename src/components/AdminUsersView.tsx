import React, { useState, useEffect } from 'react';
import { User, AssessmentSubmission } from '../types/schema';
import { apiClient } from '../services/apiClient';
import { 
  ShieldCheck, 
  Users, 
  Search, 
  Filter, 
  Sparkles, 
  Disc, 
  Music, 
  DollarSign, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  ChevronDown,
  ArrowUpDown,
  Mail,
  UserCheck,
  CreditCard,
  Headphones
} from 'lucide-react';
import { AdminEmailTemplatesView } from './AdminEmailTemplatesView';

interface AdminUsersViewProps {
  currentUser: User;
  onSwitchUser: (userId: string) => void;
  onOpenUserProfile: (userId: string) => void;
  onRefreshUsers?: () => void;
  onOpenIntegrations?: () => void;
}

interface AdminUserData extends User {
  hostedBoardsCount: number;
  submissionsCount: number;
  totalEarned: number;
}

export const AdminUsersView: React.FC<AdminUsersViewProps> = ({
  currentUser,
  onSwitchUser,
  onOpenUserProfile,
  onRefreshUsers,
  onOpenIntegrations,
}) => {
  const [users, setUsers] = useState<AdminUserData[]>([]);
  const [pendingAssessments, setPendingAssessments] = useState<AssessmentSubmission[]>([]);
  const [expandedAssessmentId, setExpandedAssessmentId] = useState<string | null>(null);
  const [assessmentPoints, setAssessmentPoints] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'curator' | 'artist'>('all');
  const [sortBy, setSortBy] = useState<'influence' | 'name' | 'boards' | 'submissions' | 'earnings'>('influence');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [adminSection, setAdminSection] = useState<'users' | 'assessments' | 'email_templates'>('users');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const [data, assessments] = await Promise.all([
        apiClient.getAdminUsers(),
        apiClient.getPendingAssessments(),
      ]);
      setUsers(data);
      setPendingAssessments(assessments);
    } catch (err) {
      console.error('Failed to load admin users data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleFinalizeAssessment = async (assessmentId: string) => {
    const pts = assessmentPoints[assessmentId] ?? 10;
    try {
      await apiClient.finalizeAssessment(assessmentId, pts);
      setPendingAssessments((prev) => prev.filter((a) => a.id !== assessmentId));
      if (expandedAssessmentId === assessmentId) {
        setExpandedAssessmentId(null);
      }
      const updatedUsers = await apiClient.getAdminUsers();
      setUsers(updatedUsers);
      onRefreshUsers?.();
    } catch (err) {
      console.error('Failed to finalize assessment', err);
    }
  };

  // Filter and sort
  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.bio && u.bio.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole = 
      roleFilter === 'all' || 
      (roleFilter === 'admin' && u.role === 'admin') ||
      (roleFilter === 'curator' && u.role === 'curator') ||
      (roleFilter === 'artist' && (u.role === 'artist' || !u.role));

    return matchesSearch && matchesRole;
  }).sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'influence') {
      comparison = b.influence_points - a.influence_points;
    } else if (sortBy === 'name') {
      comparison = `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
    } else if (sortBy === 'boards') {
      comparison = b.hostedBoardsCount - a.hostedBoardsCount;
    } else if (sortBy === 'submissions') {
      comparison = b.submissionsCount - a.submissionsCount;
    } else if (sortBy === 'earnings') {
      comparison = b.totalEarned - a.totalEarned;
    }
    return sortOrder === 'desc' ? comparison : -comparison;
  });

  const totalInfluence = users.reduce((sum, u) => sum + (u.influence_points || 0), 0);
  const totalSubscribers = users.filter((u) => u.is_subscriber).length;
  const totalBoards = users.reduce((sum, u) => sum + (u.hostedBoardsCount || 0), 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Admin Top Header Banner */}
      <div className="relative rounded-3xl bg-zinc-900/70 border border-zinc-800 p-6 sm:p-8 backdrop-blur-md overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 flex-shrink-0 shadow-lg shadow-rose-500/10">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40">
                  ROOT PROTOCOL CONSOLE
                </span>
                <span className="text-xs text-zinc-400 font-mono">Logged in as {currentUser.email}</span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight mt-1">
                Network User Directory & Authority Registry
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Full-spectrum oversight of all platform accounts, influence point authority scores, assessment vetting, and hosted board economics.
              </p>
            </div>
          </div>
        </div>

        {/* Global Network Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-zinc-800/80">
          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80">
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold flex items-center justify-between">
              <span>Total Network Accounts</span>
              <Users className="w-3.5 h-3.5 text-zinc-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono mt-1">
              {users.length} <span className="text-xs font-normal text-zinc-500">Users</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80">
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold flex items-center justify-between">
              <span>Total Influence Capital</span>
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
              {totalInfluence.toLocaleString()} <span className="text-xs font-normal text-zinc-500">PTS</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80">
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold flex items-center justify-between">
              <span>Active Battlefields</span>
              <Disc className="w-3.5 h-3.5 text-teal-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono mt-1">
              {totalBoards} <span className="text-xs font-normal text-zinc-500">Boards</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80">
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold flex items-center justify-between">
              <span>Producer Audio Access</span>
              <Headphones className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono mt-1">
              Unrestricted <span className="text-xs font-normal text-emerald-400">100%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Primary Section Tab Selector */}
      <div className="flex items-center space-x-2 border-b border-zinc-800 pb-1 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setAdminSection('users')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            adminSection === 'users'
              ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
              : 'bg-zinc-900/80 hover:bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>User Directory & Authorities</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            adminSection === 'users' ? 'bg-zinc-950 text-emerald-400' : 'bg-zinc-800 text-zinc-300'
          }`}>
            {users.length}
          </span>
        </button>

        <button
          onClick={() => setAdminSection('assessments')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            adminSection === 'assessments'
              ? 'bg-amber-400 text-zinc-950 shadow-md shadow-amber-400/20'
              : 'bg-zinc-900/80 hover:bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Assessment Submissions</span>
          {pendingAssessments.length > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
              adminSection === 'assessments' ? 'bg-zinc-950 text-amber-400' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}>
              {pendingAssessments.length} Pending
            </span>
          )}
        </button>

        <button
          onClick={() => setAdminSection('email_templates')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            adminSection === 'email_templates'
              ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
              : 'bg-zinc-900/80 hover:bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Email Notification System</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            adminSection === 'email_templates' ? 'bg-zinc-950 text-emerald-400' : 'bg-zinc-800 text-zinc-300'
          }`}>
            12 Templates
          </span>
        </button>

        {onOpenIntegrations && (
          <button
            type="button"
            onClick={onOpenIntegrations}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap bg-zinc-900/80 hover:bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
          >
            <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
            <span>Stripe &amp; Resend Centre</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-zinc-800 text-emerald-300 font-bold">
              Admin Only
            </span>
          </button>
        )}
      </div>

      {/* Conditionally Render Section */}
      {adminSection === 'email_templates' ? (
        <AdminEmailTemplatesView adminEmail={currentUser.email} />
      ) : (
        <>
          {/* Assessment Submissions Section (Always shown in 'assessments' tab, or in 'users' tab if pending) */}
          {(adminSection === 'assessments' || pendingAssessments.length > 0) && (
            <div className="rounded-3xl bg-zinc-900/60 border border-zinc-800 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Assessment Submissions</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Review pending Initial Influence Assessments and assign influence points to finalize.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 font-mono text-xs font-bold text-amber-300">
            {pendingAssessments.length} Pending
          </span>
        </div>

        {pendingAssessments.length === 0 ? (
          <div className="p-5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 text-center text-xs text-zinc-500">
            No pending assessment submissions.
          </div>
        ) : (
          <div className="space-y-3">
            {pendingAssessments.map((item) => {
              const isOpen = expandedAssessmentId === item.id;
              const ptsValue = assessmentPoints[item.id] ?? 10;
              return (
                <div
                  key={item.id}
                  className="rounded-2xl bg-zinc-950/80 border border-zinc-800 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedAssessmentId(isOpen ? null : item.id)}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-900/60 transition-colors cursor-pointer"
                  >
                    <div>
                      <div className="text-sm font-bold text-white flex items-center space-x-2">
                        <span>{item.user_name}</span>
                        <span className="text-xs font-mono text-emerald-400">({item.industryRole})</span>
                      </div>
                      <div className="text-xs font-mono text-zinc-400 mt-0.5">
                        {item.user_email} • Submitted {new Date(item.submitted_at).toLocaleString()}
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {isOpen && (
                    <div className="p-5 border-t border-zinc-800 space-y-4 bg-zinc-950">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800">
                          <div className="font-mono text-[10px] uppercase text-zinc-500 font-bold mb-1">
                            1. Industry Role / Affiliation
                          </div>
                          <div className="text-zinc-200 font-semibold">{item.industryRole}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800">
                          <div className="font-mono text-[10px] uppercase text-zinc-500 font-bold mb-1">
                            3. Audience &amp; List Density Metrics
                          </div>
                          <div className="text-zinc-200">{item.audienceMetrics}</div>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800 text-xs">
                        <div className="font-mono text-[10px] uppercase text-zinc-500 font-bold mb-1">
                          2. Primary Portfolio / Verification Links
                        </div>
                        <div className="text-emerald-400 font-mono whitespace-pre-wrap break-all">
                          {item.verificationLinks}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800 text-xs">
                        <div className="font-mono text-[10px] uppercase text-zinc-500 font-bold mb-1">
                          4. Core Curation Focus &amp; Criteria
                        </div>
                        <div className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
                          {item.curationCriteria}
                        </div>
                      </div>

                      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-zinc-800">
                        <div className="flex items-center space-x-3">
                          <label className="text-xs font-mono uppercase text-zinc-400 font-bold">
                            Assign Influence Points:
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={1000}
                            value={ptsValue}
                            onChange={(e) =>
                              setAssessmentPoints((prev) => ({
                                ...prev,
                                [item.id]: Math.max(1, parseInt(e.target.value, 10) || 1),
                              }))
                            }
                            className="w-24 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleFinalizeAssessment(item.id)}
                          className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          Finalize &amp; Assign Points
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    )}

      {/* Filter and Search Controls & User Directory Table */}
      {adminSection === 'users' && (
      <>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users by name, email, or credentials..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Role Filter & Sorting */}
        <div className="flex items-center space-x-2.5 flex-wrap gap-y-2">
          {/* Role Filter Buttons */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1 text-xs">
            {(['all', 'admin', 'curator', 'artist'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1 rounded-lg font-semibold uppercase text-[10px] font-mono transition-colors ${
                  roleFilter === r
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Sort selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500 font-mono"
          >
            <option value="influence">Sort by: Influence Points</option>
            <option value="name">Sort by: Name</option>
            <option value="boards">Sort by: Hosted Boards</option>
            <option value="submissions">Sort by: Tracks</option>
            <option value="earnings">Sort by: Total Earnings</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            title="Toggle sort order"
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Users Data Table / Card View */}
      {loading ? (
        <div className="p-16 text-center text-xs font-mono text-zinc-500">
          Loading network user registry...
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-zinc-900/40 border border-zinc-800 text-zinc-400 text-xs">
          No user accounts matched the filter query.
        </div>
      ) : (
        <div className="rounded-3xl bg-zinc-900/60 border border-zinc-800 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800/80 bg-zinc-950/60 font-mono text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
                  <th className="py-4 px-6">User & Identity</th>
                  <th className="py-4 px-4">Role</th>
                  <th className="py-4 px-4">Influence Points</th>
                  <th className="py-4 px-4">Voting Weight</th>
                  <th className="py-4 px-4">Curator Fee Command</th>
                  <th className="py-4 px-4">Assessment</th>
                  <th className="py-4 px-4">Audio Access</th>
                  <th className="py-4 px-4">Boards</th>
                  <th className="py-4 px-4">Tracks</th>
                  <th className="py-4 px-4">Earned</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredUsers.map((u) => {
                  const isCurrent = u.id === currentUser.id;
                  const fee = (u.influence_points * 0.1).toFixed(2);
                  const weight = (u.influence_points / 10).toFixed(1);

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-zinc-850/50 transition-colors ${
                        isCurrent ? 'bg-emerald-500/5' : ''
                      }`}
                    >
                      {/* Name & Email */}
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <div 
                            onClick={() => onOpenUserProfile(u.id)}
                            className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 hover:border-emerald-500 hover:text-emerald-400 flex items-center justify-center font-bold text-xs text-zinc-200 flex-shrink-0 cursor-pointer transition-colors"
                            title={`View ${u.first_name}'s public profile`}
                          >
                            {u.first_name[0]}{u.last_name[0]}
                          </div>
                          <div>
                            <div 
                              onClick={() => onOpenUserProfile(u.id)}
                              className="font-bold text-white hover:text-emerald-400 cursor-pointer flex items-center space-x-1.5 transition-colors"
                              title={`View ${u.first_name}'s public profile`}
                            >
                              <span>{u.first_name} {u.last_name}</span>
                              {isCurrent && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono font-semibold">
                                  YOU
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-400 font-mono flex items-center space-x-1 mt-0.5">
                              <Mail className="w-3 h-3 text-zinc-500 inline" />
                              <span>{u.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-4 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          u.role === 'admin'
                            ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            : u.role === 'curator'
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {u.role ? u.role : 'ARTIST'}
                        </span>
                      </td>

                      {/* Influence Points */}
                      <td className="py-4 px-4 font-mono">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-sm font-extrabold text-emerald-400">
                            {u.influence_points}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-normal">PTS</span>
                        </div>
                      </td>

                      {/* Voting Weight */}
                      <td className="py-4 px-4 font-mono text-zinc-300">
                        {weight}x
                      </td>

                      {/* Curator Fee Command */}
                      <td className="py-4 px-4 font-mono text-zinc-300">
                        ${fee}
                      </td>

                      {/* Assessment */}
                      <td className="py-4 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                          u.assessment_status === 'exempt'
                            ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                            : u.assessment_status === 'assessed'
                            ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                            : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        }`}>
                          {u.assessment_status || 'PENDING'}
                        </span>
                      </td>

                      {/* Audio Access */}
                      <td className="py-4 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          FULL MASTER
                        </span>
                      </td>

                      {/* Boards Count */}
                      <td className="py-4 px-4 font-mono text-zinc-300">
                        {u.hostedBoardsCount}
                      </td>

                      {/* Submissions Count */}
                      <td className="py-4 px-4 font-mono text-zinc-300">
                        {u.submissionsCount}
                      </td>

                      {/* Earned */}
                      <td className="py-4 px-4 font-mono font-bold text-white">
                        ${u.totalEarned.toFixed(2)}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {!isCurrent && (
                            <button
                              onClick={() => onSwitchUser(u.id)}
                              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              Impersonate / Switch
                            </button>
                          )}
                          <button
                            onClick={() => onOpenUserProfile(u.id)}
                            className="p-1 rounded-lg bg-zinc-850 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                            title="View Public Profile"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </>
    )}
    </>
  )}
    </div>
  );
};
