import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  Award,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Printer,
  History,
  PlayCircle,
  Sparkles,
  BookOpen,
  Calendar,
  Layers,
  Loader2,
  Copy,
  Check,
  Volume2,
  VolumeX
} from 'lucide-react';

export default function ReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [playingQuestionIndex, setPlayingQuestionIndex] = useState(null);
  const [copiedIdx, setCopiedIdx] = useState(null);

  const handlePlayAudio = (idx, text) => {
    if (!('speechSynthesis' in window)) return;
    if (playingQuestionIndex === idx) {
      window.speechSynthesis.cancel();
      setPlayingQuestionIndex(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.onend = () => setPlayingQuestionIndex(null);
    utterance.onerror = () => setPlayingQuestionIndex(null);
    setPlayingQuestionIndex(idx);
    window.speechSynthesis.speak(utterance);
  };

  const handleCopy = (idx, text) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  useEffect(() => {
    fetchInterview();
  }, [id]);

  const fetchInterview = async () => {
    try {
      const res = await api.get(`/interviews/${id}`);
      if (res.data.success) {
        setInterview(res.data.interview);
      }
    } catch (err) {
      console.error('Failed to load interview report:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-3" />
        <p className="text-sm font-semibold text-slate-300">Generating your comprehensive scorecard...</p>
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
        <p className="text-slate-400 text-sm mb-4">Interview report could not be found.</p>
        <Link to="/setup" className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold">
          Start New Interview
        </Link>
      </div>
    );
  }

  const score = interview.overallScore || 75;
  const getGrade = (s) => {
    if (s >= 85) return { grade: 'A', text: 'Exceptional Performance', color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-500/40' };
    if (s >= 70) return { grade: 'B', text: 'Solid Foundation', color: 'text-indigo-400', bg: 'bg-indigo-950/40 border-indigo-500/40' };
    return { grade: 'C', text: 'Needs Focused Practice', color: 'text-amber-400', bg: 'bg-amber-950/40 border-amber-500/40' };
  };

  const performance = getGrade(score);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 print:py-0 print:px-0">
      {/* Top Action Row (Hidden when printing) */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 print:hidden">
        <Link
          to="/history"
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <History className="w-4 h-4" />
          <span>Back to All Interviews</span>
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl glass-card hover:bg-slate-800 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save PDF</span>
          </button>

          <Link
            to="/setup"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all"
          >
            <PlayCircle className="w-4 h-4" />
            <span>Practice Another Round</span>
          </Link>
        </div>
      </div>

      {/* OVERALL SCORECARD HERO */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 mb-8 bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Official AI Debrief Report</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{interview.role}</h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                {interview.roundType} Round
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                {new Date(interview.createdAt).toLocaleDateString()}
              </span>
              <span>•</span>
              <span>{interview.questions.length} Questions Evaluated</span>
            </div>
          </div>

          {/* Big Score Ring */}
          <div className={`p-6 rounded-2xl border ${performance.bg} text-center min-w-[200px]`}>
            <div className="flex items-baseline justify-center gap-1">
              <span className={`text-5xl font-black ${performance.color}`}>{score}</span>
              <span className="text-sm font-bold text-slate-400">/ 100</span>
            </div>
            <p className={`text-xs font-bold mt-1 ${performance.color}`}>{performance.text}</p>
          </div>
        </div>

        {/* AI Executive Summary */}
        {interview.summary && (
          <div className="mt-6 pt-6 border-t border-slate-800">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Hiring Manager Evaluation Summary
            </p>
            <p className="text-sm text-slate-200 leading-relaxed">{interview.summary}</p>
          </div>
        )}
      </div>

      {/* STRENGTHS & IMPROVEMENTS DUAL CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {/* Strengths */}
        <div className="glass-panel p-6 rounded-2xl border border-emerald-500/20 bg-emerald-950/10">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-white">Demonstrated Strengths</h2>
          </div>
          <ul className="space-y-3">
            {(interview.strengths || []).map((str, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{str}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Areas for Improvement */}
        <div className="glass-panel p-6 rounded-2xl border border-amber-500/20 bg-amber-950/10">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-white">Areas for Improvement</h2>
          </div>
          <ul className="space-y-3">
            {(interview.areasForImprovement || []).map((imp, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{imp}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* DETAILED QUESTION BREAKDOWN */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-400" />
          <span>Granular Question Breakdown & Answers</span>
        </h2>

        {interview.questions.map((q, idx) => (
          <div key={idx} className="glass-panel p-6 rounded-2xl border border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-600/20 text-indigo-400 text-xs font-bold flex items-center justify-center">
                  {idx + 1}
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                  {q.category}
                </span>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-extrabold text-indigo-400">
                <Award className="w-3.5 h-3.5" />
                <span>Score: {q.score ?? 7} / 10</span>
              </div>
            </div>

            <h3 className="text-sm font-bold text-white mb-4 leading-relaxed">{q.question}</h3>

            {/* Candidate Answer */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 mb-3">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Your Submitted Answer:
              </p>
              <p className="text-xs text-slate-200 leading-relaxed">
                {q.userAnswer || <span className="text-slate-500 italic">No answer provided</span>}
              </p>
            </div>

            {/* AI Constructive Feedback */}
            {q.feedback && (
              <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-500/20 mb-3">
                <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  AI Feedback & Recommendation:
                </p>
                <p className="text-xs text-indigo-200 leading-relaxed">{q.feedback}</p>
              </div>
            )}

            {/* 🌟 AI Perfect Model Answer (10/10 Benchmark) */}
            {(q.idealAnswer || q.expectedAnswer) && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/40 via-slate-900/90 to-indigo-950/40 border border-emerald-500/40 shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-emerald-500/20">
                  <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    AI Perfect Model Answer (10/10 Benchmark):
                  </p>

                  <div className="flex items-center gap-2 print:hidden">
                    {/* Listen Audio Button */}
                    <button
                      type="button"
                      onClick={() => handlePlayAudio(idx, q.idealAnswer || q.expectedAnswer)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        playingQuestionIndex === idx
                          ? 'bg-emerald-500 text-slate-950 animate-pulse'
                          : 'bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/30'
                      }`}
                      title="Listen to AI model answer"
                    >
                      {playingQuestionIndex === idx ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                      <span>{playingQuestionIndex === idx ? 'Stop Audio' : 'Listen'}</span>
                    </button>

                    {/* Copy Button */}
                    <button
                      type="button"
                      onClick={() => handleCopy(idx, q.idealAnswer || q.expectedAnswer)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-colors border border-slate-700 cursor-pointer"
                      title="Copy model answer"
                    >
                      {copiedIdx === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedIdx === idx ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <p className="text-xs text-emerald-100/90 leading-relaxed">
                  {q.idealAnswer || q.expectedAnswer}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
