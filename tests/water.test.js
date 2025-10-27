import { jest } from "@jest/globals";
import request from "supertest";
import express from "express";

// fake user
const fakeUser = {
  id: "user123",
  _id: "user123",
};

// service mocks
const mockAddWaterDataService = jest.fn();
const mockUpdateWaterDataService = jest.fn();
const mockDeleteWaterDateService = jest.fn();
const mockWaterDataPerPeriod = jest.fn();
const mockWaterPerDay = jest.fn();
const mockWaterPerMonth = jest.fn();

// mock authenticate to skip JWT
jest.unstable_mockModule("../middleware/authenticate.js", () => ({
  authenticate: (req, res, next) => {
    req.user = { ...fakeUser };
    next();
  },
}));

// mock waterMiddleware.js validators
jest.unstable_mockModule("../middleware/waterMiddleware.js", () => {
  return (async () => {
    const { waterSchema, querySchema, queryDay, queryMonth } = await import(
      "../schemas/waterSchemas.js"
    );

    const HttpError = (status = 400, message = "Bad Request") => {
      const err = new Error(message);
      err.status = status;
      return err;
    };

    function validateWith(schema, assignBackToReqKey) {
      return (req, res, next) => {
        const { value, error } = schema.validate(
          assignBackToReqKey === "body" ? req.body : req.query
        );
        if (error) {
          return next(HttpError(400, error.message));
        }
        if (assignBackToReqKey === "body") {
          req.body = value;
        } else if (assignBackToReqKey === "query") {
          req.query = value;
        }
        next();
      };
    }

    return {
      checkWaterData: validateWith(waterSchema, "body"),
      validateQuery: validateWith(querySchema, "query"),
      validateDay: validateWith(queryDay, "query"),
      validateMonth: validateWith(queryMonth, "query"),
    };
  })();
});

// mock services
jest.unstable_mockModule("../services/waterServices.js", () => ({
  addWaterDataService: (...args) => mockAddWaterDataService(...args),
  updateWaterDataService: (...args) => mockUpdateWaterDataService(...args),
  deleteWaterDateService: (...args) => mockDeleteWaterDateService(...args),
  waterDataPerPeriod: (...args) => mockWaterDataPerPeriod(...args),
  waterPerDay: (...args) => mockWaterPerDay(...args),
  waterPerMonth: (...args) => mockWaterPerMonth(...args),

  localDate: () => "01.05.2024",
  localTime: () => "12:05",
}));

// import router
const { default: waterRouter } = await import("../routes/waterRouter.js");

// helper  app
function makeTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/water", waterRouter);

  app.use((err, req, res, next) => {
    const { status = 500, message = "Server error" } = err;
    res.status(status).json({ message });
  });

  return app;
}

// tests
describe("Water API", () => {
  let app;

  beforeEach(() => {
    app = makeTestApp();
    jest.clearAllMocks();
  });

  // POST /api/water
  describe("POST /api/water", () => {
    it("201 creates new water record", async () => {
      const fakeRecord = {
        _id: "water1",
        value: 500,
        date: "01.05.2024",
        time: "12:05",
        owner: "user123",
      };

      mockAddWaterDataService.mockResolvedValue(fakeRecord);

      const res = await request(app)
        .post("/api/water")
        .send({ value: 500, date: "01.05.2024", time: "12:05" });

      expect(res.status).toBe(201);
      // controller.addWaterData sends `res.status(201).json(waterData)`
      expect(res.body).toEqual(fakeRecord);

      expect(mockAddWaterDataService).toHaveBeenCalledWith(
        { value: 500, date: "01.05.2024", time: "12:05" },
        { id: "user123", _id: "user123" }
      );
    });

    it("400 for invalid body (negative value)", async () => {
      const res = await request(app).post("/api/water").send({ value: -10 });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        message: expect.stringContaining("positive"),
      });

      expect(mockAddWaterDataService).not.toHaveBeenCalled();
    });
  });

  // PUT /api/water/:id
  describe("PUT /api/water/:id", () => {
    it("200 updates water record", async () => {
      const updated = {
        _id: "water1",
        value: 750,
        date: "01.05.2024",
        time: "13:10",
        owner: "user123",
      };

      mockUpdateWaterDataService.mockResolvedValue(updated);

      const res = await request(app)
        .put("/api/water/674f1a2b3c4d5e6f7a8b9c0d")
        .send({ value: 750 });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(updated);

      expect(mockUpdateWaterDataService).toHaveBeenCalledWith(
        "674f1a2b3c4d5e6f7a8b9c0d",
        { value: 750 },
        { id: "user123", _id: "user123" }
      );
    });

    it("404 if invalid ObjectId", async () => {
      // controller does isValidObjectId and returns 404 directly
      const res = await request(app)
        .put("/api/water/not-valid-id")
        .send({ value: 900 });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: "Not found" });

      expect(mockUpdateWaterDataService).not.toHaveBeenCalled();
    });

    it("404 if service returns null", async () => {
      mockUpdateWaterDataService.mockResolvedValue(null);

      const res = await request(app)
        .put("/api/water/674f1a2b3c4d5e6f7a8b9c0d")
        .send({ value: 900 });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: "Not found" });
    });
  });

  // DELETE /api/water/:id
  describe("DELETE /api/water/:id", () => {
    it("200 deletes water record", async () => {
      const deletedFake = {
        _id: "water1",
        value: 300,
        date: "01.05.2024",
        time: "10:00",
        owner: "user123",
      };

      mockDeleteWaterDateService.mockResolvedValue(deletedFake);

      const res = await request(app).delete(
        "/api/water/674f1a2b3c4d5e6f7a8b9c0d"
      );

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        deletedData: deletedFake,
        message: "Water info was delete",
      });

      expect(mockDeleteWaterDateService).toHaveBeenCalledWith(
        "674f1a2b3c4d5e6f7a8b9c0d",
        { id: "user123", _id: "user123" }
      );
    });

    it("404 if invalid ObjectId", async () => {
      const res = await request(app).delete("/api/water/bad-id");

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: "Not found" });

      expect(mockDeleteWaterDateService).not.toHaveBeenCalled();
    });

    it("404 if service returns null", async () => {
      mockDeleteWaterDateService.mockResolvedValue(null);

      const res = await request(app).delete(
        "/api/water/674f1a2b3c4d5e6f7a8b9c0d"
      );

      // controller throws 404 when !deletedData, and global handler sends {message}
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: "Not found" });
    });
  });

  // GET /api/water/month
  describe("GET /api/water/month", () => {
    it("400 if query invalid", async () => {
      const res = await request(app).get("/api/water/month?year=20&month=13");

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        message: expect.stringContaining("Year must be yyyy"),
      });

      expect(mockWaterPerMonth).not.toHaveBeenCalled();
    });
  });
});
