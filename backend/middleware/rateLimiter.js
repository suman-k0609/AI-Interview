import { rateLimit } from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Authentication Rate Limiter
 * Strictly limits attempts to authenticate (login, oauth callbacks, registration)
 * Mitigates brute-force attacks, credential stuffing, and bot floods.
 */
export const authLimiter = rateLimit({
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes default
  limit: Number(process.env.AUTH_RATE_LIMIT_MAX) || (process.env.NODE_ENV === 'development' ? 50 : 20), // 20 per window in production, 50 in development
  standardHeaders: true, // Returns RFC-standard RateLimit headers (RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset)
  legacyHeaders: false, // Disables legacy X-RateLimit-* headers
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP address. Please try again after 15 minutes.'
  },
  handler: (req, res, _next, options) => {
    res.status(options.statusCode).json(options.message);
  }
});

/**
 * General API Rate Limiter
 * Protects server resources from volumetric DDoS, abuse, and scraping.
 */
export const apiLimiter = rateLimit({
  windowMs: Number(process.env.API_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  limit: Number(process.env.API_RATE_LIMIT_MAX) || 300, // 300 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    message: 'Too many requests from this IP address. Please try again later.'
  },
  handler: (req, res, _next, options) => {
    res.status(options.statusCode).json(options.message);
  }
});

export default {
  authLimiter,
  apiLimiter
};
