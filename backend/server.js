import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import interviewRoutes from './routes/interviewRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import { apiLimiter } from './middleware/rateLimiter.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust reverse proxies (Render, Heroku, Nginx, Cloudflare) for accurate IP resolution
app.set('trust proxy', 1);

// Enable CORS for frontend clients
app.use(
  cors({
    origin: '*',
    credentials: true
  })
);

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
connectDB();

// System Health Check (exempt from rate limit for monitoring)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    service: 'AI Interview Agent Backend',
    timestamp: new Date().toISOString()
  });
});

// Apply global API rate limiter to all /api routes
app.use('/api', apiLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/payment', paymentRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`🚀 AI Interview Server is running on http://localhost:${PORT}`);
  console.log(`📡 Health Check available at http://localhost:${PORT}/api/health`);
});
