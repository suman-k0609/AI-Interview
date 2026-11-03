import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      default: ''
    },
    avatar: {
      type: String,
      default: ''
    },
    firebaseUid: {
      type: String,
      default: ''
    },
    // New users start with 50 credits (each interview costs 10 credits = 5 free sessions)
    credits: {
      type: Number,
      default: 50,
      min: 0
    },
    totalInterviewsTaken: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

export const User = mongoose.model('User', userSchema);
