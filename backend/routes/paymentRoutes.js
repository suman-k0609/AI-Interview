import express from 'express';
import { 
  getPlans, 
  createOrder, 
  submitUpiUtr, 
  verifyPayment, 
  getTransactions, 
  handleAdminAction 
} from '../controllers/paymentController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get list of pricing plans & UPI config (public)
router.get('/plans', getPlans);

// Protected candidate endpoints
router.post('/order', protect, createOrder);
router.post('/submit-utr', protect, submitUpiUtr);
router.post('/verify', protect, verifyPayment);
router.get('/transactions', protect, getTransactions);

// Admin verification & approval endpoint
router.post('/admin/action', protect, handleAdminAction);

export default router;
