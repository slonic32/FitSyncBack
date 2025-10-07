import Joi from "joi";

const genderEnum = ["woman", "man"];

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

const updateUserSchema = Joi.object({
  name: Joi.string(),
  email: Joi.string().trim().email().required(),
  gender: Joi.string().valid(...genderEnum),
  weight: Joi.number(),
  dailyActivityTime: Joi.string(),
  dailyWaterNorm: Joi.number(),
  avatarURL: Joi.string(),
});

export const Schemas = {
  registerSchema,
  loginSchema,
  updateUserSchema,
  refreshSchema,
};
