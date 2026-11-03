import express from 'express';
import {
  register,
  login,
  googleAuth,
  getCurrentUser
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Public: Standard User Registration (Protected by auth rate limiting)
router.post('/register', authLimiter, register);

// Public: Standard User Sign In (Protected by auth rate limiting)
router.post('/login', authLimiter, login);

// Public: Google OAuth login / registration (Protected by auth rate limiting)
router.post('/google', authLimiter, googleAuth);

// Protected: Get current user info & credit balance
router.get('/me', protect, getCurrentUser);

export default router;
