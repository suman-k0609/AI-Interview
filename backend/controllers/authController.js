import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { MemoryStore } from '../models/memoryStore.js';

const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET || 'ai_interview_production_jwt_secret_key_2026';
  return jwt.sign({ id: userId }, secret, { expiresIn: '30d' });
};

/**
 * Register a new user with Name, Email, Password, and Avatar
 */
export const register = async (req, res) => {
  try {
    const { name, email, password, avatar } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide your full name' });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
    }

    const cleanEmail = email.trim().toLowerCase();

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    let existingUser = null;
    if (MemoryStore.isMongoConnected()) {
      existingUser = await User.findOne({ email: cleanEmail });
    } else {
      existingUser = await MemoryStore.findUserByEmail(cleanEmail);
    }

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists. Please sign in instead.'
      });
    }

    // Hash the password securely
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userAvatar = avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanEmail)}`;

    let user = null;
    if (MemoryStore.isMongoConnected()) {
      user = await User.create({
        name: name.trim(),
        email: cleanEmail,
        password: hashedPassword,
        avatar: userAvatar,
        credits: 50
      });
    } else {
      user = await MemoryStore.createUser({
        name: name.trim(),
        email: cleanEmail,
        password: hashedPassword,
        avatar: userAvatar,
        credits: 50
      });
    }

    const token = generateToken(user._id);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully! Welcome to AceMock AI.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        credits: user.credits,
        totalInterviewsTaken: user.totalInterviewsTaken || 0
      }
    });
  } catch (error) {
    console.error('Registration Error:', error.message);
    res.status(500).json({ success: false, message: 'Registration failed. Please try again later.' });
  }
};

/**
 * Sign In an existing user with Email and Password
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both email and password' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Look up user
    let user = null;
    if (MemoryStore.isMongoConnected()) {
      user = await User.findOne({ email: cleanEmail });
    } else {
      user = await MemoryStore.findUserByEmail(cleanEmail);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'No account found with this email. Please sign up first!'
      });
    }

    // Check if account exists but has no password (e.g. created via Google)
    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: 'This account was created via Google Sign-In. Please sign in with Google.'
      });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password. Please verify your password and try again.'
      });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: 'Signed in successfully!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        credits: user.credits,
        totalInterviewsTaken: user.totalInterviewsTaken || 0
      }
    });
  } catch (error) {
    console.error('Login Error:', error.message);
    res.status(500).json({ success: false, message: 'Authentication failed. Please try again.' });
  }
};

export const googleAuth = async (req, res) => {
  try {
    const { name, email, avatar, firebaseUid } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    let user = null;

    if (MemoryStore.isMongoConnected()) {
      user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        user = await User.create({
          name: name || email.split('@')[0],
          email: email.toLowerCase(),
          avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${email}`,
          firebaseUid: firebaseUid || '',
          credits: 50
        });
      } else if (avatar && user.avatar !== avatar) {
        user.avatar = avatar;
        await user.save();
      }
    } else {
      user = await MemoryStore.findUserByEmail(email);
      if (!user) {
        user = await MemoryStore.createUser({
          name: name || email.split('@')[0],
          email,
          avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${email}`,
          credits: 50
        });
      }
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        credits: user.credits,
        totalInterviewsTaken: user.totalInterviewsTaken
      }
    });
  } catch (error) {
    console.error('Google Auth Error:', error.message);
    res.status(500).json({ success: false, message: 'Authentication failed', error: error.message });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        credits: user.credits,
        totalInterviewsTaken: user.totalInterviewsTaken
      }
    });
  } catch (error) {
    console.error('Get Current User Error:', error.message);
    res.status(500).json({ success: false, message: 'Error retrieving user profile' });
  }
};
