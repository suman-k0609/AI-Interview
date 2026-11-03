import express from 'express';
import {
  createInterview,
  getInterviewById,
  submitAnswer,
  getUserInterviews
} from '../controllers/interviewController.js';
import { protect } from '../middleware/auth.js';
import { uploadResume } from '../middleware/upload.js';

const router = express.Router();

// All interview routes are protected
router.use(protect);

// 1. Start interview (supports optional resume PDF upload)
router.post('/start', uploadResume.single('resume'), createInterview);

// 2. Get past user interviews
router.get('/history', getUserInterviews);

// 3. Get single interview details
router.get('/:id', getInterviewById);

// 4. Submit an answer to a question
router.post('/:id/answer', submitAnswer);

export default router;
