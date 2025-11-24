import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL_CANDIDATES = [
  // Prefer latest Gen-2 models first
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-latest",
  "gemini-2.0-flash-lite",
  "gemini-2.0-pro",
  "gemini-2.0-pro-exp-02-05",
  // Fall back to 1.5 if 2.x unavailable
  "gemini-1.5-pro-latest",
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash",
];

let client;
function getClient() {
  if (client) return client;
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Server missing GEMINI_API_KEY");
  client = new GoogleGenerativeAI(key);
  return client;
}

function getModel(name, systemInstruction = null) {
  const config = { model: name };
  if (systemInstruction) {
    // System instruction can be a string or an object with parts
    // Using string format which is supported by Gemini API
    config.systemInstruction = systemInstruction;
  }
  return getClient().getGenerativeModel(config);
}


async function generateWithFallbacks(contents, options = {}, systemInstruction = null) {
  let lastErr;
  for (const name of MODEL_CANDIDATES) {
    try {
      const model = getModel(name, systemInstruction);
      const res = await model.generateContent({ contents, ...options });
      return { text: res?.response?.text?.() || "" };
    } catch (e) {
      const msg = String(e?.error?.message || e?.message || e);
      if (/not found|404|not supported/i.test(msg)) {
        lastErr = e;
        continue;
      }
      throw e;
    }
  }
  throw lastErr || new Error("All Gemini models unavailable");
}

export async function chatHealthService(
  messages /* [{role, parts:[{text}]}] */,
  { userId } = {}
) {
  // System instruction to restrict AI to nutrition topics only
  // The AI itself will handle rejecting non-nutrition questions
  // Using very explicit and strict instructions with examples
  const systemInstruction = `You are EXCLUSIVELY a nutrition and health guide. Your SOLE purpose is to help users with nutrition and health-related questions ONLY. You MUST NOT answer any questions outside of nutrition and health topics.

STRICT RULES - YOU MUST FOLLOW THESE WITHOUT EXCEPTION:

ALLOWED TOPICS (ONLY answer questions about these):
- Nutrition and dietary information
- Caloric content and meal analysis
- Macronutrients (protein, carbs, fats) and micronutrients
- Hydration and water intake recommendations
- Health and wellness related to diet
- Meal planning and dietary goals
- Food ingredients and nutritional values
- Weight management related to diet
- Exercise recommendations for burning calories

FORBIDDEN TOPICS (NEVER answer these - even if you know the answer):
- Mathematics, calculations, equations, math problems (including "1 + 1", "2 + 2", "solve this equation", etc.)
- General knowledge questions
- Jokes or entertainment
- Coding or programming
- Weather, time, dates (unless related to meal timing)
- Translation
- Writing or creative tasks
- History, science, geography, or any academic subject
- ANY topic NOT directly related to nutrition, health, diet, or food

MANDATORY BEHAVIOR:
1. Before answering ANY question, check if it's about nutrition, health, diet, food, or hydration
2. If the question is NOT about these topics, you MUST immediately decline - DO NOT provide any answer
3. Use this EXACT response (copy it word-for-word): "I'm a nutrition and health guide, so I can only help with questions related to nutrition, health, hydration, caloric information, and meal analysis. Please ask me something about your diet, meals, or health goals!"
4. DO NOT provide ANY answer, explanation, calculation, or information for non-nutrition questions
5. DO NOT solve math problems - even simple ones like "1 + 1" or "what is 2 + 2"
6. DO NOT answer general knowledge questions
7. DO NOT be helpful with non-nutrition topics - always decline first
8. Always redirect back to nutrition-related topics
9. Be polite but firm and consistent in your refusal

EXAMPLES OF QUESTIONS YOU MUST DECLINE (and use the exact response above):
- "What is 1 + 1?" → DECLINE (do not answer "2")
- "Solve this equation: 1 + 1" → DECLINE (do not answer "2")
- "What is 2 + 2?" → DECLINE
- "Tell me a joke" → DECLINE
- "What's the weather?" → DECLINE
- "Write code for me" → DECLINE
- Any math problem → DECLINE
- Any non-nutrition question → DECLINE

Remember: Your ONLY job is nutrition and health. Everything else must be declined with the exact message above. Never provide answers to non-nutrition questions.`;
  
  // add auth/rate checks using userId if needed
  return generateWithFallbacks(messages, {}, systemInstruction);
}

export async function analyzeMealService(
  file /* multer file */,
  userContext = "",
  { userId } = {}
) {
  const systemPrompt = `You are a health guide. Analyze meals from photos.
Return:
- Estimated total calories
- Exercise to burn those calories (walking, running, cycling) with suggested durations
- Macronutrients (g): protein, carbs, fats
- Likely vitamins/minerals
- Hydration advice
Be concise and list assumptions.

IMPORTANT: If the user context contains questions that are NOT about nutrition, health, or the meal analysis, politely decline and redirect to nutrition topics.`;

  const imagePart = {
    inlineData: {
      data: file.buffer.toString("base64"),
      mimeType: file.mimetype || "image/jpeg",
    },
  };

  const contents = [
    {
      role: "user",
      parts: [
        { text: systemPrompt },
        ...(userContext ? [{ text: `User context: ${userContext}` }] : []),
        imagePart,
      ],
    },
  ];

  // Add system instruction to restrict to nutrition topics
  const systemInstruction = `You are a nutrition and health guide. You can ONLY help with nutrition, health, diet, and meal-related questions. If asked about anything else (math, general knowledge, etc.), politely decline with: "I'm a nutrition and health guide, so I can only help with questions related to nutrition, health, hydration, caloric information, and meal analysis. Please ask me something about your meal, diet, or health goals!"`;

  return generateWithFallbacks(contents, {}, systemInstruction);
}
