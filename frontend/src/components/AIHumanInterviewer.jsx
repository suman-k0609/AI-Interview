import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Sparkles,
  MessageSquare,
  Repeat,
  Sliders,
  CheckCircle,
  HelpCircle,
  UserCheck,
  Headphones,
  Radio,
  Eye,
  PenTool
} from 'lucide-react';

export const AI_PERSONAS = {
  sarah: {
    id: 'sarah',
    name: 'Dr. Sarah Chen',
    title: 'Lead AI & Systems Architect',
    company: 'AceMock AI',
    badge: 'Technical & Architecture Specialist',
    avatar: '/avatars/sarah.jpg',
    gender: 'female',
    pitch: 1.05,
    rate: 0.98,
    accent: 'en-US',
    greeting: (role, round) =>
      `Hello! Welcome to your ${round} interview for the ${role} position. I'm Dr. Sarah Chen, and I'll be conducting your session today. Take a deep breath, take your time to structure your thoughts, and whenever you're ready, let's explore your questions.`,
    transition: (qNum) =>
      `Thank you for sharing your thoughts on that. Let's move on to question number ${qNum}.`,
    feedbackIntro: () =>
      `I've reviewed your answer. Here is my immediate technical evaluation and feedback.`
  },
  marcus: {
    id: 'marcus',
    name: 'Marcus Vance',
    title: 'VP of Engineering',
    company: 'AceMock AI',
    badge: 'Executive & Scalability Specialist',
    avatar: '/avatars/marcus.jpg',
    gender: 'male',
    pitch: 0.92,
    rate: 0.96,
    accent: 'en-US',
    greeting: (role, round) =>
      `Welcome. I'm Marcus Vance, VP of Engineering. Today we're evaluating your approach to ${role} problems during this ${round} round. I value clear reasoning, trade-off analysis, and production engineering mindset. Let's get started.`,
    transition: (qNum) =>
      `Good insights. Let's proceed to question ${qNum} and see how you tackle this next scenario.`,
    feedbackIntro: () =>
      `Here is my breakdown of your response, including key trade-offs and suggestions.`
  },
  elena: {
    id: 'elena',
    name: 'Elena Rostova',
    title: 'Principal Software Architect',
    company: 'AceMock AI',
    badge: 'Full-Stack & Deep Systems Specialist',
    avatar: '/avatars/elena.jpg',
    gender: 'female',
    pitch: 1.0,
    rate: 1.0,
    accent: 'en-US',
    greeting: (role, round) =>
      `Hi there! Great to meet you. I'm Elena Rostova, Principal Software Architect. We'll be walking through real-world scenarios for the ${role} role today. Feel free to explain your thought process out loud as you formulate your solution.`,
    transition: (qNum) =>
      `Excellent explanation. Let's dive into question number ${qNum}.`,
    feedbackIntro: () =>
      `Let's analyze what went well and where you can sharpen your approach.`
  }
};

export default function AIHumanInterviewer({
  personaKey = 'sarah',
  onPersonaChange,
  status = 'idle', // 'speaking' | 'listening' | 'evaluating' | 'idle'
  currentQuestion = '',
  questionNumber = 1,
  totalQuestions = 5,
  role = 'Full Stack Developer',
  roundType = 'Technical',
  autoSpeak = true,
  onSpeechEnd
}) {
  const persona = AI_PERSONAS[personaKey] || AI_PERSONAS.sarah;

  const [isMuted, setIsMuted] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [showCaptions, setShowCaptions] = useState(true);
  const [currentCaption, setCurrentCaption] = useState('');
  const [isSpeakingLocal, setIsSpeakingLocal] = useState(false);
  const [mouthPhase, setMouthPhase] = useState(0);
  const [isBlinking, setIsBlinking] = useState(false);
  const [audioLevel, setAudioLevel] = useState([12, 28, 45, 30, 18, 50, 35, 20]);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);

  const utteranceRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Load browser speech synthesis voices
  useEffect(() => {
    const updateVoices = () => {
      if ('speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
      }
    };

    updateVoices();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  // Natural blinking effect every 3.5 - 6 seconds
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 220);
    }, Math.floor(Math.random() * 2500) + 3500);

    return () => clearInterval(blinkInterval);
  }, []);

  // Procedural lip-sync and audio visualizer animation when AI is speaking
  useEffect(() => {
    let interval;
    if (isSpeakingLocal) {
      interval = setInterval(() => {
        setMouthPhase((prev) => (prev + 1) % 4);
        setAudioLevel([
          Math.floor(Math.random() * 60) + 20,
          Math.floor(Math.random() * 85) + 30,
          Math.floor(Math.random() * 100) + 40,
          Math.floor(Math.random() * 75) + 25,
          Math.floor(Math.random() * 90) + 35,
          Math.floor(Math.random() * 65) + 20,
          Math.floor(Math.random() * 80) + 30,
          Math.floor(Math.random() * 50) + 15
        ]);
      }, 120);
    } else {
      setMouthPhase(0);
      setAudioLevel([10, 15, 12, 18, 14, 16, 12, 10]);
    }

    return () => clearInterval(interval);
  }, [isSpeakingLocal]);

  // Main speech synthesis trigger
  const speakText = (text, onEndCallback) => {
    if (!('speechSynthesis' in window) || isMuted) {
      if (onEndCallback) onEndCallback();
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speechRate * (persona.rate || 1.0);
    utterance.pitch = persona.pitch || 1.0;

    // Pick best matching voice
    if (availableVoices.length > 0) {
      const preferred = availableVoices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (persona.gender === 'female'
            ? v.name.includes('Female') ||
              v.name.includes('Samantha') ||
              v.name.includes('Zira') ||
              v.name.includes('Jenny') ||
              v.name.includes('Google US English')
            : v.name.includes('Male') ||
              v.name.includes('David') ||
              v.name.includes('Guy') ||
              v.name.includes('George'))
      );
      if (preferred) {
        utterance.voice = preferred;
      }
    }

    utterance.onstart = () => {
      setIsSpeakingLocal(true);
      setCurrentCaption(text);
    };

    utterance.onend = () => {
      setIsSpeakingLocal(false);
      if (onEndCallback) onEndCallback();
      if (onSpeechEnd) onSpeechEnd();
    };

    utterance.onerror = () => {
      setIsSpeakingLocal(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // Speak question automatically when question changes
  useEffect(() => {
    if (autoSpeak && currentQuestion) {
      // If it's question 1, give a warm greeting first
      if (questionNumber === 1) {
        const fullGreeting = `${persona.greeting(role, roundType)} Here is your first question: ${currentQuestion}`;
        speakText(fullGreeting);
      } else {
        const transitionText = `${persona.transition(questionNumber)} ${currentQuestion}`;
        speakText(transitionText);
      }
    }

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentQuestion, questionNumber, personaKey]);

  // Handle manual repeat
  const handleRepeatQuestion = () => {
    if (currentQuestion) {
      speakText(`Let me repeat the question: ${currentQuestion}`);
    }
  };

  // Effective status (speaking takes precedence if voice is actively playing)
  const activeStatus = isSpeakingLocal ? 'speaking' : status;

  return (
    <div className="relative rounded-3xl overflow-hidden border border-slate-700/80 bg-slate-950 shadow-2xl flex flex-col justify-between aspect-[16/10] sm:aspect-[16/9] w-full group">
      {/* BACKGROUND AVATAR VIDEO STREAM SIMULATION */}
      <div className="absolute inset-0 z-0">
        <img
          src={persona.avatar}
          alt={persona.name}
          className={`w-full h-full object-cover object-top transition-all duration-700 ${
            activeStatus === 'speaking'
              ? 'scale-105 filter brightness-105'
              : activeStatus === 'listening'
              ? 'scale-100 filter brightness-100'
              : 'scale-100 filter brightness-95'
          }`}
        />

        {/* Ambient Gradient Overlays for Video Meeting Look */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-slate-950/40 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/40 via-transparent to-slate-950/40 pointer-events-none" />

        {/* Dynamic Lip-Sync Mouth Overlay Animation (Procedural Mouth Movement) */}
        {activeStatus === 'speaking' && (
          <div
            className="absolute left-[49%] top-[45%] -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-75"
            style={{
              opacity: mouthPhase > 0 ? 0.35 : 0.05,
              transform: `scaleY(${1 + mouthPhase * 0.25}) scaleX(${1 + (mouthPhase % 2) * 0.1})`
            }}
          >
            <div className="w-10 h-3.5 rounded-full bg-rose-950/80 blur-[2px] border border-rose-500/30" />
          </div>
        )}

        {/* Subtle Natural Blinking Overlay */}
        {isBlinking && (
          <div className="absolute inset-0 bg-slate-950/15 pointer-events-none transition-opacity duration-100" />
        )}
      </div>

      {/* TOP HEADER OVERLAY: Persona Info & Live Status Badge */}
      <div className="relative z-10 p-3 sm:p-5 flex items-start justify-between gap-3">
        {/* Left: Persona identity card */}
        <div className="flex items-center gap-3 backdrop-blur-md bg-slate-900/80 px-3.5 py-2 rounded-2xl border border-slate-700/60 shadow-lg">
          <div className="relative">
            <img
              src={persona.avatar}
              alt={persona.name}
              className="w-10 h-10 rounded-full object-cover border-2 border-indigo-500 shadow-md"
            />
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900 ring-2 ring-emerald-500/40 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide">{persona.name}</h3>
              <span className="hidden sm:inline text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                AI Human
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-300 font-medium">
              {persona.title} • <span className="text-indigo-400">{persona.company}</span>
            </p>
          </div>
        </div>

        {/* Right: Real-time Status Badge & Switcher Button */}
        <div className="flex items-center gap-2">
          {/* Live Audio State Indicator */}
          <div className="flex items-center gap-2 backdrop-blur-md bg-slate-900/85 px-3 py-1.5 rounded-2xl border border-slate-700/60 shadow-lg">
            {activeStatus === 'speaking' ? (
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400">
                <Radio className="w-3.5 h-3.5 text-indigo-400 animate-ping" />
                <span className="animate-pulse">Speaking...</span>
                {/* Mini Audio Equalizer */}
                <div className="flex items-end gap-0.5 h-3 ml-1">
                  {audioLevel.slice(0, 4).map((lvl, idx) => (
                    <span
                      key={idx}
                      className="w-1 bg-indigo-400 rounded-full transition-all duration-100"
                      style={{ height: `${Math.max(4, Math.min(14, lvl / 6))}px` }}
                    />
                  ))}
                </div>
              </div>
            ) : activeStatus === 'listening' ? (
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                <Headphones className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                <span>Listening Intently</span>
              </div>
            ) : activeStatus === 'evaluating' ? (
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                <PenTool className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                <span>Evaluating Response</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <Eye className="w-3.5 h-3.5 text-slate-400" />
                <span>Observing</span>
              </div>
            )}
          </div>

          {/* Persona Menu Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowPersonaMenu((prev) => !prev)}
              className="backdrop-blur-md bg-slate-900/85 hover:bg-slate-800 text-slate-200 p-2 rounded-2xl border border-slate-700/60 shadow-lg transition-colors cursor-pointer"
              title="Change AI Interviewer Persona"
            >
              <UserCheck className="w-4 h-4 text-indigo-400" />
            </button>

            {showPersonaMenu && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-2 z-50">
                <p className="text-[11px] font-bold text-slate-400 px-3 py-1 uppercase tracking-wider">
                  Select AI Interviewer
                </p>
                {Object.values(AI_PERSONAS).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      if (onPersonaChange) onPersonaChange(p.id);
                      setShowPersonaMenu(false);
                    }}
                    className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition-colors cursor-pointer ${
                      p.id === persona.id
                        ? 'bg-indigo-600/20 text-white border border-indigo-500/40'
                        : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <img
                      src={p.avatar}
                      alt={p.name}
                      className="w-8 h-8 rounded-full object-cover border border-slate-600"
                    />
                    <div>
                      <p className="text-xs font-bold leading-tight">{p.name}</p>
                      <p className="text-[10px] text-slate-400">{p.title}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CENTER WATERMARK / INTERVIEW ROUND PILL */}
      <div className="relative z-10 self-center pointer-events-none">
        <div className="backdrop-blur-md bg-slate-950/60 px-4 py-1.5 rounded-full border border-slate-700/40 text-[11px] font-medium text-slate-300 flex items-center gap-2 shadow-inner">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
          <span>{roundType} Mock Interview</span>
          <span className="text-slate-500">•</span>
          <span className="text-indigo-300 font-semibold">Question {questionNumber} of {totalQuestions}</span>
        </div>
      </div>

      {/* BOTTOM SECTION: Live Closed Captions + Interactive Audio Bar */}
      <div className="relative z-10 p-3 sm:p-5 flex flex-col gap-3">
        {/* Live Subtitles / Closed Captions */}
        {showCaptions && currentCaption && (
          <div className="backdrop-blur-md bg-slate-950/90 border border-slate-800/80 rounded-2xl p-3.5 shadow-2xl text-center max-w-2xl mx-auto transition-all animate-in fade-in slide-in-from-bottom-2">
            <p className="text-[11px] font-bold text-indigo-400 mb-0.5 uppercase tracking-wider flex items-center justify-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {persona.name} Speaking
            </p>
            <p className="text-xs sm:text-sm text-slate-100 font-medium leading-relaxed italic">
              "{currentCaption}"
            </p>
          </div>
        )}

        {/* Video Call Controls Bar (Google Meet Style) */}
        <div className="flex flex-wrap items-center justify-between gap-2 backdrop-blur-md bg-slate-900/80 p-2 sm:p-2.5 rounded-2xl border border-slate-800/80 shadow-lg">
          {/* Left: Persona badge */}
          <div className="flex items-center gap-2 text-xs text-slate-300 font-medium pl-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">{persona.badge}</span>
          </div>

          {/* Center: Dynamic Audio Visualizer Bars */}
          <div className="flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-950/60 border border-slate-800">
            {audioLevel.map((level, idx) => (
              <span
                key={idx}
                className={`w-1 rounded-full transition-all duration-100 ${
                  activeStatus === 'speaking'
                    ? 'bg-gradient-to-t from-indigo-500 to-purple-400'
                    : activeStatus === 'listening'
                    ? 'bg-emerald-500'
                    : 'bg-slate-700'
                }`}
                style={{ height: `${Math.max(4, Math.min(22, level / 4))}px` }}
              />
            ))}
          </div>

          {/* Right: Audio & Video Actions */}
          <div className="flex items-center gap-1.5">
            {/* Repeat Question Button */}
            <button
              onClick={handleRepeatQuestion}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
              title="Ask interviewer to repeat the question"
            >
              <Repeat className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Repeat</span>
            </button>

            {/* Captions Toggle */}
            <button
              onClick={() => setShowCaptions((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                showCaptions
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
              title="Toggle Live Closed Captions"
            >
              CC
            </button>

            {/* Speech Rate Cycle */}
            <button
              onClick={() => {
                const nextRate = speechRate === 1.0 ? 1.15 : speechRate === 1.15 ? 0.9 : 1.0;
                setSpeechRate(nextRate);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              title="Change speech rate"
            >
              {speechRate}x
            </button>

            {/* Mute/Unmute AI Voice */}
            <button
              onClick={() => {
                if (!isMuted && 'speechSynthesis' in window) {
                  window.speechSynthesis.cancel();
                  setIsSpeakingLocal(false);
                }
                setIsMuted((prev) => !prev);
              }}
              className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                isMuted
                  ? 'bg-rose-950/80 text-rose-400 border border-rose-500/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
              title={isMuted ? 'Unmute AI Voice' : 'Mute AI Voice'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-indigo-400" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
