import bcrypt from "bcrypt";

import { User } from "../models/userModel.js";
import HttpError from "../helpers/HttpError.js";
import { generateTokens } from "./jwtServices.js";

export const registerDataService = async (email, name, password) => {
  if ((await User.findOne({ email })) !== null) {
    throw HttpError(409, "Email in use");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await User.create({
    email,
    name,
    password: hashedPassword,
  });
  return await generateTokens(newUser);
};

export const loginDataService = async (email, password) => {
  const foundUser = await User.findOne({ email });
  if (!foundUser) throw HttpError(401, "Email or password is wrong");

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
    params.email = params.email.trim();
    if (currentUser.email !== params.email) {
      if ((await User.findOne({ email: currentUser.email })) !== null) {
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
  const { _id, token, refreshToken, password, ...cloneUser } = user.toObject();
  return cloneUser;
};
