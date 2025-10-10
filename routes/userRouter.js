import express from "express";
import {
  authenticate,
  authenticateRefresh,
} from "../middleware/authenticate.js";
import { validateBody } from "../middleware/validateBody.js";
import { Schemas } from "../schemas/userSchemas.js";
import { errorHandling } from "../helpers/errorHandlingWrapper.js";
import * as controllers from "../controllers/userController.js";

const userRouter = express.Router();

userRouter
  // register new user
  .post(
    "/register",
    validateBody(Schemas.registerSchema),
    errorHandling(controllers.register)
  )

  // login
  .post(
    "/login",
    validateBody(Schemas.loginSchema),
    errorHandling(controllers.login)
  )

  // logout
  .get("/logout", authenticate, errorHandling(controllers.logout))

  // get current user
  .get("/current", authenticate, errorHandling(controllers.current))

  // update user profile
  .patch(
    "/update",
    authenticate,
    validateBody(Schemas.updateUserSchema),
    errorHandling(controllers.updateUser)
  )

  // get new token pair
  .patch(
    "/refresh",
    authenticateRefresh,
    validateBody(Schemas.refreshSchema),
    errorHandling(controllers.refreshTokens)
  );

export default userRouter;

/**
 * @swagger
 * tags:
 *   - name: User API
 *     description: Routes related to user registration, authentication, profile management, and token refresh.
 *
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: Jessica Smith
 *         email:
 *           type: string
 *           format: email
 *           example: jessica.smith@test.com
 *         gender:
 *           type: string
 *           enum: [female, male]
 *           example: male
 *         weight:
 *           type: number
 *           example: 75
 *         dailyActivityTime:
 *           type: string
 *           example: "01:30"
 *         dailyWaterNorm:
 *           type: number
 *           example: 2.5
 *         avatarURL:
 *           type: string
 *           format: uri
 *           example: https://cdn.example.com/avatars/u123.png
 *
 *     RegisterRequest:
 *       type: object
 *       required: [email, password]
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: jessica.smith@test.com
 *         password:
 *           type: string
 *           example: "P@ssw0rd!"
 *         name:
 *           type: string
 *           example: Jessica Smith
 *
 *     LoginRequest:
 *       type: object
 *       required: [email, password]
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: jessica.smith@test.com
 *         password:
 *           type: string
 *           example: "P@ssw0rd!"
 *
 *     UpdateUserRequest:
 *       type: object
 *       description: User can update one or multiple profile fields. Empty fields are ignored.
 *       properties:
 *         name:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         gender:
 *           type: string
 *           enum: [female, male]
 *         weight:
 *           type: number
 *         dailyActivityTime:
 *           type: string
 *         dailyWaterNorm:
 *           type: number
 *         avatarURL:
 *           type: string
 *
 *     RefreshRequest:
 *       type: object
 *       required: [refreshToken]
 *       properties:
 *         refreshToken:
 *           type: string
 *           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *
 *     AuthResponse:
 *       type: object
 *       properties:
 *         user:
 *           $ref: '#/components/schemas/User'
 *         token:
 *           type: string
 *           description: Access JWT
 *         refreshToken:
 *           type: string
 *           description: Refresh token
 *
 *     Tokens:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *         refreshToken:
 *           type: string
 *
 * /api/users/register:
 *   post:
 *     summary: Register a new user
 *     description: Public endpoint to create a new account.
 *     tags: ["User API"]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       '201':
 *         description: Successfully registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       '409':
 *         description: Email already in use
 *       '500':
 *         description: Internal server error
 *
 * /api/users/login:
 *   post:
 *     summary: Log in
 *     description: Authenticate a user and receive access & refresh tokens.
 *     tags: ["User API"]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       '200':
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       '401':
 *         description: Invalid credentials
 *
 * /api/users/logout:
 *   get:
 *     summary: Log out
 *     description: Invalidates the current user's tokens.
 *     tags: ["User API"]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '204':
 *         description: Successfully logged out
 *       '401':
 *         description: Unauthorized
 *
 * /api/users/current:
 *   get:
 *     summary: Get current user
 *     description: Returns current authenticated user's information.
 *     tags: ["User API"]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: User retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       '401':
 *         description: Unauthorized
 *
 * /api/users/update:
 *   patch:
 *     summary: Update user profile
 *     description: Update user profile fields (non-empty fields only).
 *     tags: ["User API"]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserRequest'
 *     responses:
 *       '200':
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       '400':
 *         description: Invalid request data
 *       '401':
 *         description: Unauthorized
 *       '409':
 *         description: Email already in use
 *       '500':
 *         description: Internal server error
 *
 * /api/users/refresh:
 *   patch:
 *     summary: Refresh tokens
 *     description: Generate a new access and refresh token pair using a valid refresh token.
 *     tags: ["User API"]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshRequest'
 *     responses:
 *       '200':
 *         description: Tokens refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tokens'
 *       '401':
 *         description: Unauthorized
 */
