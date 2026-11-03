import React from 'react';
import { Sparkles, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950/80 text-slate-400 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-bold text-slate-200 text-sm">AceMock AI</span>
          <span className="text-xs text-slate-500">— Production MERN SaaS Platform</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
          <span className="hover:text-slate-200 transition-colors">React 19 & Vite</span>
          <span className="hover:text-slate-200 transition-colors">Node & Express</span>
          <span className="hover:text-slate-200 transition-colors">MongoDB</span>
          <span className="hover:text-slate-200 transition-colors">Google Gemini / OpenRouter</span>
          <span className="hover:text-slate-200 transition-colors">Razorpay</span>
        </div>

        <p className="text-xs text-slate-500 flex items-center gap-1">
          Built with <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" /> for job seekers & engineers
        </p>
      </div>
    </footer>
  );
}
