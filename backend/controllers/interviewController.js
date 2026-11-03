import mongoose from 'mongoose';
import { Interview } from '../models/Interview.js';
import { User } from '../models/User.js';
import { MemoryStore } from '../models/memoryStore.js';
import {
  parseResumePDF,
  generateQuestions,
  evaluateAnswer,
  generateFinalReport
} from '../services/aiService.js';

const CREDITS_PER_INTERVIEW = 10;

export const createInterview = async (req, res) => {
  try {
    const { role, experience, roundType, interviewerPersona } = req.body;
    let user = req.user;

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if ((user.credits ?? 50) < CREDITS_PER_INTERVIEW) {
      return res.status(403).json({
        success: false,
        message: `Insufficient credits. You need at least ${CREDITS_PER_INTERVIEW} credits to start an interview.`,
        currentCredits: user.credits
      });
    }

    let resumeText = '';
    if (req.file) {
      console.log(`📄 Parsing resume: ${req.file.originalname} (${req.file.size} bytes)`);
      resumeText = await parseResumePDF(req.file.buffer);
    }

    console.log(`🤖 Generating questions for Role: ${role}, Round: ${roundType}...`);
    const aiResult = await generateQuestions({
      role: role || 'Full Stack Developer',
      experience: experience || 'Fresher',
      roundType: roundType || 'Technical',
      resumeText
    });

    let interview = null;
    const interviewData = {
      userId: user._id,
      role: role || 'Full Stack Developer',
      experience: experience || 'Fresher',
      roundType: roundType || 'Technical',
      interviewerPersona: interviewerPersona || 'sarah',
      status: 'in-progress',
      currentQuestionIndex: 0,
      resumeSkills: aiResult.skills || [],
      questions: aiResult.questions || []
    };

    if (MemoryStore.isMongoConnected()) {
      interview = await Interview.create(interviewData);
    } else {
      interview = await MemoryStore.createInterview(interviewData);
    }

    user.credits -= CREDITS_PER_INTERVIEW;
    user.totalInterviewsTaken = (user.totalInterviewsTaken || 0) + 1;
    await user.save();

    res.status(201).json({
      success: true,
      interview,
      remainingCredits: user.credits
    });
  } catch (error) {
    console.error('Create Interview Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to start interview', error: error.message });
  }
};

export const getInterviewById = async (req, res) => {
  try {
    const { id } = req.params;
    let interview = null;

    if (MemoryStore.isMongoConnected() && mongoose.isValidObjectId(id)) {
      interview = await Interview.findById(id);
    }
    if (!interview) {
      interview = await MemoryStore.findInterviewById(id);
    }

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview session not found' });
    }

    res.status(200).json({ success: true, interview });
  } catch (error) {
    console.error('Get Interview Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to retrieve interview' });
  }
};

export const submitAnswer = async (req, res) => {
  try {
    const { id } = req.params;
    const { questionIndex, answer } = req.body;

    let interview = null;
    if (MemoryStore.isMongoConnected() && mongoose.isValidObjectId(id)) {
      interview = await Interview.findById(id);
    }
    if (!interview) {
      interview = await MemoryStore.findInterviewById(id);
    }

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    const currentQ = interview.questions[questionIndex];
    if (!currentQ) {
      return res.status(400).json({ success: false, message: 'Invalid question index' });
    }

    console.log(`🔍 Evaluating answer for Q${questionIndex + 1} with AI...`);
    const evaluation = await evaluateAnswer({
      question: currentQ.question,
      expectedAnswer: currentQ.expectedAnswer,
      idealAnswer: currentQ.idealAnswer,
      userAnswer: answer,
      role: interview.role
    });

    currentQ.userAnswer = answer;
    currentQ.feedback = evaluation.feedback;
    currentQ.score = evaluation.score;
    currentQ.idealAnswer = evaluation.idealAnswer || currentQ.idealAnswer || currentQ.expectedAnswer || '';
    interview.currentQuestionIndex = questionIndex + 1;

    // Calculate running score so far based on actual question evaluations
    const answeredQs = interview.questions.filter((q) => typeof q.score === 'number' && q.score !== null);
    if (answeredQs.length > 0) {
      const sumScores = answeredQs.reduce((acc, q) => acc + q.score, 0);
      interview.overallScore = Math.round((sumScores / answeredQs.length) * 10);
    }

    const allAnswered = interview.questions.every((q) => q.userAnswer && q.userAnswer.trim() !== '');

    if (allAnswered) {
      console.log(`📊 All questions answered. Generating comprehensive final report with AI...`);
      const report = await generateFinalReport({
        role: interview.role,
        roundType: interview.roundType,
        questionsWithAnswers: interview.questions
      });

      interview.status = 'completed';
      interview.overallScore = typeof report.overallScore === 'number' ? report.overallScore : interview.overallScore;
      interview.strengths = report.strengths || [];
      interview.areasForImprovement = report.areasForImprovement || [];
      interview.summary = report.summary || '';
    }

    await interview.save();

    res.status(200).json({
      success: true,
      interview,
      currentQuestion: currentQ,
      isCompleted: interview.status === 'completed'
    });
  } catch (error) {
    console.error('Submit Answer Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to evaluate answer', error: error.message });
  }
};

export const getUserInterviews = async (req, res) => {
  try {
    let interviews = [];
    if (MemoryStore.isMongoConnected()) {
      interviews = await Interview.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .select('role roundType experience status overallScore createdAt questions');
    } else {
      interviews = await MemoryStore.getInterviewsByUserId(req.user._id);
    }

    res.status(200).json({ success: true, interviews });
  } catch (error) {
    console.error('Get User Interviews Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to retrieve interview history' });
  }
};
