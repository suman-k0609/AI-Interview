import mongoose from 'mongoose';

// In-memory collections to ensure zero-downtime development when MongoDB Atlas is connecting or offline
const memoryUsers = new Map();
const memoryInterviews = new Map();
const memoryTransactions = new Map();

// Initialize default demo user
const defaultDemoUser = {
  _id: 'demo_user_id_1001',
  name: 'Demo Candidate',
  email: 'demo@ai-interview.com',
  avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Demo',
  credits: 100,
  totalInterviewsTaken: 0,
  createdAt: new Date(),
  save: async function () {
    memoryUsers.set(this._id, this);
    memoryUsers.set(this.email.toLowerCase(), this);
    return this;
  }
};
memoryUsers.set('demo@ai-interview.com', defaultDemoUser);
memoryUsers.set('demo_user_id_1001', defaultDemoUser);

export const MemoryStore = {
  isMongoConnected() {
    return mongoose.connection.readyState === 1;
  },

  async findUserByEmail(email) {
    return memoryUsers.get(email.toLowerCase()) || null;
  },

  async findUserById(id) {
    return memoryUsers.get(id.toString()) || null;
  },

  async createUser({ name, email, password = '', avatar, credits = 50, role = 'user', isAdmin = false }) {
    const user = {
      _id: 'user_' + Date.now(),
      name,
      email: email.toLowerCase(),
      password,
      avatar,
      credits,
      role,
      isAdmin,
      totalInterviewsTaken: 0,
      createdAt: new Date(),
      save: async function () {
        memoryUsers.set(this._id, this);
        memoryUsers.set(this.email, this);
        return this;
      }
    };
    memoryUsers.set(user._id, user);
    memoryUsers.set(user.email, user);
    return user;
  },

  async createInterview(interviewData) {
    const interview = {
      _id: 'interview_' + Date.now(),
      ...interviewData,
      createdAt: new Date(),
      save: async function () {
        memoryInterviews.set(this._id, this);
        return this;
      }
    };
    memoryInterviews.set(interview._id, interview);
    return interview;
  },

  async findInterviewById(id) {
    return memoryInterviews.get(id.toString()) || null;
  },

  async getInterviewsByUserId(userId) {
    const list = [];
    for (const item of memoryInterviews.values()) {
      if (item.userId && item.userId.toString() === userId.toString()) {
        list.push(item);
      }
    }
    return list.sort((a, b) => b.createdAt - a.createdAt);
  },

  // Transactions Memory Cache
  async createTransaction(txData) {
    const tx = {
      _id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      ...txData,
      createdAt: new Date(),
      save: async function () {
        memoryTransactions.set(this._id, this);
        return this;
      }
    };
    memoryTransactions.set(tx._id, tx);
    return tx;
  },

  async findTransactionByUtr(utr) {
    for (const tx of memoryTransactions.values()) {
      if (tx.utrNumber === utr) return tx;
    }
    return null;
  },

  async findTransactionById(id) {
    return memoryTransactions.get(id.toString()) || null;
  },

  async getAllTransactions() {
    return Array.from(memoryTransactions.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async getUserTransactions(userId) {
    const list = [];
    for (const tx of memoryTransactions.values()) {
      if (tx.userId && tx.userId.toString() === userId.toString()) {
        list.push(tx);
      }
    }
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
};
