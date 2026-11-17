import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  Sparkles,
  Zap,
  ArrowRight,
  Loader2,
  X,
  Briefcase,
  Layers,
  GraduationCap,
  UserCheck,
  Volume2
} from 'lucide-react';
import { AI_PERSONAS } from '../components/AIHumanInterviewer';

const PRESET_ROLES = [
  'Full Stack MERN Developer',
  'Frontend React Developer',
  'Backend Node.js Engineer',
  'Full Stack Java / Spring Boot',
  'DevOps & Cloud Engineer',
  'Data Analyst / Scientist'
];

const EXPERIENCE_LEVELS = [
  { id: 'Fresher / Entry-Level', label: 'Fresher / 0-1 Yr', desc: 'Focuses on core CS fundamentals & projects' },
  { id: 'Mid-Level (2-4 Years)', label: 'Mid-Level (2-4 Yrs)', desc: 'Focuses on frameworks, debugging & APIs' },
  { id: 'Senior (5+ Years)', label: 'Senior (5+ Yrs)', desc: 'Focuses on architecture, scalability & leadership' }
];

const ROUND_TYPES = [
  {
    id: 'Technical',
    title: 'Technical Round',
    badge: 'Code & Architecture',
    desc: 'Deep dive into language mechanics, framework paradigms, data structures and debugging.'
  },
  {
    id: 'HR / Behavioral',
    title: 'HR & Behavioral',
    badge: 'Culture & STAR',
    desc: 'Behavioral scenarios, conflict resolution, teamwork, project ownership and career goals.'
  },
  {
    id: 'System Design',
    title: 'System Design',
    badge: 'Scalability',
    desc: 'High-level architecture, database indexing, caching strategies and microservices.'
  }
];

export default function SetupInterviewPage() {
  const { user, loginDemo, openPricing, refreshUser, openAuthModal } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState('Full Stack MERN Developer');
  const [experience, setExperience] = useState('Fresher / Entry-Level');
  const [roundType, setRoundType] = useState('Technical');
  const [interviewerPersona, setInterviewerPersona] = useState('sarah');
  const [resumeFile, setResumeFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState(null);

  const handlePreviewVoice = (persona) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const sampleText = `Hello! I'm ${persona.name}. I'm looking forward to conducting your interview today.`;
      const utterance = new SpeechSynthesisUtterance(sampleText);
      utterance.pitch = persona.pitch || 1.0;
      utterance.rate = persona.rate || 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Please select a PDF file format for your resume.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Resume file size must be less than 5 MB.');
        return;
      }
      setError(null);
      setResumeFile(file);
    }
  };

  const handleRemoveFile = () => {
    setResumeFile(null);
  };

  const handleStartInterview = async (e) => {
    e.preventDefault();
    setError(null);

    // Prompt user to sign in if not logged in
    if (!user) {
      openAuthModal();
      return;
    }

    if ((user?.credits ?? 50) < 10) {
      openPricing();
      return;
    }

    setLoading(true);
    setLoadingStep('Uploading & extracting resume insights...');

    try {
      const formData = new FormData();
      formData.append('role', role);
      formData.append('experience', experience);
      formData.append('roundType', roundType);
      formData.append('interviewerPersona', interviewerPersona);
      if (resumeFile) {
        formData.append('resume', resumeFile);
      }

      setLoadingStep('AI Agent is generating tailored questions...');
      const res = await api.post('/interviews/start', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const interviewId = res.data.interview?._id || res.data.interview?.id;
      if (res.data.success && interviewId) {
        await refreshUser();
        navigate(`/interview/${interviewId}`);
      } else {
        setError(res.data.message || 'Failed to start interview.');
      }
    } catch (err) {
      console.error('Setup interview error:', err);
      setError(err.response?.data?.message || 'Server error while starting interview.');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          Step 1: Configure Your Session
        </div>
        <h1 className="text-3xl font-extrabold text-white">Setup Mock Interview</h1>
        <p className="text-sm text-slate-400 mt-1 max-w-lg mx-auto">
          Tailor your session according to your target role, experience, and resume.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-950/50 border border-red-500/50 text-red-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleStartInterview} className="space-y-8">
        {/* SECTION 1: ROLE */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">Target Job Role</h2>
          </div>

          {/* Quick preset chips */}
          <div className="flex flex-wrap gap-2 mb-4">
            {PRESET_ROLES.map((preset) => (
              <button
                type="button"
                key={preset}
                onClick={() => setRole(preset)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all cursor-pointer ${
                  role === preset
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Custom Role Input */}
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            required
            placeholder="Or type custom role (e.g. SRE, iOS Developer, AI Engineer)"
            className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* SECTION 2: EXPERIENCE LEVEL */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 mb-4">
            <GraduationCap className="w-5 h-5 text-purple-400" />
            <h2 className="text-base font-bold text-white">Experience Level</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {EXPERIENCE_LEVELS.map((lvl) => (
              <div
                key={lvl.id}
                onClick={() => setExperience(lvl.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  experience === lvl.id
                    ? 'bg-indigo-950/40 border-indigo-500 text-white'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">{lvl.label}</span>
                  {experience === lvl.id && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                </div>
                <p className="text-[11px] text-slate-400">{lvl.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 3: ROUND TYPE */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Interview Round Format</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ROUND_TYPES.map((round) => (
              <div
                key={round.id}
                onClick={() => setRoundType(round.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  roundType === round.id
                    ? 'bg-emerald-950/30 border-emerald-500 text-white shadow-lg shadow-emerald-950/30'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-sm text-white">{round.title}</h3>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {round.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{round.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 4: CHOOSE AI HUMAN INTERVIEWER */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-bold text-white">Select Your AI Human Interviewer</h2>
            </div>
            <span className="text-[11px] font-semibold text-indigo-300 px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20">
              Interactive 3D / Video Presence
            </span>
          </div>

          <p className="text-xs text-slate-400 mb-4">
            Select the AI Human persona who will take your interview, speak the questions, and evaluate your responses in real-time.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.values(AI_PERSONAS).map((p) => (
              <div
                key={p.id}
                onClick={() => setInterviewerPersona(p.id)}
                className={`relative rounded-2xl border p-4 cursor-pointer transition-all flex flex-col justify-between ${
                  interviewerPersona === p.id
                    ? 'bg-gradient-to-b from-indigo-950/60 to-slate-900 border-indigo-500 shadow-xl shadow-indigo-950/40 scale-[1.02]'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div>
                  <div className="relative mb-3 rounded-xl overflow-hidden aspect-[4/3] border border-slate-700">
                    <img
                      src={p.avatar}
                      alt={p.name}
                      className="w-full h-full object-cover object-top"
                    />
                    <div className="absolute top-2 right-2">
                      {interviewerPersona === p.id && (
                        <div className="p-1 rounded-full bg-indigo-600 text-white shadow-lg">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                    <div className="absolute bottom-2 left-2 backdrop-blur-md bg-slate-950/80 px-2 py-0.5 rounded-md border border-slate-700 text-[10px] font-bold text-indigo-300">
                      {p.company}
                    </div>
                  </div>

                  <h3 className="font-bold text-sm text-white">{p.name}</h3>
                  <p className="text-[11px] text-slate-300 font-medium">{p.title}</p>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{p.badge}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-medium capitalize">
                    {p.gender} Voice
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreviewVoice(p);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold transition-colors cursor-pointer"
                    title="Listen to sample greeting"
                  >
                    <Volume2 className="w-3 h-3 text-indigo-400" />
                    <span>Sample Voice</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 5: RESUME UPLOAD */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              <h2 className="text-base font-bold text-white">Upload Resume (PDF)</h2>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Optional but highly recommended</span>
          </div>

          <p className="text-xs text-slate-400 mb-4">
            Our AI scans your PDF to align interview questions directly with your projects, internships, and tech stack.
          </p>

          {!resumeFile ? (
            <label className="border-2 border-dashed border-slate-700 hover:border-indigo-500/60 bg-slate-900/40 hover:bg-slate-900/80 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all group">
              <UploadCloud className="w-10 h-10 text-slate-500 group-hover:text-indigo-400 group-hover:scale-110 transition-all duration-200 mb-2" />
              <span className="text-xs font-semibold text-slate-200">
                Click to browse or drop your resume PDF here
              </span>
              <span className="text-[10px] text-slate-500 mt-1">Maximum size 5 MB</span>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          ) : (
            <div className="p-4 rounded-xl bg-slate-900/90 border border-indigo-500/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white truncate max-w-xs">{resumeFile.name}</p>
                  <p className="text-[10px] text-slate-400">
                    {(resumeFile.size / 1024).toFixed(1)} KB • Ready for AI analysis
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemoveFile}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                title="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* BOTTOM ACTION & CREDITS BADGE */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Zap className="w-5 h-5 fill-amber-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Cost: 10 Credits</p>
              <p className="text-[11px] text-slate-400">
                Your Balance:{' '}
                <span className="text-indigo-400 font-semibold">{user?.credits ?? 50} Credits</span>
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-9 py-4 rounded-2xl btn-aurora text-white font-bold text-sm shadow-2xl flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer tracking-wide"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{loadingStep || 'Generating Questions...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Launch Proctored Interview</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
