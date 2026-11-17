import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { MemoryStore } from '../models/memoryStore.js';

export const isUserAdmin = (req) => {
  const adminSecret = process.env.ADMIN_SECRET || 'admin2026';
  const secretHeader = req.headers['x-admin-secret'];
  const secretBody = req.body?.adminSecret;
  if (secretHeader && secretHeader === adminSecret) return true;
  if (secretBody && secretBody === adminSecret) return true;
  if (req.user?.isAdmin === true || req.user?.role === 'admin') return true;
  if (process.env.ADMIN_EMAIL && req.user?.email && req.user.email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase()) return true;
  return false;
};

export const requireAdmin = (req, res, next) => {
  if (isUserAdmin(req)) {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Access denied: Administrator privileges required.'
  });
};

export const protect = async (req, res, next) => {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token || token === 'null' || token === 'undefined') {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please sign up or log in first to access this feature.'
      });
    }

    try {
      const secret = process.env.JWT_SECRET || 'ai_interview_production_jwt_secret_key_2026';
      const decoded = jwt.verify(token, secret);

      let user = null;
      if (MemoryStore.isMongoConnected()) {
        user = await User.findById(decoded.id);
      } else {
        user = await MemoryStore.findUserById(decoded.id);
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User session not found. Please sign up or log in again.'
        });
      }

      req.user = user;
      next();
    } catch (jwtErr) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session. Please log in again.'
      });
    }
  } catch (error) {
    console.error('Auth protect error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Authentication processing error'
    });
  }
};
