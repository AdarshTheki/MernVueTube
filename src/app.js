import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

// Setting up CORS middleware with specified origin and credentials
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));

// Enabling JSON and URL-encoded request body parsing with specified limits
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

//  Serving static files from the 'public' directory
app.use(express.static("public"));

// Adding cookie-parser middleware
app.use(cookieParser());

// Importing routes
import userRouter from "./routes/user.router.js";
import videoRouter from "./routes/videoRouter.router.js";

// Routes Deceleration
// http://localhost:8000/api/v1/users
app.use("/api/v1/users", userRouter);
app.use("/api/v1/videos", videoRouter);

export { app };
