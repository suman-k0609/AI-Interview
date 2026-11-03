import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  ShieldCheck, 
  X, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  RefreshCw, 
  Copy, 
  Check, 
  User, 
  CreditCard,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function AdminVerificationModal({ isOpen, onClose }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage] = useState(null);
  const [copiedUtr, setCopiedUtr] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchTransactions();
    }
  }, [isOpen]);

  const fetchTransactions = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await api.get('/payment/transactions?admin=true');
      if (res.data.success) {
        setTransactions(res.data.transactions || []);
      }
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
      setMessage({ type: 'error', text: 'Failed to load transaction queue' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (utr) => {
    navigator.clipboard.writeText(utr);
    setCopiedUtr(utr);
    setTimeout(() => setCopiedUtr(null), 2000);
  };

  const handleAction = async (transactionId, action) => {
    setActionLoading(transactionId + action);
    setMessage(null);
    try {
      const res = await api.post('/payment/admin/action', {
        transactionId,
        action,
        reason: action === 'REJECT' ? 'UTR could not be matched with bank record' : ''
      });

      if (res.data.success) {
        setMessage({
          type: 'success',
          text: res.data.message
        });

        if (action === 'APPROVE') {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
        }

        // Refresh list
        await fetchTransactions();
      } else {
        setMessage({ type: 'error', text: res.data.message || 'Action failed' });
      }
    } catch (err) {
      console.error('Admin action error:', err);
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to process transaction'
      });
    } finally {
      setActionLoading(null);
    }
  };

  if (!isOpen) return null;

  const pendingCount = transactions.filter((t) => t.status === 'PENDING').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-100">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white px-6 py-4 flex items-center justify-between border-b border-indigo-800/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shadow-lg">
              <ShieldCheck className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Merchant Admin Verification Portal</h3>
                {pendingCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-slate-950 animate-pulse">
                    {pendingCount} Pending
                  </span>
                )}
              </div>
              <p className="text-xs text-indigo-200/80">Suman (9508420336@ptsbi) • Verify Real UPI Payments & Prevent Fraud</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchTransactions}
              disabled={loading}
              className="p-1.5 rounded-lg bg-indigo-800/40 hover:bg-indigo-700/50 text-indigo-200 hover:text-white transition-colors cursor-pointer"
              title="Refresh Queue"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800/40 hover:bg-slate-700/50 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Message */}
        {message && (
          <div
            className={`px-6 py-2.5 text-xs font-semibold flex items-center justify-between border-b ${
              message.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}
          >
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="opacity-70 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Description Banner */}
        <div className="bg-slate-50 dark:bg-slate-950/60 px-6 py-3 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              Candidate ne jo 12-digit UTR enter kiya hai, use apne <strong>PhonePe / SBI statement</strong> se match karein aur <strong>"Approve"</strong> par click karein.
            </span>
          </div>
        </div>

        {/* Queue List Table */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-3">
          {loading && transactions.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
              Loading submitted payments queue...
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-xl">
              <ShieldCheck className="w-10 h-10 mx-auto mb-2 text-slate-500 opacity-60" />
              <p className="font-semibold">No payment submissions yet</p>
              <p className="text-xs text-slate-500 mt-1">When a user submits a 12-digit UTR via UPI QR, it will appear here for your verification.</p>
            </div>
          ) : (
            transactions.map((tx) => {
              const isPending = tx.status === 'PENDING';
              const isApproved = tx.status === 'APPROVED' || tx.status === 'SUCCESS';
              const isRejected = tx.status === 'REJECTED' || tx.status === 'FAILED';

              return (
                <div
                  key={tx._id}
                  className={`p-4 rounded-xl border transition-all ${
                    isPending
                      ? 'bg-amber-500/5 dark:bg-amber-950/15 border-amber-500/40 shadow-sm'
                      : isApproved
                      ? 'bg-emerald-500/5 dark:bg-emerald-950/15 border-emerald-500/30 opacity-90'
                      : 'bg-red-500/5 dark:bg-red-950/15 border-red-500/30 opacity-75'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* User & Plan Info */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          isPending
                            ? 'bg-amber-500 text-slate-950'
                            : isApproved
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                          {tx.status}
                        </span>

                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          ₹{tx.amount} — {tx.planName || 'Credits Pack'} (+{tx.creditsAwarded} Credits)
                        </span>

                        <span className="text-[11px] text-slate-400">
                          {tx.createdAt ? new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <User className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="font-medium text-slate-700 dark:text-slate-300">{tx.userEmail}</span>
                        <span>•</span>
                        <span>Method: {tx.paymentMethod || 'UPI_QR'}</span>
                      </div>

                      {/* UTR Pill */}
                      {tx.utrNumber && (
                        <div className="pt-1 flex items-center gap-2">
                          <span className="text-[11px] text-slate-500 font-semibold">12-Digit Bank UTR:</span>
                          <span className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 select-all border border-slate-300 dark:border-slate-700">
                            {tx.utrNumber}
                          </span>
                          <button
                            onClick={() => handleCopy(tx.utrNumber)}
                            className="p-1 text-slate-400 hover:text-indigo-400 cursor-pointer"
                            title="Copy UTR to clipboard"
                          >
                            {copiedUtr === tx.utrNumber ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {isPending ? (
                        <>
                          <button
                            onClick={() => handleAction(tx._id, 'APPROVE')}
                            disabled={Boolean(actionLoading)}
                            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Approve (+{tx.creditsAwarded} Credits)</span>
                          </button>

                          <button
                            onClick={() => handleAction(tx._id, 'REJECT')}
                            disabled={Boolean(actionLoading)}
                            className="px-3 py-2 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Reject Fraud</span>
                          </button>
                        </>
                      ) : isApproved ? (
                        <div className="text-right text-xs text-emerald-500 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Approved & Credited</span>
                        </div>
                      ) : (
                        <div className="text-right text-xs text-red-400 font-semibold flex items-center gap-1">
                          <XCircle className="w-4 h-4" />
                          <span>Rejected (Fake UTR)</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span>Official AceMock Anti-Fraud Gateway Control</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
