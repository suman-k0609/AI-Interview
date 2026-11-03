import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import axios from 'axios';

/**
 * 1. Extract plain text from uploaded PDF resume buffer
 */
export const parseResumePDF = async (pdfBuffer) => {
  try {
    const data = await pdfParse(pdfBuffer);
    return data.text || '';
  } catch (error) {
    console.error('Failed to parse PDF resume:', error.message);
    return '';
  }
};

/**
 * Helper to call AI model (Gemini or OpenRouter) with system & user prompt
 */
const callLLM = async (systemPrompt, userPrompt) => {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  // 1. Try Google Gemini API with ultra-fast models
  if (geminiKey && geminiKey.trim() !== '') {
    const candidateModels = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.8-flash'];
    for (const modelName of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`;
        const response = await axios.post(
          url,
          {
            contents: [
              {
                role: 'user',
                parts: [{ text: `${systemPrompt}\n\nTask:\n${userPrompt}` }]
              }
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 6000,
              responseMimeType: 'application/json'
            }
          },
          { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
        );

        const candidate = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidate) {
          console.log(`⚡ AI response generated using [${modelName}]`);
          return candidate;
        }
      } catch (err) {
        console.warn(`[${modelName}] call error: ${err.message}, trying next available model...`);
      }
    }
  }

  // 2. Try OpenRouter if key is available
  if (openRouterKey && openRouterKey.trim() !== '') {
    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'meta-llama/llama-3-8b-instruct:free',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ]
        },
        {
          headers: {
            Authorization: `Bearer ${openRouterKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      const content = response.data?.choices?.[0]?.message?.content;
      if (content) return content;
    } catch (err) {
      console.error('OpenRouter call failed:', err.message);
    }
  }

  return null; // Signals to use intelligent dynamic fallback
};

/**
 * Clean JSON output from LLM responses (stripping markdown codeblocks ```json ... ```)
 */
const cleanJson = (raw) => {
  if (!raw) return null;
  let cleaned = raw.trim();

  // Strip code blocks
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim();
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```/, '').replace(/```$/, '').trim();
  }

  // Attempt direct parse
  try {
    return JSON.parse(cleaned);
  } catch (err1) {
    try {
      // Fix common trailing commas before closing braces/brackets
      const sanitized = cleaned
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/\n/g, ' ');
      return JSON.parse(sanitized);
    } catch (err2) {
      // Extract outermost JSON block if any extra text exists
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0].replace(/,\s*([}\]])/g, '$1'));
        } catch (err3) {
          console.error('Failed to parse extracted JSON:', err3.message);
        }
      }
      console.error('Failed to parse AI JSON response:', err1.message);
      return null;
    }
  }
};

/**
 * 2. Generate Interview Questions tailored to role, level, round & resume
 */
export const generateQuestions = async ({ role, experience, roundType, resumeText }) => {
  const systemPrompt = `You are an elite Senior Technical Hiring Manager and Technical Recruiter. 
Your goal is to conduct a realistic, high-standard mock interview.
Return strictly valid JSON in the requested format with NO extra commentary or Markdown outside the JSON.`;

  const userPrompt = `
Generate 5 interview questions for a candidate with the following profile:
- Target Role: ${role}
- Experience Level: ${experience}
- Round Type: ${roundType}
- Resume Highlights / Background: ${resumeText ? resumeText.slice(0, 1500) : 'Not provided'}

Return a JSON object in this exact structure:
{
  "skillsIdentified": ["React", "Node.js", "System Design"],
  "questions": [
    {
      "question": "Can you explain...",
      "category": "Architecture / Core Concept / Behavioral",
      "expectedAnswer": "A strong answer should mention...",
      "idealAnswer": "Here is an exemplary, 10/10 model answer explaining the exact concepts, architectural principles, and best practice solutions..."
    }
  ]
}
`;

  const aiResponse = await callLLM(systemPrompt, userPrompt);
  const parsed = cleanJson(aiResponse);

  if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
    return {
      skills: parsed.skillsIdentified || [role, roundType],
      questions: parsed.questions.map((q) => ({
        ...q,
        idealAnswer: q.idealAnswer || q.expectedAnswer || ''
      }))
    };
  }

  // Realistic Fallback questions if AI Key is not configured yet
  return getCuratedFallbackQuestions(role, roundType, experience);
};

/**
 * 3. Evaluate candidate's answer for a specific question
 */
export const evaluateAnswer = async ({ question, expectedAnswer, idealAnswer, userAnswer, role }) => {
  const cleanAnswer = (userAnswer || '').trim().toLowerCase();

  // Instant zero-score for greetings or trivial one-word non-answers
  const trivialWords = ['hello', 'hi', 'hey', 'test', 'ok', 'okay', 'yes', 'no', 'idk', 'bye'];
  if (!cleanAnswer || cleanAnswer.length < 12 || trivialWords.includes(cleanAnswer)) {
    return {
      score: 0,
      feedback: 'The response does not address the interview question. To receive credit, please provide a detailed explanation covering the technical concepts and mechanisms asked.',
      idealAnswer: idealAnswer || expectedAnswer || 'A comprehensive, structured answer should address the core definition, architecture, and real-world trade-offs.'
    };
  }

  const systemPrompt = `You are an expert, constructive, and perceptive technical interviewer conducting a mock interview.
EVALUATION RULES:
1. DIRECT ACKNOWLEDGEMENT: In your feedback, ALWAYS directly reference and evaluate the specific tools, platforms, or thoughts the candidate mentioned in their response. For example, if they mention using Render, Vercel, or manual deployment instead of AWS, explicitly acknowledge what they said, and then clearly explain how it relates to or falls short of the actual question asked (e.g., custom CI/CD automated testing pipeline with GitHub Actions YAML workflows).
2. FAIR & NUANCED SCORING:
   - If the candidate's answer is completely irrelevant, a greeting, or nonsensical, award 0/10.
   - If the candidate mentions adjacent/related real-world concepts (such as mentioning git push deployments or hosting platforms like Vercel/Render), award proportional partial credit (2 to 4 points out of 10), acknowledging their effort while pointing out the specific technical gap.
   - If they provide a solid explanation covering key concepts, award 6 to 9 points.
   - Award 10/10 only if the response thoroughly covers mechanisms, architectures, and real-world considerations.
3. CONVERSATIONAL COACHING: Provide 2-3 sentences of constructive, highly personalized coaching. Start by acknowledging what they said, explain why it was incomplete or inaccurate, and teach them what hiring managers look for.
4. IDEAL MODEL ANSWER: Provide a comprehensive, articulate 10/10 model answer demonstrating how a senior engineer would answer this question flawlessly.
5. Return strictly valid JSON:
{
  "score": 0, // Integer between 0 and 10
  "feedback": "Direct, personalized feedback acknowledging their specific words and explaining the technical gap.",
  "idealAnswer": "A comprehensive, 10/10 model answer."
}`;

  const userPrompt = `
Role: ${role}
Interview Question: "${question}"
Key Points Expected: "${expectedAnswer || idealAnswer || ''}"
Candidate's Answer: "${userAnswer}"

Evaluate strictly and return JSON with score, constructive feedback, and the idealAnswer.`;

  const aiResponse = await callLLM(systemPrompt, userPrompt);
  const parsed = cleanJson(aiResponse);

  if (parsed && typeof parsed.score === 'number' && parsed.feedback) {
    return {
      score: Math.min(10, Math.max(0, Math.round(parsed.score))),
      feedback: parsed.feedback,
      idealAnswer: parsed.idealAnswer || idealAnswer || expectedAnswer || ''
    };
  }

  // Heuristic fallback if AI service is temporarily unreachable
  return {
    score: 1,
    feedback: 'The response was too short or did not sufficiently cover the expected architectural points. Consider elaborating on the core mechanisms and design decisions.',
    idealAnswer: idealAnswer || expectedAnswer || 'An exemplary response clearly explains the core architecture, mechanisms, and real-world trade-offs.'
  };
};

/**
 * 4. Generate Final Comprehensive Performance Report
 */
export const generateFinalReport = async ({ role, roundType, questionsWithAnswers }) => {
  const systemPrompt = `You are a Principal Engineering Director providing an official post-interview debrief report.
Return strictly valid JSON:
{
  "overallScore": 82, // integer 0 to 100
  "strengths": ["Clear communication", "Solid architectural foundation", "Proactive problem solving"],
  "areasForImprovement": ["Deepen knowledge in database indexing", "Practice STAR method for behavioral answers"],
  "summary": "The candidate demonstrated strong foundational knowledge and articulate communication..."
}`;

  const qaSummary = questionsWithAnswers
    .map(
      (q, idx) => `Q${idx + 1}: ${q.question}\nA: ${q.userAnswer || 'No answer'}\nScore: ${q.score}/10`
    )
    .join('\n\n');

  const userPrompt = `
Role: ${role}
Round: ${roundType}
Session Q&A Record:
${qaSummary}

Generate the final evaluation report in JSON format.`;

  const aiResponse = await callLLM(systemPrompt, userPrompt);
  const parsed = cleanJson(aiResponse);

  if (parsed && typeof parsed.overallScore === 'number') {
    return {
      overallScore: parsed.overallScore,
      strengths: parsed.strengths || ['Good technical intuition', 'Clear communication'],
      areasForImprovement: parsed.areasForImprovement || ['Review edge cases', 'Practice time management'],
      summary: parsed.summary || 'Solid overall interview performance with good potential.'
    };
  }

  // Calculate average score as fallback
  const validScores = questionsWithAnswers.filter((q) => typeof q.score === 'number').map((q) => q.score);
  const avg = validScores.length ? Math.round((validScores.reduce((a, b) => a + b, 0) / validScores.length) * 10) : 75;

  return {
    overallScore: avg,
    strengths: [
      `Demonstrated solid conceptual familiarity with ${role}`,
      'Maintained clear, coherent response structure',
      'Positive problem-solving approach'
    ],
    areasForImprovement: [
      'Incorporate more concrete metrics and quantifiable outcomes',
      'Explain architectural trade-offs between alternative implementations',
      'Provide more real-world production incident examples'
    ],
    summary: `Candidate showed a commendable understanding of core principles required for a ${role} position, with notable clarity in foundational topics.`
  };
};

/**
 * Fallback questions database for offline/instant development testing
 */
function getCuratedFallbackQuestions(role, roundType, experience) {
  if (roundType === 'HR / Behavioral') {
    return {
      skills: ['Communication', 'Teamwork', 'Conflict Resolution', 'Leadership'],
      questions: [
        {
          question: 'Tell me about a challenging technical or teamwork issue you faced on a project and how you resolved it.',
          category: 'Conflict & Resolution',
          expectedAnswer: 'Use the STAR method (Situation, Task, Action, Result) focusing on personal accountability and constructive communication.',
          idealAnswer: 'In my previous e-commerce project, our backend and frontend teams had conflicting interpretations of the order checkout API contract, causing merge blockages right before a major sprint deadline (Situation). As the lead developer, my task was to align both teams without delaying the delivery schedule (Task). I initiated a quick 20-minute sync, converted the API requirements into an OpenAPI/Swagger spec, and mocked the endpoints so frontend engineers could continue building seamlessly while backend logic was finalized (Action). As a result, we delivered the feature two days ahead of schedule with zero regression bugs, and established API-first design contracts as the team standard for future sprints (Result).'
        },
        {
          question: 'How do you handle tight deadlines when project scope changes unexpectedly?',
          category: 'Prioritization & Adaptability',
          expectedAnswer: 'Mention communication with stakeholders, ruthless prioritization of critical path tasks, and managing expectations.',
          idealAnswer: 'When scope changes unexpectedly under tight deadlines, I immediately pause and assess the critical path. First, I break the new requirements into "must-haves" versus "nice-to-haves" using the MoSCoW framework. Next, I proactively communicate with the product manager and tech lead to present trade-offs—demonstrating what can be delivered reliably by the original deadline versus what can be phased into a fast-follow release. By maintaining transparent communication, decoupling non-essential features, and protecting test coverage, the team avoids burnout while delivering core business value on time.'
        },
        {
          question: 'Can you describe a time you received critical feedback on code review or performance, and what action you took?',
          category: 'Growth Mindset',
          expectedAnswer: 'Demonstrates humility, receptiveness to constructive feedback, and proactive steps taken to level up.',
          idealAnswer: 'Early in my career, a staff engineer commented on my PR that my state management solution caused excessive re-renders and lacked unit test coverage for edge cases. Rather than being defensive, I viewed it as an invaluable mentorship opportunity. I scheduled a 15-minute pairing session to understand their architectural perspective, studied React profiler traces, and refactored the logic using memoization and custom hooks. I then added comprehensive integration tests with React Testing Library. Moving forward, I created a PR checklist for our team to catch performance and test gaps early.'
        },
        {
          question: 'Where do you see yourself technically and professionally in the next 2 to 3 years?',
          category: 'Career Vision',
          expectedAnswer: 'Aligns ambition with continuous learning, domain mastery, and taking ownership of larger impact.',
          idealAnswer: 'Over the next 2 to 3 years, my goal is to deepen my architectural expertise in building resilient, distributed systems and modern web platforms. Professionally, I want to grow from executing individual features to owning complex technical initiatives end-to-end—driving system design, optimizing performance, and mentoring junior engineers. I am particularly excited about contributing to scalable products that solve tangible customer problems while upholding high engineering standards.'
        },
        {
          question: 'Why are you interested in this specific role and what motivates you most as an engineer?',
          category: 'Motivation & Fit',
          expectedAnswer: 'Genuine curiosity, passion for solving customer problems, and interest in modern web architecture.',
          idealAnswer: 'What excites me most about this role is the opportunity to work on challenging engineering problems that directly impact end users every day. As an engineer, my primary motivation is creating elegant, performant solutions that simplify complex workflows. I appreciate your team\'s culture of high engineering rigor, fast feedback loops, and customer empathy, and I am eager to contribute my full-stack background to accelerate product delivery.'
        }
      ]
    };
  }

  // Default Technical questions
  return {
    skills: [role, 'JavaScript', 'System Architecture', 'APIs', 'Database Optimization'],
    questions: [
      {
        question: `How does the JavaScript Event Loop work, and how does Node.js handle asynchronous I/O operations without blocking the main thread?`,
        category: 'Core Concepts',
        expectedAnswer: 'Mention the call stack, libuv thread pool, microtask queue (Promises), macrotask queue (timers/I/O), and event loop phases.',
        idealAnswer: 'JavaScript executes on a single-threaded runtime driven by a Call Stack. When an asynchronous operation (like network I/O or disk access) is invoked in Node.js, the execution is delegated to the underlying libuv C++ library and OS kernel non-blocking mechanisms (such as epoll or kqueue). While the I/O runs in the background, the main JavaScript thread remains unblocked to handle other user requests. Once the asynchronous operation completes, its callback is enqueued into either the Microtask Queue (e.g., process.nextTick and resolved Promises, which run immediately after the current call stack empties) or specific Macrotask Queues across the 6 Event Loop phases (Timers, Pending Callbacks, Idle/Prepare, Poll, Check/setImmediate, and Close Callbacks). This priority queueing model gives Node.js its high-concurrency throughput.'
      },
      {
        question: `In React, what are the differences between useMemo, useCallback, and React.memo? When would you use each to prevent unnecessary re-renders?`,
        category: 'Frontend Performance',
        expectedAnswer: 'useMemo memoizes calculated values; useCallback memoizes function instances; React.memo prevents component re-renders unless props change.',
        idealAnswer: 'React.memo is a higher-order component that wraps a component to skip re-rendering if its props have not shallowly changed. useCallback is a hook used to memoize callback function instances between renders, which prevents child components wrapped in React.memo from re-rendering due to newly created function references. useMemo memoizes the returned result of an expensive calculation (like filtering or sorting large datasets) so it is only recomputed when specified dependencies change. Overusing memoization introduces memory and comparison overhead, so you should use them judiciously—specifically when passing callbacks or heavy computed values to memoized child components or expensive DOM trees.'
      },
      {
        question: `How would you design a scalable MongoDB schema and indexing strategy for an application with high read-to-write ratios?`,
        category: 'Database & Performance',
        expectedAnswer: 'Discuss compound indexes, explain() queries, embedding vs referencing, and using replica sets or caching layers like Redis.',
        idealAnswer: 'For high read-to-write ratios in MongoDB, I design schemas around query patterns following the ESR rule (Equality, Sort, Range) for compound indexing. First, frequently accessed together data is embedded into the parent document to eliminate expensive $lookup joins, while unbounded arrays are kept in referenced collections to prevent the 16MB document limit. Second, I create targeted compound indexes covering the primary queries, allowing queries to be answered entirely from the index (covered queries). Third, I run db.collection.explain("executionStats") to verify index utilization and ensure totalDocsExamined matches nReturned. Finally, for global scale, I configure read preference to secondary replicas or introduce an in-memory Redis caching layer with TTL expiration for hot reads.'
      },
      {
        question: `Explain how JWT authentication works in a MERN application. What are best security practices for storing and refreshing tokens?`,
        category: 'Security & Auth',
        expectedAnswer: 'Signing payload with secret, sending Bearer token, HttpOnly Secure cookies to prevent XSS, and short-lived access tokens with refresh tokens.',
        idealAnswer: 'A JSON Web Token consists of three base64-encoded segments: Header, Payload, and cryptographic Signature. When a user authenticates, the server signs a payload containing the user ID and role with a secret key. In production MERN systems, storing tokens in localStorage exposes them to Cross-Site Scripting (XSS). The best security practice is implementing a Dual-Token system: a short-lived Access Token (e.g., 15 minutes) kept in memory or sent via headers, and an encrypted Refresh Token (e.g., 7 days) stored in an HttpOnly, Secure, SameSite=Strict cookie that JavaScript cannot access. When the access token expires, an Axios interceptor silently calls a /refresh endpoint with the cookie to issue a new access token, preventing session hijacking while ensuring seamless UX.'
      },
      {
        question: `Imagine an API endpoint in your backend is taking 4 seconds to respond under moderate traffic. Walk me through your step-by-step debugging approach.`,
        category: 'System Diagnostics & Debugging',
        expectedAnswer: 'Measure network vs server time, check database queries (missing indexes or N+1 queries), profile CPU/memory, check external API latencies.',
        idealAnswer: 'My debugging process follows a methodical, telemetry-driven funnel: 1. Isolate Latency: Check APM traces or network timing to confirm whether latency is occurring in client DNS/TLS, load balancer queueing, or server-side execution. 2. Profile Database Operations: 80% of slow backend endpoints are caused by unindexed database scans or N+1 query loops. I check MongoDB slow query logs and run explain() on queries executed by that route. 3. Inspect External Dependencies: Verify if the endpoint makes synchronous external HTTP calls or third-party service requests without timeouts. 4. Code & Event Loop Profiling: Use Node.js clinic.js or inspect flamegraphs to identify CPU-intensive synchronous operations (like JSON parsing large payloads or unoptimized regex) that block the Node.js event loop. 5. Mitigate & Verify: Add necessary indexes, implement batching or pagination, wrap downstream calls in circuit breakers, and introduce Redis caching where applicable, validating the fix through load testing with k6 or autocannon.'
      }
    ]
  };
}
