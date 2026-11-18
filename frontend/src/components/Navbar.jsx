import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { signInWithGoogle } from '../services/firebase';
import {
  Sparkles,
  Zap,
  History,
  PlayCircle,
  LogOut,
  CreditCard,
  User,
  ChevronDown,
  Sun,
  Moon,
  ShieldCheck,
  LogIn,
  UserPlus
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Navbar({ onOpenAdmin }) {
  const { user, logout, loginUser, loginDemo, openPricing, openAuthModal } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform duration-200">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
              AceMock<span className="text-indigo-400">AI</span>
            </span>
            <span className="block text-[10px] text-slate-400 font-medium -mt-1 tracking-wider uppercase">
              Production Interview Agent
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-slate-300">
          <Link
            to="/"
            className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-slate-800/50 transition-colors"
          >
            Home
          </Link>
          {user ? (
            <>
              <Link
                to="/setup"
                className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-slate-800/50 transition-colors flex items-center gap-1.5"
              >
                <PlayCircle className="w-4 h-4 text-indigo-400" />
                Mock Interview
              </Link>
              <Link
                to="/history"
                className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-slate-800/50 transition-colors flex items-center gap-1.5"
              >
                <History className="w-4 h-4 text-slate-400" />
                Past Reports
              </Link>
            </>
          ) : (
            <>
              <button
                onClick={() => openAuthModal('signup')}
                className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-slate-800/50 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <PlayCircle className="w-4 h-4 text-indigo-400" />
                Mock Interview
              </button>
              <button
                onClick={() => openAuthModal('signin')}
                className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-slate-800/50 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <History className="w-4 h-4 text-slate-400" />
                Past Reports
              </button>
            </>
          )}
          <button
            onClick={openPricing}
            className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-slate-800/50 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <CreditCard className="w-4 h-4 text-emerald-400" />
            Pricing
          </button>

          {/* Admin Verification Portal Button (Only visible to authenticated administrators) */}
          {onOpenAdmin && user && (user.isAdmin || user.role === 'admin') && (
            <button
              onClick={onOpenAdmin}
              className="px-3 py-1.5 rounded-lg hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 transition-colors flex items-center gap-1.5 border border-indigo-500/30 cursor-pointer ml-1"
              title="Merchant UTR Verification Queue"
            >
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>Admin Verify</span>
            </button>
          )}
        </nav>

        {/* Right Action Section */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Dark / Light Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl transition-all cursor-pointer glass-card hover:border-indigo-500/50 flex items-center justify-center shadow-sm"
            title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            aria-label="Toggle dark/light theme"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform duration-300" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600 hover:-rotate-12 transition-transform duration-300" />
            )}
          </button>
          {user ? (
            <div className="flex items-center gap-3">
              {/* Credits Badge */}
              <button
                onClick={openPricing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-950/70 border border-indigo-700/50 text-indigo-300 text-xs font-semibold hover:border-indigo-500 transition-all cursor-pointer shadow-sm shadow-indigo-900/40"
                title="Click to add more credits"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>{user.credits ?? 50} Credits</span>
                <span className="ml-1 text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white px-1.5 py-0.5 rounded font-bold">
                  +
                </span>
              </button>

              {/* User Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-800/60 transition-colors border border-slate-700/50 cursor-pointer"
                >
                  <img
                    src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}`}
                    alt={user.name}
                    className="w-8 h-8 rounded-lg object-cover bg-slate-800"
                  />
                  <span className="hidden sm:inline text-xs font-medium text-slate-200 max-w-[100px] truncate">
                    {user.name}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {dropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 rounded-xl glass-panel shadow-2xl py-2 z-50 border border-slate-700 animate-in fade-in zoom-in-95 duration-100"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <div className="px-4 py-2 border-b border-slate-800">
                      <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                    </div>

                    <Link
                      to="/setup"
                      className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-300 hover:bg-indigo-600/10 hover:text-indigo-400"
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                      Start New Interview
                    </Link>

                    <Link
                      to="/history"
                      className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-300 hover:bg-indigo-600/10 hover:text-indigo-400"
                    >
                      <History className="w-3.5 h-3.5" />
                      Interview Archive
                    </Link>

                    <button
                      onClick={openPricing}
                      className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-xs text-slate-300 hover:bg-indigo-600/10 hover:text-emerald-400 cursor-pointer"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      Buy Credits (UPI / QR)
                    </button>

                    {onOpenAdmin && user && (user.isAdmin || user.role === 'admin') && (
                      <button
                        onClick={onOpenAdmin}
                        className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-xs text-indigo-300 hover:bg-indigo-600/10 hover:text-indigo-400 cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                        Admin UTR Verification
                      </button>
                    )}

                    <div className="border-t border-slate-800 my-1"></div>

                    <button
                      onClick={logout}
                      className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-xs text-red-400 hover:bg-red-500/10 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={loginDemo}
                className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-all cursor-pointer"
                title="Instant test session"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Demo</span>
              </button>

              <button
                onClick={() => openAuthModal('signin')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-all cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-indigo-400" />
                <span>Sign In</span>
              </button>

              <button
                onClick={() => openAuthModal('signup')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Sign Up</span>
                <span className="hidden sm:inline-block text-[10px] bg-indigo-900/80 text-emerald-300 px-1.5 py-0.2 rounded-full font-bold border border-emerald-400/30">
                  +50 Credits
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
