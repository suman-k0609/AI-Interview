import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { History, PlayCircle, Award, Calendar, Layers, ArrowRight, Loader2 } from 'lucide-react';

export default function HistoryPage() {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/interviews/history');
      if (res.data.success) {
        setInterviews(res.data.interviews);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-3" />
        <p className="text-sm font-semibold text-slate-300">Loading your interview archive...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <History className="w-6 h-6 text-indigo-400" />
            Interview History & Scorecards
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Review past mock interviews and track your progress over time.
          </p>
        </div>

        <Link
          to="/setup"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all"
        >
          <PlayCircle className="w-4 h-4" />
          <span>New Mock Session</span>
        </Link>
      </div>

      {interviews.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl border border-slate-800 text-center max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mx-auto mb-4">
            <History className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">No Interviews Taken Yet</h2>
          <p className="text-xs text-slate-400 leading-relaxed mb-6">
            Get started by uploading your resume or selecting a role to practice your first AI mock session.
          </p>
          <Link
            to="/setup"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all"
          >
            <span>Start Your First Interview</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {interviews.map((item) => (
            <div
              key={item._id}
              className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">{item.role}</h3>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {item.roundType}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                  <span>•</span>
                  <span>{item.experience}</span>
                  <span>•</span>
                  <span>{item.questions?.length || 5} Questions</span>
                </div>
              </div>

              <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                {(() => {
                  const answeredQuestions = (item.questions || []).filter(
                    (q) => q.userAnswer && typeof q.score === 'number'
                  );
                  const totalQuestions = item.questions?.length || 5;
                  const answeredCount = answeredQuestions.length;

                  let score = 0;
                  if (item.status === 'completed' && typeof item.overallScore === 'number' && item.overallScore > 0) {
                    score = item.overallScore;
                  } else if (answeredCount > 0) {
                    const totalScoreEarned = answeredQuestions.reduce((sum, q) => sum + q.score, 0);
                    score = Math.round((totalScoreEarned / answeredCount) * 10);
                  }

                  return (
                    <div className="text-right">
                      <div className={`flex items-center gap-1 text-sm font-extrabold ${
                        score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-indigo-400' : 'text-amber-400'
                      }`}>
                        <Award className="w-4 h-4" />
                        <span>
                          {answeredCount === 0 && item.status !== 'completed'
                            ? 'Not Started'
                            : `${score} / 100`}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1 justify-end mt-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'completed' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                        <span>{item.status === 'completed' ? 'Completed' : `In Progress (${answeredCount}/${totalQuestions})`}</span>
                      </span>
                    </div>
                  );
                })()}

                <Link
                  to={item.status === 'completed' ? `/report/${item._id}` : `/interview/${item._id}`}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white text-xs font-semibold transition-all"
                >
                  <span>{item.status === 'completed' ? 'View Report' : 'Resume'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
