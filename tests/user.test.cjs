import request from "supertest";
import express from "express";

// ===== Mock middlewares =====

// We'll fake authenticate
const fakeUser = {
  _id: "u123",
  id: "u123", // some code uses .id
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

jest.unstable_mockModule("../middleware/authenticate.js", () => ({
  authenticate: (req, res, next) => {
    req.user = { ...fakeUser };
    next();
  },
  authenticateRefresh: (req, res, next) => {
    // refresh route uses body.refreshToken normally
    req.user = { ...fakeUser };
    next();
  },
}));

// uploadImage normally parses multipart/form-data and writes file
// in tests we just skip and do nothing
jest.unstable_mockModule("../middleware/imgUploader.js", () => ({
  uploadImage: (req, res, next) => {
    // pretend no file was uploaded
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

// ===== Mock service layer =====
const mockRegisterDataService = jest.fn();
const mockLoginDataService = jest.fn();
const mockLogoutUserDataService = jest.fn();
const mockRegenerateTokenDataService = jest.fn();
const mockSafeUserCloneDataService = jest.fn();
const mockUpdateUserDataService = jest.fn();

jest.unstable_mockModule("../services/userServices.js", () => ({
  registerDataService: (...args) => mockRegisterDataService(...args),
  loginDataService: (...args) => mockLoginDataService(...args),
  logoutUserDataService: (...args) => mockLogoutUserDataService(...args),
  regenerateTokenDataService: (...args) =>
    mockRegenerateTokenDataService(...args),
  updateUserDataService: (...args) => mockUpdateUserDataService(...args),
  safeUserCloneDataService: (...args) => mockSafeUserCloneDataService(...args),
}));

// resizeImg is used in updateUser if req.file exists.
// We'll mock it so no Jimp/fs needed.
jest.unstable_mockModule("../services/imgServices.js", () => ({
  resizeImg: jest.fn(async () => "avatars/newAvatar.png"),
}));

// after all mocks, import router (and controller, which pulls mocks)
const { default: userRouter } = await import("../routes/userRouter.js");

// helper to build a tiny express app for tests
function makeTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/users", userRouter);

  // global error handler similar to app.js
  app.use((err, req, res, next) => {
    const { status = 500, message = "Server error" } = err;
    res.status(status).json({ message });
  });

  return app;
}

describe("User API", () => {
  let app;

  beforeEach(() => {
    app = makeTestApp();
    jest.clearAllMocks();
  });

  // =========================
  // POST /api/users/register
  // =========================
  describe("POST /api/users/register", () => {
    it("should register new user (201)", async () => {
      const createdUser = {
        ...fakeUser,
        token: "NEW_ACCESS",
        refreshToken: "NEW_REFRESH",
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

    it("should return 400 if body invalid (no password)", async () => {
      const res = await request(app).post("/api/users/register").send({
        email: "test@example.com",
      });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        message: expect.stringContaining('"password" is required'),
      });

      expect(mockRegisterDataService).not.toHaveBeenCalled();
    });

    it("should return 409 if email already in use", async () => {
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

  // =========================
  // POST /api/users/login
  // =========================
  describe("POST /api/users/login", () => {
    it("should login user (200)", async () => {
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

    it("should return 400 for invalid body (no email)", async () => {
      const res = await request(app).post("/api/users/login").send({
        password: "12345",
      });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        message: expect.stringContaining('"email" is required'),
      });

      expect(mockLoginDataService).not.toHaveBeenCalled();
    });

    it("should return 401 for wrong password", async () => {
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

  // =========================
  // GET /api/users/logout
  // =========================
  describe("GET /api/users/logout", () => {
    it("should logout user (204)", async () => {
      mockLogoutUserDataService.mockResolvedValue(undefined);

      const res = await request(app).get("/api/users/logout");

      expect(res.status).toBe(204);
      expect(res.body).toEqual({}); // no content

      expect(mockLogoutUserDataService).toHaveBeenCalledWith(fakeUser);
    });
  });

  // =========================
  // GET /api/users/current
  // =========================
  describe("GET /api/users/current", () => {
    it("should return current user (200)", async () => {
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

  // =========================
  // PATCH /api/users/update
  // =========================
  describe("PATCH /api/users/update", () => {
    it("should update user (200) with body only", async () => {
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

    it("should 400 if body fails schema (wrong gender)", async () => {
      const res = await request(app)
        .patch("/api/users/update")
        .send({ gender: "alien" }); // not in [female, male]

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        message: expect.stringContaining('"gender" must be one of'),
      });

      expect(mockUpdateUserDataService).not.toHaveBeenCalled();
    });

    it("should handle avatar upload path: if req.file exists, controller tries resizeImg + updateUserDataService", async () => {
      // we'll re-make the app for this case because we need req.file.
      // We'll override uploadImage mock JUST for this test.
      const localApp = express();
      localApp.use(express.json());

      // custom uploadImage mock to simulate file present
      const uploadImageMock = (req, res, next) => {
        req.file = {
          path: "tmp/file.png",
          filename: "file.png",
        };
        next();
      };

      // import controller AFTER all base mocks
      const controllers = await import("../controllers/userController.js");
      const { validateBody } = await import("../middleware/validateBody.js");
      const { Schemas } = await import("../schemas/userSchemas.js");

      const miniRouter = express.Router();
      miniRouter.patch(
        "/update",
        // fake authenticate
        (req, res, next) => {
          req.user = { ...fakeUser };
          next();
        },
        uploadImageMock, // pretend we got file
        validateBody(Schemas.updateUserSchema),
        async (req, res, next) => {
          try {
            await controllers.updateUser(req, res);
          } catch (e) {
            next(e);
          }
        }
      );
      localApp.use("/api/users", miniRouter);
      localApp.use((err, req, res, next) => {
        const { status = 500, message = "Server error" } = err;
        res.status(status).json({ message });
      });

      const updatedWithAvatar = {
        ...fakeUser,
        avatarURL: "avatars/newAvatar.png",
      };

      mockUpdateUserDataService.mockResolvedValue(updatedWithAvatar);
      mockSafeUserCloneDataService.mockReturnValue({
        email: updatedWithAvatar.email,
        name: updatedWithAvatar.name,
        gender: updatedWithAvatar.gender,
        weight: updatedWithAvatar.weight,
        dailyActivityTime: updatedWithAvatar.dailyActivityTime,
        dailyWaterNorm: updatedWithAvatar.dailyWaterNorm,
        avatarURL: updatedWithAvatar.avatarURL,
      });

      const res = await request(localApp).patch("/api/users/update").send({}); // body can be empty, avatar still updates

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        user: {
          email: "test@example.com",
          name: "Test User",
          gender: "female",
          weight: 70,
          dailyActivityTime: "01:00",
          dailyWaterNorm: 2,
          avatarURL: "avatars/newAvatar.png",
        },
      });

      expect(mockUpdateUserDataService).toHaveBeenCalledWith(fakeUser, {
        avatarURL: "avatars/newAvatar.png",
      });
    });

    it("should return 409 if email in use", async () => {
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

  // =========================
  // PATCH /api/users/refresh
  // =========================
  describe("PATCH /api/users/refresh", () => {
    it("should refresh tokens (200)", async () => {
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

    it("should 400 if refreshToken missing in body", async () => {
      const res = await request(app).patch("/api/users/refresh").send({});

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        message: expect.stringContaining('"refreshToken" is required'),
      });

      expect(mockRegenerateTokenDataService).not.toHaveBeenCalled();
    });

    it("should 401 if regenerateTokenDataService throws unauthorized", async () => {
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
