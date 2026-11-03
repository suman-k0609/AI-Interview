import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import confetti from 'canvas-confetti';
import { Check, Zap, X, ShieldCheck, Sparkles, Loader2, QrCode, Lock } from 'lucide-react';
import RazorpayModal from './RazorpayModal';

export default function PricingModal({ onOpenAdmin }) {
  const navigate = useNavigate();
  const { isPricingOpen, closePricing, user, refreshUser } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [message, setMessage] = useState(null);
  const [activeCheckout, setActiveCheckout] = useState(null);

  useEffect(() => {
    if (isPricingOpen) {
      fetchPlans();
    }
  }, [isPricingOpen]);

  const fetchPlans = async () => {
    try {
      const res = await api.get('/payment/plans');
      if (res.data.success) {
        setPlans(res.data.plans);
      }
    } catch (err) {
      console.error('Failed to load plans:', err);
    }
  };

  const handlePurchase = async (plan) => {
    if (!user) {
      alert('Please log in first to purchase interview credits!');
      return;
    }

    setLoadingPlan(plan.id);
    setMessage(null);

    try {
      const orderRes = await api.post('/payment/order', { planId: plan.id });
      const { order, key, upiId, merchantName } = orderRes.data;

      // Open the Real UPI QR & Razorpay Modal
      setActiveCheckout({
        order: {
          ...order,
          upiId: upiId || '9508420336@ptsbi',
          merchantName: merchantName || 'Suman'
        },
        plan,
        key: key || 'upi_direct'
      });
    } catch (err) {
      console.error('Checkout error:', err);
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Payment initiation failed'
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleCompleteVerification = async ({ razorpay_order_id, razorpay_payment_id, razorpay_signature, plan }) => {
    try {
      setMessage({ type: 'info', text: 'Cryptographically verifying payment with bank...' });

      const verifyRes = await api.post('/payment/verify', {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        planId: plan.id
      });

      if (verifyRes.data.success) {
        setActiveCheckout(null);
        await triggerSuccessEffect(plan.credits);
      } else {
        const errMsg = verifyRes.data.message || 'Payment verification failed';
        alert(errMsg);
        setMessage({ type: 'error', text: errMsg });
      }
    } catch (err) {
      console.error('Verification error:', err);
      const errMsg = err.response?.data?.message || 'Payment verification failed';
      alert(errMsg);
      setMessage({ type: 'error', text: errMsg });
    }
  };

  const triggerSuccessEffect = async (creditsAdded) => {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 }
    });
    await refreshUser();
    closePricing();
    navigate('/setup');
  };

  if (!isPricingOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
        <div className="relative w-full max-w-4xl glass-panel rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-700/80 max-h-[90vh] overflow-y-auto">
          
          {/* Close Button */}
          <button
            onClick={closePricing}
            className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="text-center max-w-xl mx-auto mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
              <QrCode className="w-3.5 h-3.5 text-emerald-400" />
              Real Direct UPI & Razorpay Supported
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Level Up Your Interview Prep
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              Each AI mock interview costs only <span className="text-indigo-400 font-semibold">10 credits</span>. Pay securely via PhonePe, GPay, Paytm, or Cards.
            </p>
          </div>

          {/* Status Message */}
          {message && (
            <div
              className={`mb-6 p-4 rounded-xl text-center text-sm font-semibold border ${
                message.type === 'success'
                  ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300'
                  : message.type === 'info'
                  ? 'bg-blue-950/50 border-blue-500/50 text-blue-300 animate-pulse'
                  : 'bg-red-950/50 border-red-500/50 text-red-300'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {plans.map((plan) => {
              const isPopular = plan.id === 'pro';
              const isLoading = loadingPlan === plan.id;

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between ${
                    isPopular
                      ? 'bg-gradient-to-b from-indigo-900/40 via-slate-900/80 to-slate-950 border-2 border-indigo-500/80 shadow-xl shadow-indigo-500/20 md:-translate-y-2'
                      : 'glass-card border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[11px] font-bold tracking-wide shadow-md uppercase">
                      Most Popular
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-lg text-white">{plan.name}</h3>
                      <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                        <Zap className="w-4 h-4 fill-indigo-400" />
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl sm:text-4xl font-extrabold text-white">
                          ₹{plan.priceINR}
                        </span>
                        <span className="text-xs text-slate-400">/ one-time</span>
                      </div>
                      <div className="text-xs text-emerald-400 font-semibold mt-1">
                        +{plan.credits} Interview Credits
                      </div>
                    </div>

                    <ul className="space-y-2.5 text-xs text-slate-300 mb-6">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>
                          {Math.floor(plan.credits / 10)} Full AI Mock Interviews
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Real-time voice dictation & speech</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Interactive Video Interviewer</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>PDF Resume Analysis & Q&A</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={() => handlePurchase(plan)}
                    disabled={isLoading}
                    className={`w-full py-3 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      isPopular
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/30'
                        : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Preparing Checkout...</span>
                      </>
                    ) : (
                      <>
                        <QrCode className="w-4 h-4" />
                        <span>Pay ₹{plan.priceINR} via UPI / QR</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Guarantee / Footer */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3 text-center sm:text-left">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Real UPI transfers directly to verified merchant account (Suman). 100% Anti-Fraud protected.</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>256-Bit Bank Encryption</span>
            </div>
          </div>
        </div>
      </div>

      {/* Real UPI & Gateway Modal */}
      {activeCheckout && (
        <RazorpayModal
          isOpen={Boolean(activeCheckout)}
          onClose={() => setActiveCheckout(null)}
          order={activeCheckout.order}
          plan={activeCheckout.plan}
          user={user}
          onPaymentSuccess={handleCompleteVerification}
          onOpenAdmin={onOpenAdmin}
        />
      )}
    </>
  );
}
