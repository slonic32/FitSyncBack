import Joi from "joi";

const dateRegex = /^((0[1-9]|[1-2][0-9]|3[01])\.(0[1-9]|1[0-2])\.\d{4})$/;
const timeRegex = /^(?:2[0-4]|[01]?\d):(?:[0-5]\d)$/;

const dayRegex = /^(0[1-9]|[1-2][0-9]|3[01])$/;
const monthRegex = /^(0[1-9]|1[0-2])$/;
const yearRegex = /^(20[0-6][0-9]|2070)$/;

const day2Regex = /^(0?[1-9]|[12]\d|30|31)$/;

export const waterSchema = Joi.object({
  value: Joi.number().positive().integer().messages({
    "number.base": "Value must be a number",
    "number.positive": "Value must be positive",
    "number.integer": "Value must be an integer",
  }),
  date: Joi.string()
    .pattern(dateRegex)
    .message("Date must be dd.mm.yyyy / Where dd: 01-31, mm: 01-12"),
  time: Joi.string()
    .pattern(timeRegex)
    .message("Time must be hh:mm / Where hh: 00-24, mm: 00-59"),
}).options({ abortEarly: false });

export const querySchema = Joi.object({
  year: Joi.string().pattern(yearRegex).required().messages({
    "string.pattern.base": "Year must be yyyy / Where yyyy: 2000-2070",
    "string.reqired": "Parameter is required",
  }),
  month: Joi.string().pattern(monthRegex).required().messages({
    "string.pattern": "Month must be mm / Where mm: 01-12",
    "string.reqired": "Parameter is required",
  }),
  day: Joi.string()
    .pattern(dayRegex)
    .message("Day must be dd / Where dd: 01-31"),
});

export const queryDay = Joi.object({
  year: Joi.string().pattern(yearRegex).required().messages({
    "string.pattern.base": "Year must be yyyy / Where yyyy: 2000-2070",
    "string.reqired": "Parameter is required",
  }),
  month: Joi.string().pattern(monthRegex).required().messages({
    "string.pattern": "Month must be mm / Where mm: 01-12",
    "string.reqired": "Parameter is required",
  }),
  day: Joi.string()
    .pattern(day2Regex)
    .message("Day must be dd / Where dd: 01-31"),
});

export const queryMonth = Joi.object({
  year: Joi.string().pattern(yearRegex).required().messages({
    "string.pattern.base": "Year must be yyyy / Where yyyy: 2000-2070",
    "string.reqired": "Parameter is required",
  }),
  month: Joi.string().pattern(monthRegex).required().messages({
    "string.pattern": "Month must be mm / Where mm: 01-12",
    "string.reqired": "Parameter is required",
  }),
});
