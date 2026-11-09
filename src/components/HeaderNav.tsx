import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types/schema';
import { 
  Flame, 
  Disc, 
  Upload, 
  Receipt, 
  Headphones, 
  Music2, 
  Lock, 
  Unlock,
  Volume2,
  VolumeX,
  Radio,
  ChevronDown,
  LogOut,
  CreditCard,
  Cpu,
  LayoutDashboard,
  ShieldCheck,
  Compass,
  Sliders,
  User as UserIcon
} from 'lucide-react';

export type ActiveTab = 'feed' | 'boards' | 'board-detail' | 'my-boards' | 'studio' | 'dashboard' | 'submit' | 'admin' | 'ledger' | 'engine' | 'integrations' | 'profile';

interface HeaderNavProps {
  currentUser: User;
  allUsers: User[];
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onSwitchUser: (userId: string) => void;
  onOpenAuthModal: () => void;
  onToggleSubscription: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onLogout: () => void;
  onOpenUserProfile?: (userId: string) => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  currentUser,
  allUsers,
  activeTab,
  onTabChange,
  onSwitchUser,
  onOpenAuthModal,
  onToggleSubscription,
  isMuted,
  onToggleMute,
  onLogout,
  onOpenUserProfile,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'feed', label: 'Discovery', icon: <Flame className="w-4 h-4" /> },
    { id: 'boards', label: 'Boards', icon: <Compass className="w-4 h-4 text-emerald-400" /> },
    { id: 'my-boards', label: 'My Boards', icon: <Sliders className="w-4 h-4 text-cyan-400" /> },
    { id: 'studio', label: 'Studio', icon: <Headphones className="w-4 h-4 text-emerald-400" /> },
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4 text-purple-400" /> },
    ...(currentUser.role === 'admin' || currentUser.email === 'scofenreborn@gmail.com'
      ? [{ id: 'admin' as ActiveTab, label: 'Admin Directory', icon: <ShieldCheck className="w-4 h-4 text-rose-400" /> }]
      : []),
  ];

  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Brand Lockup with 25% bigger logo + Single Jade Green Musical Note Icon */}
          <div className="flex items-center space-x-3.5">
            <div 
              onClick={() => onTabChange('feed')}
              className="flex items-center space-x-2.5 cursor-pointer group"
              title="Scofen Music Discovery Platform"
            >
              {/* Scofen Logo Frame (25% bigger) */}
              <div className="h-[48px] px-2.5 py-1 rounded-xl bg-zinc-900 border border-zinc-800/80 flex items-center justify-center overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.5)] group-hover:border-emerald-500/40 transition-all">
                <img
                  src="/assets/aistudio/image_e3f3963a_63143619.jpg"
                  alt="Scofen"
                  className="h-[38px] w-auto object-contain rounded"
                />
              </div>

              {/* Single Jade Green Musical Note Icon Styling Element */}
              <div className="flex items-center space-x-1.5 pl-0.5">
                <span className="p-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  <Music2 className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
                </span>
                <span className="text-[11px] font-sans text-zinc-400 tracking-wide hidden lg:inline font-medium">
                  Discovery Network
                </span>
              </div>
            </div>
          </div>

          {/* Music Navigation Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-1.5">
            {navItems.map((item) => {
              const isActive = activeTab === item.id || (item.id === 'boards' && activeTab === 'board-detail');
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-zinc-850 text-white font-semibold shadow-md shadow-black/40 border border-emerald-500/40'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
                  }`}
                >
                  <span className={isActive ? 'text-emerald-400' : 'text-zinc-500'}>{item.icon}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Controls & Producer Status */}
          <div className="flex items-center space-x-3">
            {/* Producer Badge */}
            <div
              title="Producer Studio Mode — Unrestricted playback and scoring"
              className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
            >
              <Headphones className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold font-mono text-[11px]">Producer Suite</span>
            </div>

            {/* Mute Button */}
            <button
              onClick={onToggleMute}
              className="p-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
              title={isMuted ? 'Unmute Player' : 'Mute Player'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            {/* User Profile Quick Switcher */}
            <div 
              ref={dropdownRef}
              className="relative"
              onMouseEnter={() => setIsDropdownOpen(true)}
              onMouseLeave={() => setIsDropdownOpen(false)}
            >
              <button
                type="button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className="flex items-center space-x-2 bg-zinc-900 pl-2 pr-3 py-1.5 rounded-full border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-colors focus:outline-none"
                aria-expanded={isDropdownOpen}
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-700 flex items-center justify-center text-[10px] font-bold text-zinc-950 shadow-sm">
                  {currentUser.first_name[0]}{currentUser.last_name[0]}
                </div>
                <span className="text-xs text-zinc-200 font-medium max-w-[90px] truncate hidden sm:inline">
                  {currentUser.first_name}
                </span>
                <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform ${isDropdownOpen ? 'rotate-180 text-emerald-400' : ''}`} />
              </button>

              {/* Identity Dropdown Menu (no dead gap between button and card) */}
              {isDropdownOpen && (
                <div className="absolute right-0 top-full pt-1.5 w-64 z-50 animate-in fade-in duration-100">
                  <div className="bg-zinc-950/98 border border-zinc-800 rounded-2xl shadow-2xl py-2 backdrop-blur-md">
                    <div className="px-3.5 py-1.5 text-[10px] font-sans uppercase tracking-wider text-zinc-500 font-bold border-b border-zinc-900 flex justify-between items-center">
                      <span>Switch Active User</span>
                      <span className="text-zinc-600 font-mono text-[9px]">{allUsers.length} accounts</span>
                    </div>
                    {allUsers.map((u) => (
                      <div
                        key={u.id}
                        className={`w-full px-3 py-2 text-xs flex items-center justify-between hover:bg-zinc-900/80 transition-colors ${
                          u.id === currentUser.id ? 'bg-zinc-900/50' : ''
                        }`}
                      >
                        <div 
                          onClick={() => {
                            if (onOpenUserProfile) {
                              onOpenUserProfile(u.id);
                            } else {
                              onTabChange('profile');
                            }
                            setIsDropdownOpen(false);
                          }}
                          className="flex items-center space-x-2 truncate cursor-pointer group flex-1 mr-2"
                          title={`View ${u.first_name}'s public profile`}
                        >
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 transition-transform group-hover:scale-110 ${
                            u.role === 'admin'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 group-hover:border-rose-400'
                              : 'bg-zinc-800 text-zinc-300 group-hover:border-emerald-500 group-hover:text-emerald-400 border border-zinc-700'
                          }`}>
                            {u.first_name[0]}{u.last_name[0]}
                          </div>
                          <div className="truncate">
                            <div className="flex items-center space-x-1.5 truncate">
                              <span className="truncate font-medium text-zinc-200 group-hover:text-emerald-400 transition-colors">
                                {u.first_name} {u.last_name}
                              </span>
                              {u.role === 'admin' && (
                                <span className="text-[8px] px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 font-mono font-bold">
                                  ADMIN
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-zinc-500 font-mono">
                              {u.influence_points} pts • {u.role || 'Artist'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5 flex-shrink-0">
                          {u.id === currentUser.id ? (
                            <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                              ACTIVE
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                onSwitchUser(u.id);
                                setIsDropdownOpen(false);
                              }}
                              className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                              title="Switch active user"
                            >
                              Switch
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="border-t border-zinc-900 mt-1 pt-1.5 px-3 space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          onTabChange('profile');
                          setIsDropdownOpen(false);
                        }}
                        className="w-full flex items-center space-x-2 py-1.5 px-2 rounded-lg text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/20 transition-colors cursor-pointer font-medium"
                      >
                        <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
                        <span>View My Public Profile</span>
                      </button>
                      {(currentUser.role === 'admin' || currentUser.email === 'scofenreborn@gmail.com') && (
                        <button
                          type="button"
                          onClick={() => {
                            onTabChange('admin');
                            setIsDropdownOpen(false);
                          }}
                          className="w-full flex items-center space-x-2 py-1.5 px-2 rounded-lg text-xs text-rose-300 hover:text-rose-200 hover:bg-rose-950/20 transition-colors cursor-pointer font-medium"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
                          <span>Admin User Directory</span>
                        </button>
                      )}
                      {(currentUser.role === 'admin' || currentUser.email === 'scofenreborn@gmail.com') && (
                        <button
                          type="button"
                          onClick={() => {
                            onTabChange('integrations');
                            setIsDropdownOpen(false);
                          }}
                          className="w-full flex items-center space-x-2 py-1.5 px-2 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
                        >
                          <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Stripe & Resend Centre</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          onOpenAuthModal();
                          setIsDropdownOpen(false);
                        }}
                        className="w-full text-center py-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
                      >
                        + Join as New Artist or Curator
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onLogout();
                          setIsDropdownOpen(false);
                        }}
                        className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-lg text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/25 transition-colors font-medium border border-rose-900/40 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
