# AceMock AI — Production AI Mock Interview & Evaluation Platform

An end-to-end SaaS application built with the **MERN** stack (MongoDB, Express, React 19, Node.js) that conducts personalized, real-time mock interviews with an AI agent.

---

## 🌟 Key Features

1. **👤 Interactive Realistic AI Human Interviewer**: Realistic video interview meeting with lifelike animated AI personas (**Dr. Sarah Chen**, **Marcus Vance**, **Elena Rostova**) featuring procedural lip-sync, dynamic speech audio waveforms, attentive listening animations, and spoken question delivery.
2. **🎥 Candidate Live Webcam & Mic Visualizer**: Full Google Meet / Zoom style video interface featuring candidate webcam stream, audio frequency equalizer reacting to speech, camera/mic toggles, and presence feedback.
3. **📄 PDF Resume Parsing**: Automatically extracts tech stack, skills, and project highlights from uploaded candidate resumes in memory using Multer.
4. **🤖 AI-Powered Interview Agent**: Generates custom technical and behavioral questions via **Google Gemini** or **OpenRouter** (with built-in offline smart fallback).
5. **🎙️ Voice Dictation & Text-to-Speech**: Candidates can speak answers directly with live speech-to-text transcription. The AI interviewer delivers spoken questions, transitions, and debrief feedback.
6. **📊 Real-time Scoring & Constructive Feedback**: Instant 0–10 score and suggestions after every question.
7. **🏆 Comprehensive Performance Scorecard**: Full debrief report highlighting overall grade (0–100), key strengths, areas for improvement, and a question-by-question breakdown with printable PDF support.
8. **⚡ Credit-Based SaaS Engine**: New users start with **50 free credits** (10 credits per mock interview).
9. **💳 Razorpay Payment Gateway**: Seamless credit top-ups with test and production checkout modes.
10. **🔐 Firebase Google Authentication**: Clean OAuth flow with automatic session restoration and 1-click guest testing.

---

## 🏗️ Architecture & Project Structure

```
AI-Interview/
├── backend/
│   ├── config/
│   │   └── db.js                 # MongoDB connection logic
│   ├── controllers/
│   │   ├── authController.js     # Google login & user profile
│   │   ├── interviewController.js # PDF parsing, Q&A, and report generation
│   │   └── paymentController.js   # Razorpay orders & verification
│   ├── middleware/
│   │   ├── auth.js               # JWT verification & dev guest fallback
│   │   └── upload.js             # Multer PDF memory storage filter
│   ├── models/
│   │   ├── User.js               # User schema with credit balance
│   │   └── Interview.js          # Interview schema with questions & feedback
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── interviewRoutes.js
│   │   └── paymentRoutes.js
│   ├── services/
│   │   └── aiService.js          # Gemini, OpenRouter & PDF parser
│   ├── .env                      # Environment configurations
│   ├── package.json
│   └── server.js                 # Express application entry
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Navbar.jsx        # Glassmorphic header with live credit counter
    │   │   ├── Footer.jsx        # Footer with tech stack links
    │   │   └── PricingModal.jsx  # Razorpay checkout & credit top-up modal
    │   ├── context/
    │   │   └── AuthContext.jsx   # User auth & credits state
    │   ├── pages/
    │   │   ├── HomePage.jsx      # Hero landing page & SaaS features
    │   │   ├── SetupInterviewPage.jsx # Resume upload & role selector
    │   │   ├── InterviewRoomPage.jsx  # Interactive live interview room
    │   │   ├── ReportPage.jsx    # Final performance scorecard
    │   │   └── HistoryPage.jsx   # Past interviews archive
    │   ├── services/
    │   │   ├── api.js            # Axios client with JWT interceptor
    │   │   └── firebase.js       # Firebase Google Auth configuration
    │   ├── App.jsx               # React Router layout
    │   ├── index.css             # Tailwind v4 styles & glassmorphic tokens
    │   └── main.jsx
    ├── index.html
    ├── package.json
    └── vite.config.js
```

---

## 🚀 How to Run Locally

### 1. Start the Backend Server
```bash
cd backend
npm install
node server.js
```
The backend will run on `http://localhost:5000`.

### 2. Start the Frontend App
```bash
cd frontend
npm install
npm run dev
```
The frontend will run on `http://localhost:5173`.

---

## 🔑 Environment Variables Configuration (`backend/.env`)

| Variable | Description |
| :--- | :--- |
| `PORT` | Server port (default: `5000`) |
| `MONGO_URI` | MongoDB Atlas or local MongoDB connection string |
| `JWT_SECRET` | Secret key used to sign session tokens |
| `GEMINI_API_KEY` | *(Optional)* Google AI Studio Gemini API Key |
| `OPENROUTER_API_KEY` | *(Optional)* OpenRouter API Key |
| `RAZORPAY_KEY_ID` | Razorpay Test Key ID (e.g. `rzp_test_...`) |
| `RAZORPAY_KEY_SECRET` | Razorpay Test Key Secret |
