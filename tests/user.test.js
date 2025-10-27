import { jest } from "@jest/globals";
import request from "supertest";
import express from "express";

//  fake user
const fakeUser = {
  _id: "u123",
  id: "u123",
  email: "test@example.com",
  name: "Test User",
  gender: "female",
  weight: 70,
  dailyActivityTime: "01:00",
  dailyWaterNorm: 2,
  avatarURL: "avatars/u123.png",
  token: "ACCESS_TOKEN",
  refreshToken: "REFRESH_TOKEN",
};

// mock modules
const mockRegisterDataService = jest.fn();
const mockLoginDataService = jest.fn();
const mockLogoutUserDataService = jest.fn();
const mockRegenerateTokenDataService = jest.fn();
const mockSafeUserCloneDataService = jest.fn();
const mockUpdateUserDataService = jest.fn();

jest.unstable_mockModule("../middleware/authenticate.js", () => ({
  authenticate: (req, res, next) => {
    req.user = { ...fakeUser };
    next();
  },
  authenticateRefresh: (req, res, next) => {
    req.user = { ...fakeUser };
    next();
  },
}));

jest.unstable_mockModule("../middleware/imgUploader.js", () => ({
  uploadImage: (req, res, next) => {
    req.file = undefined;
    next();
  },
}));

jest.unstable_mockModule("../middleware/validateBody.js", () => {
  const HttpError = (status = 400, message = "Bad Request") => {
    const err = new Error(message);
    err.status = status;
    return err;
  };
  return {
    validateBody: schema => {
      return (req, res, next) => {
        const { error } = schema.validate(req.body);
        if (error) {
          return next(HttpError(400, error.message));
        }
        next();
      };
    },
  };
});

jest.unstable_mockModule("../services/userServices.js", () => ({
  registerDataService: (...args) => mockRegisterDataService(...args),
  loginDataService: (...args) => mockLoginDataService(...args),
  logoutUserDataService: (...args) => mockLogoutUserDataService(...args),
  regenerateTokenDataService: (...args) =>
    mockRegenerateTokenDataService(...args),
  updateUserDataService: (...args) => mockUpdateUserDataService(...args),
  safeUserCloneDataService: (...args) => mockSafeUserCloneDataService(...args),
}));

jest.unstable_mockModule("../services/imgServices.js", () => ({
  resizeImg: jest.fn(async () => "avatars/newAvatar.png"),
}));

// import the real router
const { default: userRouter } = await import("../routes/userRouter.js");

// helper app

function makeTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/users", userRouter);

  app.use((err, req, res, next) => {
    const { status = 500, message = "Server error" } = err;
    res.status(status).json({ message });
  });

  return app;
}

// tests
describe("User API", () => {
  let app;

  beforeEach(() => {
    app = makeTestApp();
    jest.clearAllMocks();
  });

  describe("POST /api/users/register", () => {
    it("201 registers new user", async () => {
      const createdUser = {
        ...fakeUser,
        token: "NEW_ACCESS",
        refreshToken: "NEW_REFRESH",
        toObject() {},
      };

      mockRegisterDataService.mockResolvedValue(createdUser);
      mockSafeUserCloneDataService.mockReturnValue({
        email: createdUser.email,
        name: createdUser.name,
        gender: createdUser.gender,
        weight: createdUser.weight,
        dailyActivityTime: createdUser.dailyActivityTime,
        dailyWaterNorm: createdUser.dailyWaterNorm,
        avatarURL: createdUser.avatarURL,
      });

      const res = await request(app).post("/api/users/register").send({
        email: "test@example.com",
        password: "12345",
        name: "Test User",
      });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        user: {
          email: "test@example.com",
          name: "Test User",
          gender: "female",
          weight: 70,
          dailyActivityTime: "01:00",
          dailyWaterNorm: 2,
          avatarURL: "avatars/u123.png",
        },
        token: "NEW_ACCESS",
        refreshToken: "NEW_REFRESH",
      });

      expect(mockRegisterDataService).toHaveBeenCalledWith(
        "test@example.com",
        "Test User",
        "12345"
      );
    });

    it("400 invalid body", async () => {
      const res = await request(app).post("/api/users/register").send({
        email: "test@example.com",
        // no password
      });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        message: expect.stringContaining('"password" is required'),
      });

      expect(mockRegisterDataService).not.toHaveBeenCalled();
    });

    it("409 email in use", async () => {
      mockRegisterDataService.mockRejectedValue({
        status: 409,
        message: "Email in use",
      });

      const res = await request(app).post("/api/users/register").send({
        email: "taken@example.com",
        password: "12345",
        name: "Taken",
      });

      expect(res.status).toBe(409);
      expect(res.body).toEqual({ message: "Email in use" });
    });
  });

  describe("POST /api/users/login", () => {
    it("200 login ok", async () => {
      const loggedUser = {
        ...fakeUser,
        token: "ACCESS_LOGIN",
        refreshToken: "REFRESH_LOGIN",
      };

      mockLoginDataService.mockResolvedValue(loggedUser);
      mockSafeUserCloneDataService.mockReturnValue({
        email: loggedUser.email,
        name: loggedUser.name,
        gender: loggedUser.gender,
        weight: loggedUser.weight,
        dailyActivityTime: loggedUser.dailyActivityTime,
        dailyWaterNorm: loggedUser.dailyWaterNorm,
        avatarURL: loggedUser.avatarURL,
      });

      const res = await request(app).post("/api/users/login").send({
        email: "test@example.com",
        password: "12345",
      });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        user: {
          email: "test@example.com",
          name: "Test User",
          gender: "female",
          weight: 70,
          dailyActivityTime: "01:00",
          dailyWaterNorm: 2,
          avatarURL: "avatars/u123.png",
        },
        token: "ACCESS_LOGIN",
        refreshToken: "REFRESH_LOGIN",
      });

      expect(mockLoginDataService).toHaveBeenCalledWith(
        "test@example.com",
        "12345"
      );
    });

    it("400 invalid body", async () => {
      const res = await request(app).post("/api/users/login").send({
        password: "12345",
      });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        message: expect.stringContaining('"email" is required'),
      });

      expect(mockLoginDataService).not.toHaveBeenCalled();
    });

    it("401 bad credentials", async () => {
      mockLoginDataService.mockRejectedValue({
        status: 401,
        message: "Email or password is wrong",
      });

      const res = await request(app).post("/api/users/login").send({
        email: "test@example.com",
        password: "wrong",
      });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ message: "Email or password is wrong" });
    });
  });

  describe("GET /api/users/logout", () => {
    it("204 logout ok", async () => {
      mockLogoutUserDataService.mockResolvedValue(undefined);

      const res = await request(app).get("/api/users/logout");

      expect(res.status).toBe(204);
      expect(res.body).toEqual({});

      expect(mockLogoutUserDataService).toHaveBeenCalledWith(fakeUser);
    });
  });

  describe("GET /api/users/current", () => {
    it("200 returns current user", async () => {
      mockSafeUserCloneDataService.mockReturnValue({
        email: fakeUser.email,
        name: fakeUser.name,
        gender: fakeUser.gender,
        weight: fakeUser.weight,
        dailyActivityTime: fakeUser.dailyActivityTime,
        dailyWaterNorm: fakeUser.dailyWaterNorm,
        avatarURL: fakeUser.avatarURL,
      });

      const res = await request(app).get("/api/users/current");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        user: {
          email: "test@example.com",
          name: "Test User",
          gender: "female",
          weight: 70,
          dailyActivityTime: "01:00",
          dailyWaterNorm: 2,
          avatarURL: "avatars/u123.png",
        },
      });

      expect(mockSafeUserCloneDataService).toHaveBeenCalledWith(fakeUser);
    });
  });

  describe("PATCH /api/users/update", () => {
    it("200 updates profile (no avatar)", async () => {
      const dbUpdatedUser = {
        ...fakeUser,
        name: "New Name",
        weight: 75,
      };

      mockUpdateUserDataService.mockResolvedValue(dbUpdatedUser);
      mockSafeUserCloneDataService.mockReturnValue({
        email: dbUpdatedUser.email,
        name: dbUpdatedUser.name,
        gender: dbUpdatedUser.gender,
        weight: dbUpdatedUser.weight,
        dailyActivityTime: dbUpdatedUser.dailyActivityTime,
        dailyWaterNorm: dbUpdatedUser.dailyWaterNorm,
        avatarURL: dbUpdatedUser.avatarURL,
      });

      const res = await request(app)
        .patch("/api/users/update")
        .send({ name: "New Name", weight: 75 });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        user: {
          email: "test@example.com",
          name: "New Name",
          gender: "female",
          weight: 75,
          dailyActivityTime: "01:00",
          dailyWaterNorm: 2,
          avatarURL: "avatars/u123.png",
        },
      });

      expect(mockUpdateUserDataService).toHaveBeenCalledWith(fakeUser, {
        name: "New Name",
        weight: 75,
      });
    });

    it("400 invalid field (gender not allowed)", async () => {
      const res = await request(app)
        .patch("/api/users/update")
        .send({ gender: "alien" });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        message: expect.stringContaining('"gender" must be one of'),
      });

      expect(mockUpdateUserDataService).not.toHaveBeenCalled();
    });

    it("409 email in use", async () => {
      mockUpdateUserDataService.mockRejectedValue({
        status: 409,
        message: "Email in use",
      });

      const res = await request(app)
        .patch("/api/users/update")
        .send({ email: "exists@example.com" });

      expect(res.status).toBe(409);
      expect(res.body).toEqual({ message: "Email in use" });
    });
  });

  describe("PATCH /api/users/refresh", () => {
    it("200 refresh tokens", async () => {
      mockRegenerateTokenDataService.mockResolvedValue({
        token: "NEW_ACCESS_TOKEN",
        refreshToken: "NEW_REFRESH_TOKEN",
      });

      const res = await request(app).patch("/api/users/refresh").send({
        refreshToken: "OLD_REFRESH_TOKEN",
      });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        token: "NEW_ACCESS_TOKEN",
        refreshToken: "NEW_REFRESH_TOKEN",
      });

      expect(mockRegenerateTokenDataService).toHaveBeenCalledWith(fakeUser);
    });

    it("400 if refreshToken missing", async () => {
      const res = await request(app).patch("/api/users/refresh").send({});

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        message: expect.stringContaining('"refreshToken" is required'),
      });

      expect(mockRegenerateTokenDataService).not.toHaveBeenCalled();
    });

    it("401 unauthorized flow", async () => {
      mockRegenerateTokenDataService.mockRejectedValue({
        status: 401,
        message: "User is not found",
      });

      const res = await request(app).patch("/api/users/refresh").send({
        refreshToken: "BAD_REFRESH",
      });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ message: "User is not found" });
    });
  });
});
