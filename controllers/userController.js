import { resizeImg } from "../services/imgServices.js";
import {
  loginDataService,
  logoutUserDataService,
  regenerateTokenDataService,
  registerDataService,
  safeUserCloneDataService,
  updateUserDataService,
  completeUserVerification,
  getUserByVerificationToken,
} from "../services/userServices.js";
import { sendVerificationEmail } from "../helpers/mail.js";

export const register = async (req, res) => {
  const { email, name, password } = req.body;
  const newUser = await registerDataService(email.trim(), name, password);

  newUser.toObject();

  await sendVerificationEmail(
    newUser.email,
    `http://localhost:3000/api/users/verify/${newUser.verificationToken}`
  );

  res.status(201).json({
    user: safeUserCloneDataService(newUser),
  });
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await loginDataService(email, password);

  res.status(200).json({
    user: safeUserCloneDataService(user),
    token: user.token,
    refreshToken: user.refreshToken,
  });
};

export const logout = async (req, res) => {
  await logoutUserDataService(req.user);
  res.status(204).json();
};

export const current = async (req, res) => {
  res.status(200).json({ user: safeUserCloneDataService(req.user) });
};

function removeEmptyProps(obj) {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      !(typeof value === "string" && value.trim() === "") &&
      !(Array.isArray(value) && value.length === 0)
    ) {
      acc[key] = value;
    }
    return acc;
  }, {});
}

export const updateUser = async (req, res) => {
  const user = req.user;
  let editedUser = user;
  const dirtyData = req.body;
  if (dirtyData) {
    if (dirtyData.avatarURL?.trim() === "false") {
      dirtyData.avatarURL = "";
    }
    const clearData = removeEmptyProps(dirtyData);

    if (req.file) {
      const avatarURL = await resizeImg(req.file);
      editedUser = await updateUserDataService(user, {
        ...clearData,
        avatarURL,
      });
    } else {
      editedUser = await updateUserDataService(user, {
        ...clearData,
      });
    }
  }

  res.status(200).json({ user: safeUserCloneDataService(editedUser) });
};

export const refreshTokens = async (req, res) => {
  const { token, refreshToken } = await regenerateTokenDataService(req.user);
  res.status(200).json({ token, refreshToken });
};

export async function verifyUser(req, res, next) {
  const user = await getUserByVerificationToken(req.params.verificationToken);
  if (user) {
    await completeUserVerification(user);
    res.status(200).json({
      message: "Verification successful",
    });
  } else {
    res.status(404).json({
      message: "User not found",
    });
  }
}

export async function resentVerification(req, res, next) {
  validate(verificationSchema, req.body);
  const { email } = req.body;
  const user = await getUserByEmail(email);
  if (user) {
    if (user.verify) {
      res.status(400).json({
        message: "Verification has already been passed",
      });
    } else {
      await sendVerificationEmail(
        user.email,
        `http://localhost:3000/api/users/verify/${user.verificationToken}`
      );
      res.status(200).json({
        message: "Verification email sent",
      });
    }
  } else {
    res.status(400).json({
      message: "missing required field email",
    });
  }
}
