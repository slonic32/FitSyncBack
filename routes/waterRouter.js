import express from "express";
import {
  addWaterData,
  deleteWaterData,
  getWaterDataPerPeriod,
  getWaterPerDay,
  getWaterPerMonth,
  updateWaterData,
} from "../controllers/waterController.js";
import {
  checkWaterData,
  validateDay,
  validateMonth,
  validateQuery,
} from "../middleware/waterMiddleware.js";
import { authenticate } from "../middleware/authenticate.js";

const waterRouter = express.Router();

waterRouter.use(authenticate);
waterRouter
  .post("/", checkWaterData, addWaterData)
  .put("/:id", checkWaterData, updateWaterData)
  .delete("/:id", deleteWaterData)
  .get("/", validateQuery, getWaterDataPerPeriod)
  .get("/day", validateDay, getWaterPerDay)
  .get("/month", validateMonth, getWaterPerMonth);

export default waterRouter;

/**
 * @swagger
 * tags:
 *   name: Water
 *   description: API endpoints for tracking daily water intake
 *
 * /api/water:
 *   post:
 *     summary: Add water record
 *     description: Create a new water entry for the authenticated user.
 *     tags: [Water]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - value
 *             properties:
 *               value:
 *                 type: number
 *                 description: Amount of water in milliliters.
 *                 example: 1500
 *               date:
 *                 type: string
 *                 description: Optional date in format dd.mm.yyyy
 *                 example: "01.05.2024"
 *               time:
 *                 type: string
 *                 description: Optional time in format hh:mm
 *                 example: "12:05"
 *     responses:
 *       201:
 *         description: Water record successfully created.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Water'
 *       401:
 *         description: Unauthorized — missing or invalid token.
 *       500:
 *         description: Server error.
 *
 * /api/water/{id}:
 *   put:
 *     summary: Update water record
 *     description: Modify an existing water entry by ID.
 *     tags: [Water]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the water entry.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               value:
 *                 type: number
 *                 description: Updated water value (ml)
 *                 example: 2000
 *     responses:
 *       200:
 *         description: Water record updated.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WaterDataUpdate'
 *       404:
 *         description: Record not found.
 *       401:
 *         description: Unauthorized.
 *
 *   delete:
 *     summary: Delete water record
 *     description: Remove a water entry by ID.
 *     tags: [Water]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the water entry.
 *     responses:
 *       200:
 *         description: Water record deleted.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WaterDataDelete'
 *       404:
 *         description: Record not found.
 *       401:
 *         description: Unauthorized.
 *
 * /api/water/day:
 *   get:
 *     summary: Get daily water data
 *     description: Retrieve all water entries for a specific date.
 *     tags: [Water]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         required: true
 *         schema:
 *           type: string
 *         description: Year (yyyy)
 *         example: "2024"
 *       - in: query
 *         name: month
 *         required: true
 *         schema:
 *           type: string
 *         description: Month (mm)
 *         example: "05"
 *       - in: query
 *         name: day
 *         required: true
 *         schema:
 *           type: string
 *         description: Day (dd)
 *         example: "01"
 *     responses:
 *       200:
 *         description: List of daily water entries.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/WaterDataPerDay'
 *
 * /api/water/month:
 *   get:
 *     summary: Get monthly water data
 *     description: Retrieve aggregated water data per day for the specified month.
 *     tags: [Water]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         required: true
 *         schema:
 *           type: string
 *         description: Year (yyyy)
 *         example: "2024"
 *       - in: query
 *         name: month
 *         required: true
 *         schema:
 *           type: string
 *         description: Month (mm)
 *         example: "05"
 *     responses:
 *       200:
 *         description: Aggregated water values by day.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/WaterDataPerMonth'
 *
 * components:
 *   schemas:
 *     Water:
 *       type: object
 *       properties:
 *         value:
 *           type: number
 *           example: 1500
 *         date:
 *           type: string
 *           example: "01.05.2024"
 *         time:
 *           type: string
 *           example: "12:05"
 *         owner:
 *           type: string
 *           description: ID of the user who owns this record.
 *
 *     WaterDataUpdate:
 *       type: object
 *       properties:
 *         value:
 *           type: number
 *           example: 2000
 *         date:
 *           type: string
 *           example: "01.05.2024"
 *         time:
 *           type: string
 *           example: "14:30"
 *         owner:
 *           type: string
 *
 *     WaterDataDelete:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "Water info was delete"
 *
 *     WaterDataPerDay:
 *       type: object
 *       properties:
 *         value:
 *           type: number
 *           example: 250
 *         date:
 *           type: string
 *           example: "01.05.2024"
 *         time:
 *           type: string
 *           example: "12:05"
 *         owner:
 *           type: string
 *
 *     WaterDataPerMonth:
 *       type: number
 *       example: 3000
 */
