import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('signin'); // 'signin' or 'signup'

  // Load user profile on initial mount if token exists
  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('ai_interview_token');
      if (!token) {
        setLoading(false);
        return;
      }

      const res = await api.get('/auth/me');
      if (res.data.success) {
        setUser(res.data.user);
      }
    } catch (err) {
      console.warn('Could not restore session:', err.message);
      localStorage.removeItem('ai_interview_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Register a new user with Name, Email, Password, and Avatar
   */
  const signUpUser = async ({ name, email, password, avatar }) => {
    try {
      const res = await api.post('/auth/register', {
        name,
        email,
        password,
        avatar
      });

      if (res.data.success) {
        localStorage.setItem('ai_interview_token', res.data.token);
        setUser(res.data.user);
        setIsAuthModalOpen(false);
        return { success: true, message: res.data.message };
      }
      return { success: false, message: res.data.message };
    } catch (err) {
      console.error('Sign up error:', err);
      return {
        success: false,
        message: err.response?.data?.message || 'Registration failed. Please try again.'
      };
    }
  };

  /**
   * Sign In an existing user with Email and Password
   */
  const signInUser = async ({ email, password }) => {
    try {
      const res = await api.post('/auth/login', {
        email,
        password
      });

      if (res.data.success) {
        localStorage.setItem('ai_interview_token', res.data.token);
        setUser(res.data.user);
        setIsAuthModalOpen(false);
        return { success: true, message: res.data.message };
      }
      return { success: false, message: res.data.message };
    } catch (err) {
      console.error('Sign in error:', err);
      return {
        success: false,
        message: err.response?.data?.message || 'Sign in failed. Please check credentials.'
      };
    }
  };

  /**
   * Log in or register using user info (from Firebase Google Auth or Direct)
   */
  const loginUser = async ({ name, email, avatar, firebaseUid }) => {
    try {
      const res = await api.post('/auth/google', {
        name,
        email,
        avatar,
        firebaseUid
      });

      if (res.data.success) {
        localStorage.setItem('ai_interview_token', res.data.token);
        setUser(res.data.user);
        setIsAuthModalOpen(false);
        return { success: true };
      }
      return { success: false, message: res.data.message };
    } catch (err) {
      console.error('Login error:', err);
      return {
        success: false,
        message: err.response?.data?.message || 'Login failed'
      };
    }
  };

  /**
   * Instant 1-Click Demo Login (Great for local testing without Firebase setup)
   */
  const loginDemo = async () => {
    return await loginUser({
      name: 'Alex Developer',
      email: 'alex.developer@example.com',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Alex',
      firebaseUid: 'demo_user_123'
    });
  };

  const logout = () => {
    localStorage.removeItem('ai_interview_token');
    setUser(null);
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signUpUser,
        signInUser,
        loginUser,
        loginDemo,
        logout,
        refreshUser,
        isPricingOpen,
        openPricing: () => setIsPricingOpen(true),
        closePricing: () => setIsPricingOpen(false),
        isAuthModalOpen,
        authMode,
        setAuthMode,
        openAuthModal: (mode = 'signin') => {
          setAuthMode(mode);
          setIsAuthModalOpen(true);
        },
        closeAuthModal: () => setIsAuthModalOpen(false)
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
