import dotenv from 'dotenv';
dotenv.config();

import { MemoryStore } from './models/memoryStore.js';
import * as authController from './controllers/authController.js';
import * as interviewController from './controllers/interviewController.js';
import * as paymentController from './controllers/paymentController.js';

// Helper to create mock Express req and res objects
function createMockReqRes({ body = {}, params = {}, query = {}, headers = {}, user = null, file = null } = {}) {
  let statusCode = 200;
  let responseData = null;
  let ended = false;

  const req = {
    body,
    params,
    query,
    headers,
    user,
    file
  };

  const res = {
    status(code) {
      statusCode = code;
      return res;
    },
    json(data) {
      responseData = data;
      ended = true;
      return res;
    },
    send(data) {
      responseData = data;
      ended = true;
      return res;
    },
    getStatusCode: () => statusCode,
    getData: () => responseData
  };

  return { req, res };
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('🧪 RUNNING COMPREHENSIVE AI-INTERVIEW BACKEND TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // --- 1. AUTHENTICATION TESTS ---
  console.log('\n--- MODULE 1: AUTHENTICATION & USERS ---');

  // Test 1.1: Registration validation
  {
    const { req, res } = createMockReqRes({
      body: { name: '', email: 'invalid', password: '123' }
    });
    await authController.register(req, res);
    assert(res.getStatusCode() === 400, 'Registration rejects empty name');
  }

  // Test 1.2: Successful registration
  let testUser = null;
  let userToken = null;
  const testEmail = `candidate_${Date.now()}@example.com`;
  {
    const { req, res } = createMockReqRes({
      body: {
        name: 'Jane Doe',
        email: testEmail,
        password: 'securepassword123'
      }
    });
    await authController.register(req, res);
    const data = res.getData();
    assert(res.getStatusCode() === 201 && data.success === true, 'User registration succeeds with 201');
    assert(data.token && data.user.email === testEmail, 'User returned with JWT token & email');
    assert(data.user.credits === 50, 'New user receives 50 starting credits');
    testUser = data.user;
    userToken = data.token;
  }

  // Test 1.3: Duplicate registration rejected
  {
    const { req, res } = createMockReqRes({
      body: {
        name: 'Jane Duplicate',
        email: testEmail,
        password: 'securepassword123'
      }
    });
    await authController.register(req, res);
    assert(res.getStatusCode() === 400, 'Duplicate registration returns 400');
  }

  // Test 1.4: Login with correct credentials
  {
    const { req, res } = createMockReqRes({
      body: {
        email: testEmail,
        password: 'securepassword123'
      }
    });
    await authController.login(req, res);
    const data = res.getData();
    assert(res.getStatusCode() === 200 && data.success === true, 'Login succeeds with valid password');
    assert(data.token, 'Login returns valid token');
  }

  // Test 1.5: Login with wrong password
  {
    const { req, res } = createMockReqRes({
      body: {
        email: testEmail,
        password: 'wrongpassword'
      }
    });
    await authController.login(req, res);
    assert(res.getStatusCode() === 401, 'Login fails with wrong password (401)');
  }

  // Test 1.6: Get Current User Profile
  {
    const foundUser = await MemoryStore.findUserById(testUser.id);
    const { req, res } = createMockReqRes({ user: foundUser });
    await authController.getCurrentUser(req, res);
    const data = res.getData();
    assert(res.getStatusCode() === 200 && data.user.email === testEmail, 'Get current user returns profile');
  }

  // --- 2. PAYMENT & CREDIT TESTS ---
  console.log('\n--- MODULE 2: PAYMENTS & CREDIT SYSTEM ---');

  // Test 2.1: Get Plans
  {
    const { req, res } = createMockReqRes();
    paymentController.getPlans(req, res);
    const data = res.getData();
    assert(res.getStatusCode() === 200 && data.plans.length === 3, 'Get plans returns 3 packages (Starter, Pro, Mastery)');
    assert(data.upiConfig?.upiId, 'Plans return valid merchant UPI config');
  }

  // Test 2.2: Create Order
  let orderData = null;
  {
    const foundUser = await MemoryStore.findUserById(testUser.id);
    const { req, res } = createMockReqRes({
      body: { planId: 'starter' },
      user: foundUser
    });
    await paymentController.createOrder(req, res);
    orderData = res.getData();
    assert(res.getStatusCode() === 200 && orderData.success === true, 'Order created successfully');
    assert(orderData.order?.id && orderData.order?.amount === 4900, 'Order has valid ID and amount (4900 paise)');
  }

  // Test 2.3: Submit UPI UTR
  let transactionId = null;
  const mockUTR = '423984029184';
  {
    const foundUser = await MemoryStore.findUserById(testUser.id);
    const { req, res } = createMockReqRes({
      body: {
        planId: 'starter',
        utrNumber: mockUTR,
        payerName: 'Jane Doe',
        payerPhone: '9876543210',
        payerUpiId: 'janedoe@okaxis',
        upiApp: 'PhonePe',
        payerNote: 'Test payment'
      },
      user: foundUser
    });
    await paymentController.submitUpiUtr(req, res);
    const data = res.getData();
    assert(res.getStatusCode() === 200 && data.success === true, 'UPI UTR submitted successfully');
    assert(data.transaction?.status === 'PENDING', 'Transaction created with PENDING status');
    transactionId = data.transaction?.id || data.transaction?._id;
  }

  // Test 2.4: Admin Approves Payment & Adds Credits
  {
    const { req, res } = createMockReqRes({
      body: {
        transactionId: transactionId,
        action: 'APPROVE'
      }
    });
    await paymentController.handleAdminAction(req, res);
    const data = res.getData();
    assert(res.getStatusCode() === 200 && data.success === true, 'Admin approves transaction');
    const updatedUser = await MemoryStore.findUserById(testUser.id);
    assert(updatedUser.credits === 100, `User credits credited correctly (50 initial + 50 plan = ${updatedUser.credits})`);
  }

  // --- 3. INTERVIEW WORKFLOW TESTS ---
  console.log('\n--- MODULE 3: INTERVIEW GENERATION, QUESTIONS & ANSWERS ---');

  // Test 3.1: Start Interview (Technical, 5 questions)
  let interviewId = null;
  let createdInterview = null;
  {
    const foundUser = await MemoryStore.findUserById(testUser.id);
    const initialCredits = foundUser.credits;
    const { req, res } = createMockReqRes({
      body: {
        role: 'Full Stack Developer',
        experience: 'Intermediate',
        roundType: 'Technical',
        interviewerPersona: 'sarah'
      },
      user: foundUser
    });
    await interviewController.createInterview(req, res);
    const data = res.getData();
    assert(res.getStatusCode() === 201 && data.success === true, 'Interview session created (201)');
    assert(data.interview.questions?.length === 5, 'Generated exactly 5 interview questions');
    assert(foundUser.credits === initialCredits - 10, '10 credits deducted for starting interview');
    createdInterview = data.interview;
    interviewId = createdInterview._id || createdInterview.id;
  }

  // Test 3.2: Get Interview by ID
  {
    const { req, res } = createMockReqRes({ params: { id: interviewId } });
    await interviewController.getInterviewById(req, res);
    const data = res.getData();
    assert(res.getStatusCode() === 200 && data.interview.status === 'in-progress', 'Fetched interview is in-progress');
  }

  // Test 3.3: Submit Trivial / One-word Answer (Guardrail check)
  {
    const { req, res } = createMockReqRes({
      params: { id: interviewId },
      body: { questionIndex: 0, answer: 'hello' }
    });
    await interviewController.submitAnswer(req, res);
    const data = res.getData();
    assert(res.getStatusCode() === 200, 'Answer evaluation responded');
    assert(data.currentQuestion?.score === 0, 'Trivial answer "hello" scores 0/10 as expected');
    assert(data.currentQuestion?.feedback?.length > 10, 'Constructive feedback provided explaining why');
  }

  // Test 3.4: Submit Strong Answer to Q1
  {
    const { req, res } = createMockReqRes({
      params: { id: interviewId },
      body: {
        questionIndex: 0,
        answer: 'The JavaScript Event Loop uses a Call Stack for execution and delegates non-blocking I/O to libuv. Callbacks are queued in microtask and macrotask queues which execute when the stack is empty.'
      }
    });
    await interviewController.submitAnswer(req, res);
    const data = res.getData();
    assert(res.getStatusCode() === 200, 'Answer submitted successfully');
    assert(data.currentQuestion?.score >= 1, `Answer received score: ${data.currentQuestion?.score}/10`);
    assert(data.currentQuestion?.idealAnswer?.length > 20, 'Ideal 10/10 model answer returned for candidate review');
  }

  // Test 3.5: Answering questions 2 through 5 to complete interview
  {
    for (let i = 1; i < createdInterview.questions.length; i++) {
      const { req, res } = createMockReqRes({
        params: { id: interviewId },
        body: {
          questionIndex: i,
          answer: `Here is a comprehensive explanation for question ${i + 1}. In software architecture, we ensure high availability, horizontal scaling, proper indexing strategies, caching layers, and modular design.`
        }
      });
      await interviewController.submitAnswer(req, res);
      const data = res.getData();
      if (i === createdInterview.questions.length - 1) {
        assert(data.isCompleted === true, 'Final answer marks interview as completed (isCompleted = true)');
      }
    }
  }

  // Test 3.6: Verify Final Report Generated
  {
    const { req, res } = createMockReqRes({ params: { id: interviewId } });
    await interviewController.getInterviewById(req, res);
    const data = res.getData();
    const finalReport = data.interview;
    assert(finalReport.status === 'completed', 'Interview status is officially completed');
    assert(typeof finalReport.overallScore === 'number' && finalReport.overallScore > 0, `Overall performance score computed: ${finalReport.overallScore}/100`);
    assert(finalReport.strengths?.length > 0, `Strengths identified: ${finalReport.strengths.length}`);
    assert(finalReport.areasForImprovement?.length > 0, `Areas for improvement identified: ${finalReport.areasForImprovement.length}`);
    assert(finalReport.summary?.length > 20, 'Executive summary created for post-interview debrief');
  }

  // Test 3.7: User History Archive
  {
    const foundUser = await MemoryStore.findUserById(testUser.id);
    const { req, res } = createMockReqRes({ user: foundUser });
    await interviewController.getUserInterviews(req, res);
    const data = res.getData();
    assert(res.getStatusCode() === 200, 'History retrieved with 200');
    assert(data.interviews?.length >= 1, `Interview archive contains ${data.interviews.length} completed session(s)`);
  }

  console.log('\n====================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');
  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite();
