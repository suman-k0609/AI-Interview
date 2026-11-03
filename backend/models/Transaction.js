import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    userEmail: {
      type: String,
      required: true
    },
    payerName: {
      type: String,
      default: ''
    },
    payerPhone: {
      type: String,
      default: ''
    },
    payerUpiId: {
      type: String,
      default: ''
    },
    upiApp: {
      type: String,
      default: 'UPI'
    },
    payerNote: {
      type: String,
      default: ''
    },
    screenshotUrl: {
      type: String,
      default: ''
    },
    paymentMethod: {
      type: String,
      enum: ['UPI_QR', 'RAZORPAY_GATEWAY'],
      default: 'UPI_QR'
    },
    utrNumber: {
      type: String,
      trim: true,
      index: true
    },
    orderId: {
      type: String,
      sparse: true
    },
    paymentId: {
      type: String,
      sparse: true
    },
    signature: {
      type: String
    },
    planId: {
      type: String,
      required: true
    },
    planName: {
      type: String,
      default: 'Credits Plan'
    },
    amount: {
      type: Number,
      required: true
    },
    creditsAwarded: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'SUCCESS', 'FAILED'],
      default: 'PENDING'
    },
    rejectionReason: {
      type: String,
      default: ''
    },
    verifiedBy: {
      type: String,
      default: ''
    },
    verifiedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

export const Transaction = mongoose.model('Transaction', transactionSchema);
