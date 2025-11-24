import bcrypt from "bcrypt";

import { v4 } from "uuid";

import { User } from "../models/userModel.js";
import HttpError from "../helpers/HttpError.js";
import { generateTokens } from "./jwtServices.js";
import crypto from "crypto";

export const registerDataService = async (email, name, password) => {
  email = email.toLowerCase();
  email = email.trim();
  if ((await User.findOne({ email })) !== null) {
    throw HttpError(409, "Email in use");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await User.create({
    email,
    name,
    password: hashedPassword,
    verificationToken: v4(),
  });
  return newUser;
};

export const loginDataService = async (email, password) => {
  email = email.toLowerCase();
  email = email.trim();
  const foundUser = await User.findOne({ email });
  if (!foundUser) throw HttpError(401, "Email or password is wrong");
  if (!foundUser.verify) throw HttpError(401, "Email is not verified");

  const isPasswordMatching = await bcrypt.compare(password, foundUser.password);
  if (!isPasswordMatching) throw HttpError(401, "Email or password is wrong");

  return await generateTokens(foundUser);
};

export const logoutUserDataService = async currentUser => {
  await User.findByIdAndUpdate(
    { _id: currentUser._id },
    { token: null, refreshToken: null }
  );
};

export const updateUserDataService = async (currentUser, params) => {
  if (!currentUser) throw HttpError(401, "User not found");
  if (params.email) {
    params.email = params.email.toLowerCase();
    params.email = params.email.trim();
    if (currentUser.email !== params.email) {
      if ((await User.findOne({ email: params.email })) !== null) {
        throw HttpError(409, "Email in use");
      }
    }
  }
  try {
    return await User.findByIdAndUpdate(currentUser._id, params, { new: true });
  } catch (error) {
    throw HttpError(501, error);
  }
};

export const regenerateTokenDataService = async currentUser => {
  if (!currentUser) throw HttpError(401, "User is not found");
  return await generateTokens(currentUser);
};

export const safeUserCloneDataService = user => {
  const {
    _id,
    token,
    refreshToken,
    password,
    verificationToken,
    verify,
    ...cloneUser
  } = user.toObject();
  return cloneUser;
};

export const getUserByVerificationToken = async verificationToken => {
  return User.findOne({ verificationToken });
};

export const completeUserVerification = async user => {
  if (!user) throw HttpError(404, "User not found");

  user.verify = true;
  user.verificationToken = null;
  await user.save();
};

export const getUserByEmail = async email => {
  return User.findOne({ email: email.toLowerCase().trim() });
};

export const createPasswordRecoveryToken = async email => {
  const user = await getUserByEmail(email);
  if (!user) throw HttpError(404, "User not found");

  const token = crypto.randomBytes(32).toString("hex");
  const expires = Date.now() + 1000 * 60 * 60; // 1 hour

  user.passwordResetToken = token;
  user.passwordResetExpires = new Date(expires);
  await user.save();

  return token;
};

export const resetPasswordWithToken = async (token, password) => {
  const user = await User.findOne({
    passwordResetToken: token,
    passwordResetExpires: { $gt: new Date() },
  });

  if (!user) throw HttpError(400, "Invalid or expired token");

  const hashedPassword = await bcrypt.hash(password, 10);
  user.password = hashedPassword;
  user.passwordResetToken = null;
  user.passwordResetExpires = null;
  await user.save();
};
