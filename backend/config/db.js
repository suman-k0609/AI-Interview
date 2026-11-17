import mongoose from 'mongoose';
import dns from 'dns';

// Fix Windows ISP DNS resolution for MongoDB Atlas SRV records
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
  // Ignore if not supported in environment
}

/**
 * Connect to MongoDB Database
 * Supports local MongoDB and MongoDB Atlas connection strings
 */
export const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/ai-interview';
    
    const connectPromise = mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 3500,
      connectTimeoutMS: 3500
    });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Connection timed out after 4000ms')), 4000)
    );
    const conn = await Promise.race([connectPromise, timeoutPromise]);
    console.log(`✅ MongoDB Connected Successfully: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`⚠️ MongoDB connection unavailable (${error.message}). Running with in-memory fallback store.`);
  }
};
