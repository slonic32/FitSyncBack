import { model, Schema } from "mongoose";

const emailRegexp = /^\S+@\S+\.\S+$/;
const genderEnum = ["woman", "man"];

const userSchema = new Schema(
  {
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      match: emailRegexp,
    },
    name: {
      type: String,
    },
    gender: {
      type: String,
      enum: genderEnum,
      default: "woman",
    },
    weight: {
      type: Number,
      default: 0,
    },
    dailyActivityTime: {
      type: String,
      default: "00:00",
    },
    dailyWaterNorm: {
      type: Number,
      default: 1.5,
    },
    avatarURL: {
      type: String,
    },
    token: {
      type: String,
      default: null,
    },
    refreshToken: {
      type: String,
      default: null,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

export const User = model("users", userSchema);
