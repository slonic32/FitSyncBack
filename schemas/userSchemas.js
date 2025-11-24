import Joi from "joi";

const genderEnum = ["female", "male"];

const registerSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string().min(4).max(22).required(),
  name: Joi.string(),
});

const loginSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string().min(4).max(22).required(),
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

const passwordRecoverySchema = Joi.object({
  email: Joi.string().trim().email().required(),
});

const passwordResetSchema = Joi.object({
  password: Joi.string().min(4).max(22).required(),
});

const updateUserSchema = Joi.object({
  name: Joi.string(),
  email: Joi.string().trim().email(),
  gender: Joi.string().valid(...genderEnum),
  weight: Joi.number(),
  dailyActivityTime: Joi.string(),
  dailyWaterNorm: Joi.number(),
  avatarURL: Joi.string(),
});

const verificationSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "any.required": "missing required field email",
  }),
});

export const Schemas = {
  registerSchema,
  loginSchema,
  updateUserSchema,
  refreshSchema,
  verificationSchema,
  passwordRecoverySchema,
  passwordResetSchema,
};
