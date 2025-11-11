import express from "express";

import { uploadFile } from "../middleware/chatMiddleware.js";

import * as controllers from "../controllers/chatController.js";
import { authenticate } from "../middleware/authenticate.js";
import { errorHandling } from "../helpers/errorHandlingWrapper.js";

const router = express.Router();

router.post("/chat", authenticate, errorHandling(controllers.chat));

router.post(
  "/analyze",
  authenticate,
  uploadFile,
  errorHandling(controllers.analyze)
);

export default router;
