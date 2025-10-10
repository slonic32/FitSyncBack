import {
  loginDataService,
  logoutUserDataService,
  regenerateTokenDataService,
  registerDataService,
  safeUserCloneDataService,
  updateUserDataService,
} from "../services/userServices.js";

export const register = async (req, res) => {
  const { email, name, password } = req.body;
  const newUser = await registerDataService(email.trim(), name, password);

  newUser.toObject();
  res.status(201).json({
    user: safeUserCloneDataService(newUser),
    token: newUser.token,
    refreshToken: newUser.refreshToken,
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
  let editedUser = {};
  const user = req.user;
  const dirtyData = req.body;
  const clearData = removeEmptyProps(dirtyData);

  editedUser = await updateUserDataService(user, {
    ...clearData,
  });

  res.status(200).json({ user: safeUserCloneDataService(editedUser) });
};

export const refreshTokens = async (req, res) => {
  const { token, refreshToken } = await regenerateTokenDataService(req.user);
  res.status(200).json({ token, refreshToken });
};
