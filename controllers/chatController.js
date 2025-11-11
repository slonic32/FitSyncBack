import {
  chatHealthService,
  analyzeMealService,
} from "../services/chatServices.js";

export const chat = async (req, res, next) => {
  try {
    const { messages } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages[] is required" });
    }
    const data = await chatHealthService(messages, {
      userId: req.user?._id,
    });
    res.json(data);
  } catch (e) {
    next(e);
  }
};

export const analyze = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "file is required" });
    const data = await analyzeMealService(
      req.file,
      req.body?.userContext || "",
      { userId: req.user?._id }
    );
    res.json(data);
  } catch (e) {
    next(e);
  }
};
