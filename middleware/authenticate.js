import { User } from "../models/userModel.js";
import { checkToken } from "../services/jwtServices.js";

// check user by token
export const authenticate = async (req, res, next) => {
  try {
    const token =
      req.headers.authorization?.startsWith("Bearer") &&
      req.headers.authorization.split(" ")[1];

    // find user by token
    const id = checkToken(token);

    const currentUser = id ? await User.findById(id) : null;

    if (id && currentUser && currentUser.token === token) {
      req.user = currentUser;
      next();
    } else
      res.status(401).json({
        message: "Unauthorized",
      });
  } catch (error) {
    next(error);
  }
};

// check user by refresh token
export const authenticateRefresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    // find user by token
    const id = checkToken(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const currentUser = id ? await User.findById(id) : null;

    if (id && currentUser && currentUser.refreshToken === refreshToken) {
      req.user = currentUser;
      next();
    } else
      res.status(401).json({
        message: "Unauthorized",
      });
  } catch (error) {
    next(error);
  }
};
