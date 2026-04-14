import { LayoutDashboard, LogOut, User as UserIcon, Zap, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NavLink } from 'react-router-dom';

export default function Sidebar() {
  const { user, signOut } = useAuth();

  return (
    <div className="flex h-full w-64 flex-col bg-zinc-950 border-r border-zinc-800/50 relative z-10">
      <div className="flex h-20 items-center px-6 border-b border-zinc-800/50">
        <div className="h-8 w-8 bg-brand-cyan/10 rounded-lg flex items-center justify-center mr-3 border border-brand-cyan/20 shadow-[0_0_10px_rgba(116,240,237,0.1)]">
          <Zap className="h-5 w-5 text-brand-cyan" />
        </div>
        <span className="text-xl font-display font-bold text-white tracking-wide">Auto<span className="text-brand-cyan">Hire</span></span>
      </div>
      
      <div className="flex-1 overflow-y-auto py-6">
        <nav className="space-y-2 px-4">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20 shadow-[inset_0_0_10px_rgba(116,240,237,0.05)]'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-white border border-transparent'
              }`
            }
          >
            <LayoutDashboard className="mr-3 h-5 w-5 flex-shrink-0" />
            Applications
          </NavLink>
          
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20 shadow-[inset_0_0_10px_rgba(116,240,237,0.05)]'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-white border border-transparent'
              }`
            }
          >
            <SettingsIcon className="mr-3 h-5 w-5 flex-shrink-0" />
            Settings
          </NavLink>
        </nav>
      </div>

      <div className="border-t border-zinc-800/50 p-5 bg-zinc-900/30">
        <div className="flex items-center mb-5">
          <div className="flex-shrink-0">
            {user?.user_metadata?.avatar_url ? (
              <img
                className="h-10 w-10 rounded-full border border-zinc-700"
                src={user.user_metadata.avatar_url}
                alt=""
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                <UserIcon className="h-5 w-5 text-zinc-400" />
              </div>
            )}
          </div>
          <div className="ml-3 min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white font-display">
              {user?.user_metadata?.full_name || 'Operator'}
            </p>
            <p className="truncate text-xs text-zinc-500 font-mono">
              {user?.email}
            </p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex w-full items-center justify-center px-4 py-2.5 text-sm font-bold text-zinc-400 rounded-xl hover:bg-brand-red/10 hover:text-brand-red hover:border-brand-red/20 border border-transparent transition-all duration-200"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Disconnect
        </button>
      </div>
    </div>
  );
}
