import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true
  },
  category: {
    type: String,
    default: 'General'
  },
  expectedAnswer: {
    type: String,
    default: ''
  },
  idealAnswer: {
    type: String,
    default: ''
  },
  userAnswer: {
    type: String,
    default: ''
  },
  feedback: {
    type: String,
    default: ''
  },
  score: {
    type: Number,
    default: null,
    min: 0,
    max: 10
  }
});

const interviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    role: {
      type: String,
      required: true,
      trim: true
    },
    experience: {
      type: String,
      default: 'Fresher'
    },
    roundType: {
      type: String,
      enum: ['Technical', 'HR / Behavioral', 'System Design'],
      default: 'Technical'
    },
    status: {
      type: String,
      enum: ['in-progress', 'completed'],
      default: 'in-progress'
    },
    resumeSkills: {
      type: [String],
      default: []
    },
    interviewerPersona: {
      type: String,
      default: 'sarah'
    },
    questions: [questionSchema],
    currentQuestionIndex: {
      type: Number,
      default: 0
    },
    overallScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    strengths: {
      type: [String],
      default: []
    },
    areasForImprovement: {
      type: [String],
      default: []
    },
    summary: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

export const Interview = mongoose.model('Interview', interviewSchema);
