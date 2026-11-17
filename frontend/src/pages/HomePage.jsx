import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  ArrowRight,
  FileText,
  Brain,
  CheckCircle2,
  Zap,
  TrendingUp,
  Award,
  Terminal,
  Play,
  Video
} from 'lucide-react';

export default function HomePage() {
  const { user, loginDemo, openPricing, openAuthModal } = useAuth();

  return (
    <div className="relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-to-b from-indigo-600/20 via-purple-600/10 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* HERO SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 text-center relative">
        {/* Top Announcement Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card border border-indigo-500/30 text-xs font-semibold text-indigo-300 mb-8 hover:border-indigo-400 transition-all shadow-[0_0_20px_-5px_rgba(99,102,241,0.3)]">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
          <span className="bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent font-bold">
            Next-Gen AI Mock Interview & Proctoring Platform
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
          <span className="text-slate-400">Live AI Human Video & Audio</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.15]">
          Master Your Next Tech Interview with{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent animate-text-shimmer drop-shadow-[0_0_35px_rgba(168,85,247,0.35)]">
            Autonomous AI
          </span>
        </h1>

        {/* Hero Subtitle */}
        <p className="mt-6 text-base sm:text-lg text-slate-300/90 max-w-2xl mx-auto leading-relaxed font-normal">
          Experience real-time video interviews conducted by lifelike AI avatars with voice delivery, anti-cheat neural proctoring, resume personalization, and instant 0–10 scoring.
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          {user ? (
            <Link
              to="/setup"
              className="flex items-center gap-2.5 px-8 py-4 rounded-2xl btn-aurora text-white font-bold text-sm tracking-wide shadow-2xl cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Launch Mock Interview</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <button
              onClick={() => openAuthModal('signup')}
              className="flex items-center gap-2.5 px-8 py-4 rounded-2xl btn-aurora text-white font-bold text-sm tracking-wide shadow-2xl cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Sign Up to Start Mock Interview</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {!user && (
            <button
              onClick={() => openAuthModal('signin')}
              className="flex items-center gap-2 px-6 py-4 rounded-2xl glass-card hover:bg-slate-800/80 text-slate-200 font-bold text-sm border border-slate-700 hover:border-indigo-500/50 transition-all cursor-pointer shadow-lg"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Sign In with Your Account (50 Credits)</span>
            </button>
          )}

          <button
            onClick={openPricing}
            className="flex items-center gap-2 px-6 py-4 rounded-2xl glass-card text-slate-300 hover:text-white text-sm font-semibold transition-all hover:border-slate-600 cursor-pointer"
          >
            <span>View Credit Packages</span>
          </button>
        </div>

        {/* Stats Row */}
        <div className="mt-18 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          <div className="glass-card p-5 rounded-2xl text-center border-t border-t-indigo-500/30">
            <p className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">50 Free</p>
            <p className="text-xs text-slate-400 mt-1 font-medium">Credits on Sign Up</p>
          </div>
          <div className="glass-card p-5 rounded-2xl text-center border-t border-t-purple-500/30">
            <p className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">100%</p>
            <p className="text-xs text-slate-400 mt-1 font-medium">Resume-Tailored Q&A</p>
          </div>
          <div className="glass-card p-5 rounded-2xl text-center border-t border-t-emerald-500/30">
            <p className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">&lt; 3s</p>
            <p className="text-xs text-slate-400 mt-1 font-medium">Instant AI Evaluation</p>
          </div>
          <div className="glass-card p-5 rounded-2xl text-center border-t border-t-pink-500/30">
            <p className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent">AI Video</p>
            <p className="text-xs text-slate-400 mt-1 font-medium">Human Avatars & Voice</p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-800/80">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
            Workflow Architecture
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
            How The AI Interview Agent Works
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Engineered like a real-world SaaS to provide high-impact interview preparation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 hover:border-slate-700 transition-colors relative">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-lg mb-4">
              01
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Upload Resume & Choose Role</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Drop your PDF resume. Our backend extracts your listed technologies, projects, and domain strengths to formulate personalized interview prompts.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-indigo-600/30 bg-gradient-to-b from-indigo-950/30 to-slate-900/60 transition-colors relative">
            <div className="w-12 h-12 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center font-bold text-lg mb-4">
              02
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Live AI Human Video & Voice Interview</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Experience an authentic video interview meeting with realistic AI interviewers (Dr. Sarah Chen, Marcus Vance, Elena Rostova). Features real-time voice speech, animated presence, active listening, and candidate webcam visualizer.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-slate-800 hover:border-slate-700 transition-colors relative">
            <div className="w-12 h-12 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold text-lg mb-4">
              03
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Detailed Scorecard & Review</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Receive a comprehensive performance report: overall 0-100 score, key strengths, constructive gaps, and model answers to master your target role.
            </p>
          </div>
        </div>
      </section>

      {/* CORE FEATURES GRID */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-800/80">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="glass-card p-6 rounded-2xl">
            <FileText className="w-8 h-8 text-indigo-400 mb-4" />
            <h4 className="text-base font-bold text-white mb-1">Resume Parsing with Multer</h4>
            <p className="text-xs text-slate-400">
              Extracts text dynamically in memory without cluttering your server disk.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl">
            <Brain className="w-8 h-8 text-purple-400 mb-4" />
            <h4 className="text-base font-bold text-white mb-1">Gemini & OpenRouter Core</h4>
            <p className="text-xs text-slate-400">
              Ultra-fast latency and high-caliber questions generated by modern large language models.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl">
            <Zap className="w-8 h-8 text-amber-400 mb-4" />
            <h4 className="text-base font-bold text-white mb-1">SaaS Credit Architecture</h4>
            <p className="text-xs text-slate-400">
              Built-in monetizable credit engine with seamless checkout integration via Razorpay.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl">
            <TrendingUp className="w-8 h-8 text-emerald-400 mb-4" />
            <h4 className="text-base font-bold text-white mb-1">Granular Question Scoring</h4>
            <p className="text-xs text-slate-400">
              Every single answer receives a dedicated 0-10 score with concrete points to improve.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-indigo-500/30 bg-gradient-to-b from-indigo-950/20 to-slate-900/40">
            <Video className="w-8 h-8 text-indigo-400 mb-4" />
            <h4 className="text-base font-bold text-white mb-1">Realistic AI Human Interviewer</h4>
            <p className="text-xs text-slate-400">
              Interactive video personas with animated lip-sync, spoken questions, and real-time candidate webcam visualizer.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl">
            <Terminal className="w-8 h-8 text-cyan-400 mb-4" />
            <h4 className="text-base font-bold text-white mb-1">Technical & HR Modes</h4>
            <p className="text-xs text-slate-400">
              Switch easily between deep technical problem-solving and executive HR cultural rounds.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl">
            <Award className="w-8 h-8 text-pink-400 mb-4" />
            <h4 className="text-base font-bold text-white mb-1">Historical Archives</h4>
            <p className="text-xs text-slate-400">
              Track your score trajectory over time to measure interview readiness before applying.
            </p>
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="glass-panel p-8 sm:p-12 rounded-3xl border border-indigo-500/40 text-center relative overflow-hidden bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900/60">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
            Ready to Ace Your Next Tech Interview?
          </h2>
          <p className="text-slate-300 text-sm max-w-xl mx-auto mt-3">
            Start right now with complimentary credits. Upload your resume or choose any target engineering role.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              to="/setup"
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white text-slate-950 hover:bg-slate-100 font-bold text-sm shadow-xl transition-all hover:scale-105"
            >
              Get Started Now
              <ArrowRight className="w-4 h-4 text-slate-950" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
