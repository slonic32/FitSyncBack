import request from "supertest";
import express from "express";

// mock these before importing the router
jest.unstable_mockModule("../middleware/authenticate.js", () => ({
  authenticate: (req, res, next) => {
    // fake logged-in user
    req.user = { id: "user123" };
    next();
  },
}));

// mock service layer
const mockAddWaterDataService = jest.fn();
const mockUpdateWaterDataService = jest.fn();
const mockDeleteWaterDateService = jest.fn();
const mockWaterDataPerPeriod = jest.fn();
const mockWaterPerDay = jest.fn();
const mockWaterPerMonth = jest.fn();

jest.unstable_mockModule("../services/waterServices.js", () => ({
  addWaterDataService: (...args) => mockAddWaterDataService(...args),
  updateWaterDataService: (...args) => mockUpdateWaterDataService(...args),
  deleteWaterDateService: (...args) => mockDeleteWaterDateService(...args),
  waterDataPerPeriod: (...args) => mockWaterDataPerPeriod(...args),
  waterPerDay: (...args) => mockWaterPerDay(...args),
  waterPerMonth: (...args) => mockWaterPerMonth(...args),
}));

// import router
const { default: waterRouter } = await import("../routes/waterRouter.js");

function makeTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/water", waterRouter);

  // global error handler
  app.use((err, req, res, next) => {
    const { status = 500, message = "Server error" } = err;
    res.status(status).json({ message });
  });

  return app;
}

describe("Water API", () => {
  let app;

  beforeEach(() => {
    app = makeTestApp();
    jest.clearAllMocks();
  });

  // POST /api/water
  describe("POST /api/water", () => {
    it("should create new water record (201)", async () => {
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
      expect(res.body).toEqual(fakeRecord);
      expect(mockAddWaterDataService).toHaveBeenCalledWith(
        { value: 500, date: "01.05.2024", time: "12:05" },
        { id: "user123" }
      );
    });

    it("should return 400 if body fails Joi validation", async () => {
      // value must be positive integer, here it's -10
      const res = await request(app).post("/api/water").send({ value: -10 });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        message: expect.stringContaining("positive"),
      });
      // service should not be called if validation fails
      expect(mockAddWaterDataService).not.toHaveBeenCalled();
    });
  });

  // PUT /api/water/:id
  describe("PUT /api/water/:id", () => {
    it("should update water record (200)", async () => {
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
        { id: "user123" }
      );
    });

    it("should return 404 if id is not valid ObjectId", async () => {
      // controller checks isValidObjectId and immediately returns 404
      const res = await request(app)
        .put("/api/water/not-valid-id")
        .send({ value: 900 });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: "Not found" });

      // service should not be called on invalid ObjectId
      expect(mockUpdateWaterDataService).not.toHaveBeenCalled();
    });

    it("should return 404 if service returns null", async () => {
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
    it("should delete water record (200)", async () => {
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
        { id: "user123" }
      );
    });

    it("should return 404 for invalid ObjectId", async () => {
      const res = await request(app).delete("/api/water/bad-id");

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: "Not found" });

      expect(mockDeleteWaterDateService).not.toHaveBeenCalled();
    });

    it("should return 404 if service returns null", async () => {
      mockDeleteWaterDateService.mockResolvedValue(null);

      const res = await request(app).delete(
        "/api/water/674f1a2b3c4d5e6f7a8b9c0d"
      );

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: "Not found" });
    });
  });

  // GET /api/water (period data)
  describe("GET /api/water?year=&month=&day=", () => {
    it("should return period data with totalValue (200)", async () => {
      const fakeResult = {
        waterData: [
          { value: 250, date: "01.05.2024", time: "09:00" },
          { value: 500, date: "01.05.2024", time: "12:00" },
        ],
        totalValue: 750,
      };

      // service returns { waterData, totalValue }
      mockWaterDataPerPeriod.mockResolvedValue(fakeResult);

      const res = await request(app).get(
        "/api/water?year=2024&month=05&day=01"
      );

      expect(res.status).toBe(200);
      // controller returns { periodData, totalValue }
      expect(res.body).toEqual({
        periodData: fakeResult,
        totalValue: undefined,
      });

      expect(mockWaterDataPerPeriod).toHaveBeenCalledWith("2024", "05", "01", {
        id: "user123",
      });
    });

    it("should 400 if query is invalid", async () => {
      // missing required year/month
      const res = await request(app).get("/api/water?day=01");

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        message: expect.stringContaining("Parameter is required"),
      });

      expect(mockWaterDataPerPeriod).not.toHaveBeenCalled();
    });

    it("should 404 if service returns empty", async () => {
      mockWaterDataPerPeriod.mockResolvedValue([]);

      const res = await request(app).get(
        "/api/water?year=2024&month=05&day=02"
      );

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: "Not found" });
    });
  });

  // GET /api/water/day
  describe("GET /api/water/day", () => {
    it("should return all entries for given day (200)", async () => {
      const fakeDayData = [
        { value: 200, date: "01.05.2024", time: "08:00", owner: "user123" },
        { value: 300, date: "01.05.2024", time: "11:00", owner: "user123" },
      ];

      mockWaterPerDay.mockResolvedValue(fakeDayData);

      const res = await request(app).get(
        "/api/water/day?year=2024&month=05&day=01"
      );

      expect(res.status).toBe(200);
      expect(res.body).toEqual(fakeDayData);

      expect(mockWaterPerDay).toHaveBeenCalledWith("2024", "05", "01", {
        id: "user123",
      });
    });

    it("should 400 if query invalid (bad month etc.)", async () => {
      const res = await request(app).get(
        "/api/water/day?year=2024&month=99&day=01"
      );

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        message: expect.stringContaining("Month must be mm"),
      });

      expect(mockWaterPerDay).not.toHaveBeenCalled();
    });
  });

  // GET /api/water/month
  describe("GET /api/water/month", () => {
    it("should return aggregated array for the month (200)", async () => {
      // service returns Array(32).fill(0) etc.
      const fakeMonthData = [0, 800, 500, 0, 0, 1200]; // etc.
      mockWaterPerMonth.mockResolvedValue(fakeMonthData);

      const res = await request(app).get("/api/water/month?year=2024&month=05");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(fakeMonthData);

      expect(mockWaterPerMonth).toHaveBeenCalledWith("2024", "05", {
        id: "user123",
      });
    });

    it("should 400 if query invalid", async () => {
      const res = await request(app).get("/api/water/month?year=20&month=13");

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        message: expect.stringContaining("Year must be yyyy"),
      });

      expect(mockWaterPerMonth).not.toHaveBeenCalled();
    });
  });
});
