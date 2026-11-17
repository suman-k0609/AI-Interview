import Razorpay from 'razorpay';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Transaction } from '../models/Transaction.js';
import { MemoryStore } from '../models/memoryStore.js';
import { isUserAdmin } from '../middleware/auth.js';

// Initialize Razorpay client (optional gateway)
const getRazorpayInstance = () => {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret || key_id.includes('placeholder')) {
    return null;
  }
  return new Razorpay({ key_id, key_secret });
};

// Credit Packages available for purchase
export const CREDIT_PLANS = {
  starter: { id: 'starter', name: 'Starter Pack', credits: 50, priceINR: 49 },
  pro: { id: 'pro', name: 'Pro Career Pack', credits: 150, priceINR: 249 },
  unlimited: { id: 'unlimited', name: 'Mastery Pack', credits: 400, priceINR: 499 }
};

/**
 * 1. Get available plans list and merchant UPI info
 */
export const getPlans = (req, res) => {
  res.status(200).json({
    success: true,
    plans: Object.values(CREDIT_PLANS),
    upiConfig: {
      upiId: process.env.UPI_ID || '9508420336@ptsbi',
      merchantName: process.env.UPI_MERCHANT_NAME || 'Suman'
    }
  });
};

/**
 * 2. Create Order (supports Razorpay and UPI QR intent)
 */
export const createOrder = async (req, res) => {
  try {
    const { planId } = req.body;
    const plan = CREDIT_PLANS[planId];

    if (!plan) {
      return res.status(400).json({ success: false, message: 'Invalid credit package selected' });
    }

    const key_id = process.env.RAZORPAY_KEY_ID;
    const userIdStr = (req.user?._id || 'guest_user').toString();
    const upiId = process.env.UPI_ID || '9508420336@ptsbi';
    const merchantName = process.env.UPI_MERCHANT_NAME || 'Suman';

    const razorpay = getRazorpayInstance();
    let rzpOrder = null;

    if (razorpay) {
      try {
        rzpOrder = await razorpay.orders.create({
          amount: plan.priceINR * 100,
          currency: 'INR',
          receipt: `rcpt_${Date.now()}_${userIdStr.slice(-4)}`,
          notes: {
            userId: userIdStr,
            userEmail: req.user?.email || 'unknown',
            planId: plan.id,
            credits: plan.credits
          }
        });
      } catch (err) {
        console.warn('Razorpay order creation skipped (using UPI direct):', err.message);
      }
    }

    const orderId = rzpOrder?.id || `upi_ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    return res.status(200).json({
      success: true,
      order: {
        id: orderId,
        amount: plan.priceINR * 100,
        currency: 'INR',
        upiId,
        merchantName
      },
      plan,
      key: key_id || 'upi_direct',
      upiId,
      merchantName
    });
  } catch (error) {
    console.error('Create Order Error:', error);
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to create payment order'
    });
  }
};

/**
 * 3. Submit Real UPI 12-digit UTR with Anti-Fraud Checks
 * Security: Credits are NOT granted immediately on random/fake UTRs.
 * Transaction is marked PENDING and validated against duplicate/replay attacks.
 */
export const submitUpiUtr = async (req, res) => {
  try {
    const { 
      planId, 
      utrNumber, 
      payerName, 
      payerPhone, 
      payerUpiId, 
      upiApp, 
      payerNote, 
      screenshotUrl 
    } = req.body;
    const plan = CREDIT_PLANS[planId];

    if (!plan) {
      return res.status(400).json({ success: false, message: 'Invalid plan selected' });
    }

    const cleanUtr = (utrNumber || '').toString().trim();

    // 1. Strict 12-digit format check
    if (!/^\d{12}$/.test(cleanUtr)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid UTR! Bank UTR/Reference number must be exactly 12 numeric digits (e.g. 423984029184).'
      });
    }

    // 2. Anti-Replay / Duplicate UTR Fraud Protection
    if (MemoryStore.isMongoConnected()) {
      const existingTx = await Transaction.findOne({ utrNumber: cleanUtr });
      if (existingTx) {
        return res.status(400).json({
          success: false,
          message: `Security Alert: UTR "${cleanUtr}" has already been submitted (${existingTx.status})! Duplicate UTR submissions are prohibited.`
        });
      }
    } else {
      const existingTx = await MemoryStore.findTransactionByUtr(cleanUtr);
      if (existingTx) {
        return res.status(400).json({
          success: false,
          message: `Security Alert: UTR "${cleanUtr}" has already been submitted (${existingTx.status})! Duplicate UTR submissions are prohibited.`
        });
      }
    }

    // Resolve user
    let user = req.user;
    if (MemoryStore.isMongoConnected() && mongoose.isValidObjectId(req.user?._id)) {
      const dbUser = await User.findById(req.user._id);
      if (dbUser) user = dbUser;
    } else if (req.user?._id) {
      const memUser = await MemoryStore.findUserById(req.user._id);
      if (memUser) user = memUser;
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Record Transaction as PENDING verification with rich details
    const txData = {
      userId: user._id,
      userEmail: user.email,
      payerName: (payerName || user.name || 'Candidate').trim(),
      payerPhone: (payerPhone || '').trim(),
      payerUpiId: (payerUpiId || '').trim(),
      upiApp: (upiApp || 'PhonePe').trim(),
      payerNote: (payerNote || '').trim(),
      screenshotUrl: screenshotUrl || '',
      paymentMethod: 'UPI_QR',
      utrNumber: cleanUtr,
      planId: plan.id,
      planName: plan.name,
      amount: plan.priceINR,
      creditsAwarded: plan.credits,
      status: 'PENDING'
    };

    let createdTx;
    if (MemoryStore.isMongoConnected()) {
      createdTx = await Transaction.create(txData);
    } else {
      createdTx = await MemoryStore.createTransaction(txData);
    }

    console.log(`🟡 UTR SUBMITTED: User ${user.email} submitted 12-digit UTR ${cleanUtr} for ₹${plan.priceINR} (${plan.credits} credits). Status: PENDING.`);

    res.status(200).json({
      success: true,
      status: 'PENDING',
      message: `12-digit UTR (${cleanUtr}) submitted successfully! Verification is in progress. Once confirmed, ${plan.credits} credits will be added to your account.`,
      transaction: createdTx
    });
  } catch (error) {
    console.error('Submit UTR Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to submit UTR', error: error.message });
  }
};

/**
 * 4. Cryptographic Verification of Razorpay Payment Signature
 */
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = req.body;
    const plan = CREDIT_PLANS[planId];

    if (!plan) {
      return res.status(400).json({ success: false, message: 'Plan not recognized' });
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Security Violation: Incomplete payment verification payload.'
      });
    }

    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_secret || key_secret.includes('placeholder')) {
      return res.status(500).json({
        success: false,
        message: 'Server security configuration error: Razorpay secret key not configured.'
      });
    }

    const hmac = crypto.createHmac('sha256', key_secret);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const expectedSignature = hmac.digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.warn(`🚨 FRAUD ALERT: Signature mismatch! Order: ${razorpay_order_id}, Payment: ${razorpay_payment_id}`);
      return res.status(400).json({
        success: false,
        message: 'Security Alert: Cryptographic signature verification failed! Transaction rejected.'
      });
    }

    // Resolve user
    let user = req.user;
    if (MemoryStore.isMongoConnected() && mongoose.isValidObjectId(req.user?._id)) {
      const dbUser = await User.findById(req.user._id);
      if (dbUser) user = dbUser;
    } else if (req.user?._id) {
      const memUser = await MemoryStore.findUserById(req.user._id);
      if (memUser) user = memUser;
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.credits = (user.credits || 0) + plan.credits;
    if (typeof user.save === 'function') {
      await user.save();
    }

    if (MemoryStore.isMongoConnected()) {
      await Transaction.create({
        userId: user._id,
        userEmail: user.email,
        paymentMethod: 'RAZORPAY_GATEWAY',
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
        planId: plan.id,
        planName: plan.name,
        amount: plan.priceINR,
        creditsAwarded: plan.credits,
        status: 'APPROVED'
      });
    }

    console.log(`✅ VERIFIED PAYMENT: Added ${plan.credits} credits to ${user.email}. New balance: ${user.credits}`);

    res.status(200).json({
      success: true,
      message: `Payment verified! Successfully credited ${plan.credits} credits.`,
      newCredits: user.credits,
      paymentId: razorpay_payment_id
    });
  } catch (error) {
    console.error('Payment Verification Error:', error.message);
    res.status(500).json({ success: false, message: 'Payment verification failed', error: error.message });
  }
};

/**
 * 5. Get Transactions List
 */
export const getTransactions = async (req, res) => {
  try {
    const isAdmin = isUserAdmin(req);
    const wantsAdminView = req.query.admin === 'true';

    if (wantsAdminView && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Administrator privileges required to view all transactions.'
      });
    }

    const limit = parseInt(req.query.limit) || 500;

    let transactions = [];
    if (MemoryStore.isMongoConnected()) {
      if (isAdmin && wantsAdminView) {
        transactions = await Transaction.find().sort({ createdAt: -1 }).limit(limit);
      } else {
        transactions = await Transaction.find({ userId: req.user._id }).sort({ createdAt: -1 });
      }
    } else {
      if (isAdmin && wantsAdminView) {
        transactions = await MemoryStore.getAllTransactions();
      } else {
        transactions = await MemoryStore.getUserTransactions(req.user?._id);
      }
    }

    res.status(200).json({
      success: true,
      transactions
    });
  } catch (error) {
    console.error('Get Transactions Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
  }
};

/**
 * 6. Admin Approval / Rejection of UTR Payments
 * Only Admin / Merchant can confirm or reject
 */
export const handleAdminAction = async (req, res) => {
  try {
    if (!isUserAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only authorized administrators can approve or reject payments.'
      });
    }

    const { transactionId, action, reason } = req.body;

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action. Must be APPROVE or REJECT' });
    }

    let tx = null;
    if (MemoryStore.isMongoConnected()) {
      tx = await Transaction.findById(transactionId);
    } else {
      tx = await MemoryStore.findTransactionById(transactionId);
    }

    if (!tx) {
      return res.status(404).json({ success: false, message: 'Transaction record not found' });
    }

    if (tx.status === 'APPROVED') {
      return res.status(400).json({ success: false, message: 'Transaction has already been approved and credited!' });
    }

    if (action === 'APPROVE') {
      // Find the user to credit
      let user = null;
      if (MemoryStore.isMongoConnected()) {
        user = await User.findById(tx.userId);
      } else {
        user = await MemoryStore.findUserById(tx.userId);
      }

      if (!user) {
        return res.status(404).json({ success: false, message: 'User account associated with transaction not found' });
      }

      // Add credits
      user.credits = (user.credits || 0) + tx.creditsAwarded;
      if (typeof user.save === 'function') {
        await user.save();
      }

      tx.status = 'APPROVED';
      tx.verifiedAt = new Date();
      tx.verifiedBy = req.user?.email || 'admin@ai-interview.com';
      if (typeof tx.save === 'function') {
        await tx.save();
      }

      console.log(`✅ ADMIN APPROVED: Transaction ${tx._id} approved. Added ${tx.creditsAwarded} credits to ${user.email}. New balance: ${user.credits}`);

      return res.status(200).json({
        success: true,
        message: `Successfully approved! ${tx.creditsAwarded} credits added to ${user.email}.`,
        transaction: tx,
        userCredits: user.credits
      });
    } else {
      // REJECT Fraud / Fake UTR
      tx.status = 'REJECTED';
      tx.rejectionReason = reason || 'Bank transaction could not be matched with 12-digit UTR in bank statement.';
      tx.verifiedAt = new Date();
      tx.verifiedBy = req.user?.email || 'admin@ai-interview.com';
      if (typeof tx.save === 'function') {
        await tx.save();
      }

      console.log(`❌ ADMIN REJECTED: Transaction ${tx._id} rejected as invalid/fake. Reason: ${tx.rejectionReason}`);

      return res.status(200).json({
        success: true,
        message: 'Transaction marked as rejected (Fraud/Invalid UTR).',
        transaction: tx
      });
    }
  } catch (error) {
    console.error('Admin Action Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to process admin action', error: error.message });
  }
};
