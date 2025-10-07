import express from "express";
import morgan from "morgan";
import cors from "cors";

import dotenv from "dotenv";
import mongoose from "mongoose";
import userRouter from "./routes/userRouter.js";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./helpers/swagger.js";

// read environment variables
dotenv.config();

// create server app
const app = express();

// connect to the database
mongoose
  .connect(process.env.DB_URL)
  .then(() => console.log("Database connection successful"))
  .catch(error => {
    console.log(error.message);
    process.exit(1);
  });

// parse query parameters
app.use(morgan("tiny"));

// enable trans domain requests
app.use(cors());

app.use(express.json());

// serve static files from public folder
app.use(express.static("public"));

// base path
const pathPrefix = "/api";

// path for API documentation
app.use(`${pathPrefix}/docs`, swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// path for user management
app.use(`${pathPrefix}/users`, userRouter);

// not found response
app.use((_, res) => {
  res.status(404).json({ message: "Route not found" });
});

// internal error response
app.use((err, req, res, next) => {
  const { status = 500, message = "Server error" } = err;
  res.status(status).json({ message });
});

// set port to listen
const port = +process.env.PORT || 3000;

// start server
app.listen(port, () => {
  console.log(`Server is running. Use our API on port: ${port}`);
});
