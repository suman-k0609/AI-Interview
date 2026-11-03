import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import AIHumanInterviewer, { AI_PERSONAS } from '../components/AIHumanInterviewer';
import CandidateVideoFeed from '../components/CandidateVideoFeed';
import {
  Volume2,
  Mic,
  MicOff,
  Send,
  Sparkles,
  ArrowRight,
  CheckCircle,
  HelpCircle,
  Clock,
  Award,
  Loader2,
  MessageSquare,
  Video,
  Grid,
  PhoneOff,
  Radio,
  FileText,
  Repeat,
  Lightbulb,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  AlertTriangle,
  Shield,
  Zap,
  VolumeX,
  Copy,
  Check,
  BookOpen
} from 'lucide-react';

export default function InterviewRoomPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [interview, setInterview] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerText, setAnswerText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [activeFeedback, setActiveFeedback] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [personaKey, setPersonaKey] = useState('sarah');
  const [aiStatus, setAiStatus] = useState('speaking'); // 'speaking' | 'listening' | 'evaluating' | 'idle'
  const [layoutMode, setLayoutMode] = useState('split'); // 'split' | 'focus'
  const [autoReadNext, setAutoReadNext] = useState(true);
  const [showHint, setShowHint] = useState(false);
  const [candidateSpeechLevel, setCandidateSpeechLevel] = useState(0);
  const [candidateVisionStatus, setCandidateVisionStatus] = useState('active');
  const [integrityScore, setIntegrityScore] = useState(100);
  const [proctoringViolations, setProctoringViolations] = useState([]);
  const [activeAlert, setActiveAlert] = useState(null);
  const [speakingIdealAnswer, setSpeakingIdealAnswer] = useState(false);
  const [copiedIdeal, setCopiedIdeal] = useState(false);
  const [showAnswerComparison, setShowAnswerComparison] = useState(false);

  const recognitionRef = useRef(null);
  const alertTimeoutRef = useRef(null);

  // Proctoring Violation Handler
  const handleProctoringViolation = ({ type, message, confidence }) => {
    const timeStr = formatTimer(elapsedSeconds);
    const newViolation = { time: timeStr, type, message, confidence };

    setProctoringViolations((prev) => [newViolation, ...prev.slice(0, 9)]);

    // Deduct points based on severity
    let penalty = 10;
    if (type === 'PHONE_DETECTED') penalty = 15;
    if (type === 'MULTIPLE_PEOPLE') penalty = 10;
    if (type === 'TAB_SWITCH') penalty = 10;
    if (type === 'CLIPBOARD_PASTE') penalty = 5;

    setIntegrityScore((prev) => Math.max(0, prev - penalty));

    // Show floating alert
    setActiveAlert(newViolation);
    if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    alertTimeoutRef.current = setTimeout(() => {
      setActiveAlert(null);
    }, 4500);

    // Audio verbal alert from interviewer
    if (type === 'PHONE_DETECTED' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const warningSpeech = new SpeechSynthesisUtterance('Attention: Mobile device detected. Please keep your phone out of the camera view.');
      warningSpeech.rate = 1.05;
      window.speechSynthesis.speak(warningSpeech);
    }
  };

  // Browser Tab Switch & Blur Integrity Listener
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        handleProctoringViolation({
          type: 'TAB_SWITCH',
          message: 'Switched tabs / navigated away from the interview room'
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [elapsedSeconds]);

  // Load interview on mount
  useEffect(() => {
    fetchInterview();
  }, [id]);

  // Session timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchInterview = async () => {
    try {
      const res = await api.get(`/interviews/${id}`);
      if (res.data.success) {
        const interviewData = res.data.interview;
        setInterview(interviewData);

        if (interviewData.interviewerPersona && AI_PERSONAS[interviewData.interviewerPersona]) {
          setPersonaKey(interviewData.interviewerPersona);
        }

        // Find first unanswered question
        const firstUnanswered = interviewData.questions.findIndex((q) => !q.userAnswer);
        if (firstUnanswered !== -1) {
          setCurrentIndex(firstUnanswered);
        } else if (interviewData.status === 'completed') {
          navigate(`/report/${id}`);
        }
      }
    } catch (err) {
      console.error('Failed to load interview session:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTimer = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Speech-To-Text: Browser microphone dictation
  const toggleSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. You can type your answer in the box.');
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      setAiStatus('idle');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
        setAiStatus('listening');
      };

      recognition.onend = () => {
        setIsRecording(false);
        setAiStatus('idle');
      };

      recognition.onerror = (e) => {
        console.warn('Speech recognition event:', e.error);
        setIsRecording(false);
        setAiStatus('idle');
      };

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setAnswerText((prev) => {
          const trimmed = prev.trim();
          return trimmed ? `${trimmed} ${transcript}` : transcript;
        });
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error('Speech recognition error:', e);
      setIsRecording(false);
    }
  };

  // Stop recording if active when moving or submitting
  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  // Submit Answer for Current Question
  const handleSubmitAnswer = async () => {
    if (!answerText.trim()) {
      alert('Please provide your answer before submitting.');
      return;
    }

    stopRecording();
    setSubmitting(true);
    setAiStatus('evaluating');

    try {
      const res = await api.post(`/interviews/${id}/answer`, {
        questionIndex: currentIndex,
        answer: answerText
      });

      if (res.data.success) {
        setInterview(res.data.interview);
        setActiveFeedback({
          score: res.data.currentQuestion.score,
          feedback: res.data.currentQuestion.feedback,
          idealAnswer: res.data.currentQuestion.idealAnswer || res.data.currentQuestion.expectedAnswer || '',
          userAnswer: answerText,
          isCompleted: res.data.isCompleted
        });
        setAiStatus('idle');
      }
    } catch (err) {
      console.error('Failed to submit answer:', err);
      alert('Error evaluating answer. Please try again.');
      setAiStatus('idle');
    } finally {
      setSubmitting(false);
    }
  };

  // Speak / Read Aloud Ideal Model Answer
  const toggleSpeakIdealAnswer = (text) => {
    if (!('speechSynthesis' in window)) return;
    if (speakingIdealAnswer) {
      window.speechSynthesis.cancel();
      setSpeakingIdealAnswer(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.onend = () => setSpeakingIdealAnswer(false);
    utterance.onerror = () => setSpeakingIdealAnswer(false);
    setSpeakingIdealAnswer(true);
    window.speechSynthesis.speak(utterance);
  };

  // Copy Ideal Model Answer to Clipboard
  const handleCopyIdealAnswer = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedIdeal(true);
    setTimeout(() => setCopiedIdeal(false), 2000);
  };

  // Move to Next Question or Final Report
  const handleNext = () => {
    stopRecording();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeakingIdealAnswer(false);
    }

    if (activeFeedback?.isCompleted) {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      navigate(`/report/${id}`);
      return;
    }

    setActiveFeedback(null);
    setAnswerText('');
    setShowHint(false);
    setShowAnswerComparison(false);
    setAiStatus('speaking');
    setCurrentIndex((prev) => prev + 1);
  };

  if (loading) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center text-center p-6">
        <div className="relative mb-4">
          <div className="w-16 h-16 rounded-3xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center animate-pulse">
            <Video className="w-8 h-8 text-indigo-400" />
          </div>
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400 absolute -bottom-1 -right-1" />
        </div>
        <h2 className="text-lg font-bold text-white mb-1">Connecting to AI Interview Room...</h2>
        <p className="text-xs text-slate-400 max-w-sm">
          Initializing realistic AI interviewer presence, video feeds, and real-time audio channels.
        </p>
      </div>
    );
  }

  if (!interview || !interview.questions?.length) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
        <p className="text-slate-400 text-sm mb-4">Interview session not found or expired.</p>
        <button
          onClick={() => navigate('/setup')}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer"
        >
          Start New Interview
        </button>
      </div>
    );
  }

  const currentQ = interview.questions[currentIndex] || {};
  const totalQuestions = interview.questions.length;
  const progressPercent = Math.round(((currentIndex + 1) / totalQuestions) * 100);
  const currentPersona = AI_PERSONAS[personaKey] || AI_PERSONAS.sarah;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 relative">
      {/* 🚨 FLOATING PROCTORING ALERT TOAST */}
      {activeAlert && (
        <div className="fixed top-6 right-6 z-50 bg-rose-950/95 border-2 border-rose-500 text-white p-4 rounded-2xl shadow-2xl flex items-start gap-3 max-w-sm backdrop-blur-md animate-in slide-in-from-right-4 duration-200">
          <div className="p-2 rounded-xl bg-rose-600/30 text-rose-300 shrink-0">
            {activeAlert.type === 'PHONE_DETECTED' ? (
              <Smartphone className="w-5 h-5 animate-bounce" />
            ) : (
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            )}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-rose-300">
              Proctoring Violation
            </p>
            <p className="text-xs font-bold text-white mt-0.5">{activeAlert.message}</p>
            <p className="text-[10px] text-rose-200 mt-1 font-semibold">
              Integrity Trust Score: <span className="text-white font-extrabold">{integrityScore}%</span>
            </p>
          </div>
        </div>
      )}

      {/* TOP HEADER: Google Meet Style Session Banner */}
      <div className="glass-panel p-3 sm:p-4 rounded-2xl border border-slate-800 mb-5 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        {/* Left: Meeting title & Interview metadata */}
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping" title="Live Video Room" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-sm sm:text-base text-white">{interview.role}</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {interview.roundType}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Live AI Interviewer: <span className="text-slate-200 font-semibold">{currentPersona.name}</span> • Level: {interview.experience}
            </p>
          </div>
        </div>

        {/* Right: Timer, Layout Selector, and Progress */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Layout Toggle */}
          <div className="hidden md:flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => setLayoutMode('split')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                layoutMode === 'split' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Split View (Side-by-side Video & Question Workspace)"
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Split View</span>
            </button>
            <button
              onClick={() => setLayoutMode('focus')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                layoutMode === 'focus' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Focus Meeting View"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Video Focus</span>
            </button>
          </div>

          {/* Session Timer */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 shadow-inner">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>{formatTimer(elapsedSeconds)}</span>
          </div>

          {/* Progress Indicator */}
          <div className="text-right">
            <span className="text-xs font-bold text-white">
              Q{currentIndex + 1} of {totalQuestions}
            </span>
            <div className="w-24 sm:w-28 h-2 bg-slate-800 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* MAIN WORKSPACE GRID: AI HUMAN PRESENCE + CANDIDATE FEED + INTERACTION */}
      <div className={`grid gap-6 ${layoutMode === 'split' ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1'}`}>
        {/* COLUMN 1: VIDEO CALL STAGE (AI HUMAN INTERVIEWER + CANDIDATE FEED) */}
        <div className={layoutMode === 'split' ? 'lg:col-span-7 flex flex-col gap-4' : 'flex flex-col gap-4'}>
          {/* Primary Stream: AI Human Interviewer */}
          <AIHumanInterviewer
            personaKey={personaKey}
            onPersonaChange={(newKey) => setPersonaKey(newKey)}
            status={aiStatus}
            currentQuestion={currentQ.question}
            questionNumber={currentIndex + 1}
            totalQuestions={totalQuestions}
            role={interview.role}
            roundType={interview.roundType}
            autoSpeak={autoReadNext}
            onSpeechEnd={() => {
              // Transition smoothly to attentive listening state after reading question
              if (aiStatus === 'speaking') {
                setAiStatus('listening');
              }
            }}
          />

          {/* Secondary Stream: Candidate Live Webcam & Mic Audio Waveform */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-7">
              <CandidateVideoFeed
                candidateName={user?.name || 'Candidate'}
                isSpeaking={isRecording}
                isMicActive={!isRecording ? false : true}
                onVolumeChange={(vol) => setCandidateSpeechLevel(vol)}
                onVisionStatusChange={(status) => setCandidateVisionStatus(status)}
                onProctoringViolation={handleProctoringViolation}
              />
            </div>

            {/* Quick Context & Live Feedback Status Card */}
            <div className="sm:col-span-5 glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Session & Integrity</span>
                  </div>

                  {/* Anti-Cheat Trust Score Badge */}
                  <div
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-extrabold border ${
                      integrityScore >= 85
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                        : integrityScore >= 65
                        ? 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                        : 'bg-rose-950/60 text-rose-300 border-rose-500/40 animate-pulse'
                    }`}
                  >
                    <Shield className="w-3 h-3" />
                    <span>Trust: {integrityScore}%</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-[11px] text-slate-300">
                  <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">Current AI Persona:</span>
                    <span className="font-semibold text-indigo-300">{currentPersona.name}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">Camera Feed:</span>
                    <span
                      className={`font-semibold ${
                        candidateVisionStatus === 'phone_detected'
                          ? 'text-rose-400 font-bold'
                          : candidateVisionStatus === 'blocked'
                          ? 'text-rose-400 font-bold'
                          : candidateVisionStatus === 'no_face'
                          ? 'text-amber-400 font-bold'
                          : candidateVisionStatus === 'too_dark'
                          ? 'text-slate-400'
                          : candidateVisionStatus === 'off'
                          ? 'text-slate-500'
                          : 'text-emerald-400'
                      }`}
                    >
                      {candidateVisionStatus === 'phone_detected'
                        ? '🚨 Phone Detected'
                        : candidateVisionStatus === 'blocked'
                        ? '⚠️ Hand / Obstructed'
                        : candidateVisionStatus === 'no_face'
                        ? '⚠️ Face Not Centered'
                        : candidateVisionStatus === 'too_dark'
                        ? '🌙 Low Light'
                        : candidateVisionStatus === 'off'
                        ? 'Camera Off'
                        : '🟢 Face In Frame'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">Phone Detection:</span>
                    <span className="font-semibold text-emerald-400 flex items-center gap-1">
                      <Smartphone className="w-3 h-3 text-indigo-400" />
                      <span>Active Neural Guard</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">Anti-Cheat Flags:</span>
                    <span className={`font-semibold ${proctoringViolations.length > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                      {proctoringViolations.length} recorded
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-400">Speech Recognition:</span>
                    <span className="font-semibold text-slate-200">
                      {isRecording ? '🎙️ Actively Listening' : 'Ready'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Persona Bio Snippet */}
              <div className="mt-3 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[10px] text-slate-400 leading-relaxed">
                💡 <span className="font-semibold text-slate-300">{currentPersona.name}:</span> "{currentPersona.title}. Speak naturally and articulate your thought process step by step."
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN 2: QUESTION DISPLAY, VOICE DICTATION & ANSWER SUBMISSION */}
        <div className={layoutMode === 'split' ? 'lg:col-span-5 flex flex-col gap-4' : 'flex flex-col gap-4'}>
          {/* QUESTION CARD */}
          <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-slate-800 relative overflow-hidden shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                  {currentQ.category || 'Core Question'}
                </span>
                <span className="text-xs text-slate-400 font-medium">Question #{currentIndex + 1}</span>
              </div>

              {/* Hint button */}
              <button
                onClick={() => setShowHint((prev) => !prev)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-colors cursor-pointer"
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                <span>{showHint ? 'Hide Hint' : 'Need Hint?'}</span>
              </button>
            </div>

            <h2 className="text-base sm:text-lg font-bold text-white leading-relaxed mb-2">
              {currentQ.question}
            </h2>

            {showHint && (
              <div className="mt-3 p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200 leading-relaxed animate-in fade-in">
                💡 <span className="font-bold">Interviewer Tip:</span> Structure your response using architectural principles or STAR method (Situation, Task, Action, Result). Mention real-world edge cases.
              </div>
            )}
          </div>

          {/* ACTIVE FEEDBACK CARD (Displays after submitting) */}
          {activeFeedback ? (
            <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-indigo-500/40 bg-gradient-to-b from-indigo-950/40 to-slate-900/90 shadow-2xl animate-in fade-in zoom-in-95 duration-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-indigo-600/30 text-indigo-300">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">AI Human Evaluation</h3>
                    <p className="text-[11px] text-slate-400">Reviewed by {currentPersona.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-600 text-white font-extrabold text-sm shadow-md shadow-indigo-600/30">
                  <Award className="w-4 h-4" />
                  <span>{activeFeedback.score} / 10 Score</span>
                </div>
              </div>

              {/* Constructive Critique */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-200 leading-relaxed">
                <p className="font-semibold text-indigo-300 mb-1">Constructive Feedback & Key Points:</p>
                <p>{activeFeedback.feedback}</p>
              </div>

              {/* 🌟 AI PERFECT MODEL ANSWER (What the candidate should know) */}
              {activeFeedback.idealAnswer && (
                <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/40 via-slate-900/90 to-indigo-950/40 border border-emerald-500/40 shadow-xl">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-emerald-500/20">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                        AI Perfect Model Answer (10/10 Standard)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Read Aloud Button */}
                      <button
                        type="button"
                        onClick={() => toggleSpeakIdealAnswer(activeFeedback.idealAnswer)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          speakingIdealAnswer
                            ? 'bg-emerald-500 text-slate-950 animate-pulse'
                            : 'bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/30'
                        }`}
                        title="Listen to how the AI delivers this model answer"
                      >
                        {speakingIdealAnswer ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                        <span>{speakingIdealAnswer ? 'Stop Listening' : 'Listen to Answer'}</span>
                      </button>

                      {/* Copy Model Answer */}
                      <button
                        type="button"
                        onClick={() => handleCopyIdealAnswer(activeFeedback.idealAnswer)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-colors border border-slate-700 cursor-pointer"
                        title="Copy model answer"
                      >
                        {copiedIdeal ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedIdeal ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-emerald-100/90 leading-relaxed">
                    {activeFeedback.idealAnswer}
                  </p>

                  {/* Compare toggle */}
                  <div className="mt-3 pt-2 border-t border-emerald-500/20 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowAnswerComparison((prev) => !prev)}
                      className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <BookOpen className="w-3 h-3" />
                      <span>{showAnswerComparison ? 'Hide Answer Comparison' : 'Compare With Your Answer'}</span>
                    </button>
                    <span className="text-[10px] text-slate-400">Study this model answer to master key concepts</span>
                  </div>

                  {showAnswerComparison && (
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs animate-in fade-in">
                      <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                          Your Submitted Answer:
                        </p>
                        <p className="text-slate-300 leading-relaxed">
                          {activeFeedback.userAnswer || answerText || 'No answer submitted'}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1">
                          Ideal Model Answer:
                        </p>
                        <p className="text-emerald-200/90 leading-relaxed">
                          {activeFeedback.idealAnswer}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                >
                  {activeFeedback.isCompleted ? (
                    <>
                      <Award className="w-4 h-4" />
                      <span>View Final Performance Scorecard</span>
                    </>
                  ) : (
                    <>
                      <span>Next Question</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* ANSWER INPUT AREA */
            <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-slate-800 flex flex-col justify-between shadow-xl">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-indigo-400" />
                    Your Answer
                  </label>

                  <div className="flex items-center gap-2">
                    {/* Voice Dictation Button */}
                    <button
                      type="button"
                      onClick={toggleSpeechRecognition}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md ${
                        isRecording
                          ? 'bg-rose-600 hover:bg-rose-500 text-white ring-2 ring-rose-500/50 animate-pulse'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      }`}
                      title="Speak answer via microphone"
                    >
                      {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                      <span>{isRecording ? 'Listening (Click to Stop)' : 'Speak Your Answer'}</span>
                    </button>

                    <span className="text-[11px] text-slate-400 font-mono">
                      {answerText.trim().split(/\s+/).filter(Boolean).length} words
                    </span>
                  </div>
                </div>

                {/* Live Dictation Active Indicator */}
                {isRecording && (
                  <div className="mb-2 p-2 rounded-xl bg-rose-950/40 border border-rose-500/30 flex items-center justify-between text-[11px] text-rose-300 animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                      <span>Dictation active — Speak clearly into your mic. Your words appear below.</span>
                    </div>
                  </div>
                )}

                <textarea
                  rows={6}
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  onPaste={(e) => {
                    e.preventDefault();
                    handleProctoringViolation({
                      type: 'CLIPBOARD_PASTE',
                      message: 'Clipboard pasting is prohibited. Please type or speak original answers.'
                    });
                  }}
                  placeholder="Speak your answer using the microphone button above, or type your answer here in detail... Explain your concepts, architecture, and real-world considerations."
                  className="w-full p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors leading-relaxed resize-y"
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                  Interviewer evaluates depth, precision, and problem-solving clarity.
                </span>

                <button
                  onClick={handleSubmitAnswer}
                  disabled={submitting || !answerText.trim()}
                  className="flex items-center gap-2 px-7 py-3 rounded-xl btn-aurora text-white font-bold text-xs shadow-xl transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Evaluating Answer...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Answer</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* QUESTION NAVIGATOR PILLS */}
          <div className="glass-panel p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 pl-2">Questions Navigator:</span>
            <div className="flex items-center gap-1.5">
              {interview.questions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (q.userAnswer) {
                      setCurrentIndex(idx);
                      setAnswerText(q.userAnswer || '');
                      setActiveFeedback({
                        score: q.score,
                        feedback: q.feedback,
                        idealAnswer: q.idealAnswer || q.expectedAnswer || '',
                        userAnswer: q.userAnswer,
                        isCompleted: false
                      });
                    }
                  }}
                  className={`w-8 h-8 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                    idx === currentIndex
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-400/50 scale-105'
                      : q.userAnswer
                      ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-900 text-slate-500 border border-slate-800'
                  }`}
                  title={`Question ${idx + 1}`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
