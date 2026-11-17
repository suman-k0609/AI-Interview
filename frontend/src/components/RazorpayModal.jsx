import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import api from '../services/api';
import { 
  ShieldCheck, 
  CreditCard, 
  QrCode, 
  Building2, 
  Wallet, 
  Lock, 
  X, 
  CheckCircle2, 
  Loader2, 
  Smartphone,
  Info,
  Copy,
  Check,
  Clock,
  Sparkles,
  Upload,
  User,
  Phone,
  Image as ImageIcon
} from 'lucide-react';

export default function RazorpayModal({ 
  isOpen, 
  onClose, 
  order, 
  plan, 
  user, 
  onPaymentSuccess,
  onOpenAdmin
}) {
  const [activeMethod, setActiveMethod] = useState('upi'); // 'upi', 'card', 'netbanking'
  
  // UPI configuration from order / env
  const merchantUpiId = order?.upiId || '9508420336@ptsbi';
  const merchantName = order?.merchantName || 'Suman';
  const amountINR = plan?.priceINR || 49;

  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [isGeneratingQr, setIsGeneratingQr] = useState(true);
  const [utrNumber, setUtrNumber] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [utrError, setUtrError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [submittedStatus, setSubmittedStatus] = useState(null); // When UTR submitted

  // Cards state
  const [cardNumber, setCardNumber] = useState('4532 8920 1142 8890');
  const [cardExpiry, setCardExpiry] = useState('08/29');
  const [cardCvv, setCardCvv] = useState('842');

  // Construct standard valid Indian UPI URI that all mobile UPI apps decode
  const upiIntentUri = `upi://pay?pa=${encodeURIComponent(merchantUpiId)}&pn=${encodeURIComponent(merchantName)}&am=${amountINR}.00&cu=INR&tn=${encodeURIComponent(`AceMock ${plan?.name || 'Credits'}`)}`;

  // Generate real mathematically valid 2D QR Code image
  useEffect(() => {
    if (isOpen && plan) {
      setIsGeneratingQr(true);
      setSubmittedStatus(null);
      setUtrError('');
      setUtrNumber('');

      QRCode.toDataURL(upiIntentUri, {
        width: 320,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      })
        .then((url) => {
          setQrCodeDataUrl(url);
          setIsGeneratingQr(false);
        })
        .catch((err) => {
          console.error('Failed to generate QR code:', err);
          setIsGeneratingQr(false);
        });
    }
  }, [isOpen, plan, merchantUpiId, amountINR]);

  if (!isOpen || !order || !plan) return null;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(merchantUpiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const isLiveRazorpay = Boolean(order?.key && !order.key.includes('placeholder') && !order.key.includes('upi_direct'));

  // 1. Submit Real 12-digit UTR with strict anti-fraud protection
  const handleUtrSubmit = async () => {
    setUtrError('');
    const cleanUtr = utrNumber.trim();

    if (!cleanUtr) {
      setUtrError('Kripya PhonePe / Google Pay se 12-digit UTR number enter karein!');
      return;
    }
    if (!/^\d{12}$/.test(cleanUtr)) {
      setUtrError('Invalid UTR! Bank UTR theek 12 numeric digits ka hona chahiye (jaise: 429184029182).');
      return;
    }

    setIsProcessing(true);
    setProcessingStep('Registering 12-digit UTR & checking anti-fraud rules...');

    try {
      const res = await api.post('/payment/submit-utr', {
        planId: plan.id,
        utrNumber: cleanUtr
      });

      if (res.data.success) {
        setSubmittedStatus({
          utr: cleanUtr,
          plan,
          message: res.data.message,
          transaction: res.data.transaction
        });
      } else {
        setUtrError(res.data.message || 'UTR submission failed');
      }
    } catch (err) {
      console.error('UTR submission error:', err);
      const errMsg = err.response?.data?.message || 'Failed to submit UTR. Please try again.';
      setUtrError(errMsg);
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  // 2. Razorpay Gateway Checkout
  const handleRazorpayGateway = () => {
    if (window.Razorpay) {
      try {
        const rzp = new window.Razorpay({
          key: order.key,
          amount: order.amount,
          currency: 'INR',
          name: 'AceMock AI',
          description: `${plan.name} (${plan.credits} Credits)`,
          order_id: order.id,
          handler: function (response) {
            onPaymentSuccess({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan
            });
          },
          prefill: {
            name: user?.name || '',
            email: user?.email || ''
          },
          theme: {
            color: '#4f46e5'
          }
        });
        rzp.open();
      } catch (err) {
        console.error('Razorpay SDK error:', err);
        alert('Failed to launch Razorpay gateway: ' + err.message);
      }
    } else {
      alert('Razorpay Checkout SDK is still loading. Please scan the Real UPI QR code instead.');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-800 dark:text-slate-100 transition-colors max-h-[92vh] flex flex-col">
        
        {/* Top Header */}
        <div className="bg-[#0c2340] dark:bg-[#071629] text-white px-6 py-4 flex items-center justify-between border-b border-blue-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <span className="font-black text-lg text-white tracking-tighter">₹</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-wide text-white">Real UPI & Payment Gateway</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Direct Bank UPI
                </span>
              </div>
              <p className="text-xs text-blue-200/80">{merchantName} (SBI) • Verified Payee</p>
            </div>
          </div>

          <div className="text-right flex items-center gap-3">
            <div>
              <div className="text-xs text-blue-300 font-medium">Payable Amount</div>
              <div className="text-xl font-extrabold text-white">₹{amountINR}.00</div>
            </div>
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="text-blue-300 hover:text-white p-1 rounded-lg hover:bg-blue-900/40 transition-colors ml-2 cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Processing Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 z-30 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
            <div className="relative mb-5">
              <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
              <ShieldCheck className="w-8 h-8 text-indigo-400 absolute inset-0 m-auto" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Verifying Anti-Fraud Protection</h4>
            <p className="text-sm text-indigo-200/90 font-mono animate-pulse">{processingStep}</p>
            <div className="mt-6 flex items-center gap-2 text-xs text-slate-400">
              <Lock className="w-3.5 h-3.5" /> 256-bit Security Check
            </div>
          </div>
        )}

        {/* Success / Pending State View */}
        {submittedStatus ? (
          <div className="p-6 sm:p-8 space-y-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <Clock className="w-8 h-8 animate-pulse" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/30">
                🟡 Status: Pending Bank Verification
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                12-Digit UTR Submitted Successfully!
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                Aapka UTR <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">{submittedStatus.utr}</span> register ho gaya hai. Free fake credits rokne ke liye Suman ke bank record se match hone par aapke account me <strong>+{plan.credits} Credits</strong> add ho jayenge.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 max-w-md mx-auto text-xs text-left space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Selected Plan:</span>
                <strong className="text-slate-800 dark:text-slate-200">{plan.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Paid:</span>
                <strong className="text-emerald-600 dark:text-emerald-400 font-bold">₹{amountINR}.00</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Credits Awarded Upon Verification:</span>
                <strong className="text-indigo-600 dark:text-indigo-400 font-bold">+{plan.credits} Credits</strong>
              </div>
            </div>

            <div className="flex items-center justify-center pt-2">
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-8 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
              >
                Close & Return to Dashboard
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Order Brief Strip */}
            <div className="bg-slate-50 dark:bg-slate-800/60 px-6 py-2.5 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 shrink-0">
              <span>Package: <strong className="text-slate-800 dark:text-slate-200">{plan.name}</strong> ({plan.credits} Credits)</span>
              <span>Amount: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">₹{amountINR}.00</strong></span>
            </div>

            {/* Main Tabs Container */}
            <div className="grid grid-cols-1 md:grid-cols-12 overflow-y-auto flex-1">
              {/* Method Selector Tabs */}
              <div className="md:col-span-4 bg-slate-50/70 dark:bg-slate-950/40 border-r border-slate-200 dark:border-slate-800 p-2 space-y-1">
                <button
                  onClick={() => setActiveMethod('upi')}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left text-sm font-semibold transition-all cursor-pointer ${
                    activeMethod === 'upi'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <QrCode className="w-4 h-4 shrink-0" />
                  <span>Real SBI UPI QR</span>
                </button>

                <button
                  onClick={() => setActiveMethod('card')}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left text-sm font-semibold transition-all cursor-pointer ${
                    activeMethod === 'card'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <CreditCard className="w-4 h-4 shrink-0" />
                  <span>Razorpay Gateway</span>
                </button>

                <div className="pt-4 px-2 text-[11px] text-slate-400 dark:text-slate-500 hidden md:block">
                  <div className="flex items-center gap-1.5 mb-1 font-medium">
                    <Lock className="w-3 h-3 text-emerald-500" />
                    NPCI Standard
                  </div>
                  Pay direct via GPay, PhonePe, Paytm, BHIM to Suman
                </div>
              </div>

              {/* Method Content Panel */}
              <div className="md:col-span-8 p-5 sm:p-6 flex flex-col justify-between">
                {/* 1. Real Scannable UPI QR Mode */}
                {activeMethod === 'upi' && (
                  <div className="space-y-4 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-blue-500" />
                        Scan with PhonePe / GPay / Paytm
                      </span>
                      <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        ⚡ Real Direct UPI
                      </div>
                    </div>

                    {/* Real QR Code Display */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
                      <div className="relative p-2 bg-white rounded-xl shadow-md border border-slate-300 shrink-0">
                        {isGeneratingQr || !qrCodeDataUrl ? (
                          <div className="w-36 h-36 flex flex-col items-center justify-center text-xs text-slate-400">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-500 mb-2" />
                            Generating QR...
                          </div>
                        ) : (
                          <div className="relative">
                            <img 
                              src={qrCodeDataUrl} 
                              alt="Real UPI Payment QR Code" 
                              className="w-36 h-36 object-contain rounded-lg"
                            />
                            <div className="absolute inset-0 m-auto w-8 h-8 rounded-full bg-white shadow-md border border-slate-200 flex items-center justify-center pointer-events-none">
                              <span className="text-[10px] font-black text-blue-600">UPI</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="text-center sm:text-left text-xs space-y-2 flex-1">
                        <div className="font-bold text-slate-900 dark:text-white text-sm">
                          Amount: <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">₹{amountINR}.00</span>
                        </div>

                        <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                          Scan with <strong>Google Pay</strong>, <strong>PhonePe</strong>, or <strong>Paytm</strong>. Payment direct <strong>{merchantName}</strong> ke account me transfer hoga.
                        </p>

                        <div className="pt-1">
                          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
                            <span>Official Payee: <strong className="text-slate-800 dark:text-slate-200">{merchantName}</strong></span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" /> SBI Verified
                            </span>
                          </div>

                          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-slate-100 shadow-inner">
                            <span className="truncate select-all font-semibold">{merchantUpiId}</span>
                            <button
                              onClick={handleCopyUpi}
                              className="text-slate-400 hover:text-blue-500 p-1 ml-2 transition-colors cursor-pointer shrink-0"
                              title="Copy UPI ID"
                            >
                              {copiedUpi ? (
                                <span className="flex items-center gap-1 text-[11px] text-emerald-500 font-sans font-bold">
                                  <Check className="w-3.5 h-3.5" /> Copied
                                </span>
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Step 2: 12-Digit UTR Input with Anti-Fraud */}
                    <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/30 space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-100">
                        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                          <ShieldCheck className="w-4 h-4 text-emerald-500" />
                          Enter 12-Digit Bank UTR / Reference ID
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                          utrNumber.trim().length === 12
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}>
                          {utrNumber.trim().length}/12 Digits
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                        Payment hone ke baad PhonePe / GPay par <strong>Payment Details</strong> me diya 12-digit UTR enter karein. Anti-fraud system duplicate ya fake UTR ko block karta hai:
                      </p>

                      {utrError && (
                        <div className="p-2.5 rounded-lg bg-red-950/70 border border-red-500/50 text-red-200 text-xs flex items-center gap-2">
                          <span className="text-red-400 font-bold">⚠️</span>
                          <span>{utrError}</span>
                        </div>
                      )}

                      <div className="space-y-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={utrNumber}
                          onChange={(e) => {
                            const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 12);
                            setUtrNumber(digitsOnly);
                            if (utrError) setUtrError('');
                          }}
                          placeholder="Enter 12-digit UTR (e.g. 429184029182)"
                          maxLength={12}
                          className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400 shadow-inner tracking-wider"
                        />

                        <button
                          onClick={handleUtrSubmit}
                          disabled={isProcessing || utrNumber.trim().length !== 12}
                          className={`w-full py-2.5 px-4 text-xs font-extrabold rounded-xl text-white shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                            utrNumber.trim().length === 12
                              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/30 hover:scale-[1.01] active:scale-[0.99]'
                              : 'bg-slate-700/60 opacity-60 cursor-not-allowed text-slate-400'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Submit 12-Digit UTR for Verification</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Razorpay Mode */}
                {activeMethod === 'card' && (
                  <div className="space-y-4 animate-in fade-in py-4 text-center">
                    <div className="w-12 h-12 mx-auto rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-slate-900 dark:text-white">Razorpay Payment Gateway</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Pay via Cards, Netbanking, or Test Sandbox.
                      </p>
                    </div>

                    <button
                      onClick={handleRazorpayGateway}
                      className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer inline-flex items-center gap-2"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Launch Razorpay Gateway Modal</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
