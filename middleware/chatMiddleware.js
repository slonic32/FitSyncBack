import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Number(process.env.MAX_IMAGE_MB || 20) * 1024 * 1024 },
});

export const uploadFile = upload.single("file");
