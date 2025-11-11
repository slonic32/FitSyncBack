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

function getModel(name) {
  return getClient().getGenerativeModel({ model: name });
}

async function generateWithFallbacks(contents, options = {}) {
  let lastErr;
  for (const name of MODEL_CANDIDATES) {
    try {
      const model = getModel(name);
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
  // add auth/rate checks using userId if needed
  return generateWithFallbacks(messages);
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
Be concise and list assumptions.`;

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

  return generateWithFallbacks(contents);
}
