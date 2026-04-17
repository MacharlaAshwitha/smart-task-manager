import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import teamRoutes from "./routes/teamRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import activityRoutes from "./routes/activityRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";

const app = express();
const PORT = process.env.PORT || 5000;

/*
  ✅ CORS FIX:
  Allow both local + deployed frontend
*/
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://macharlaashwitha.github.io"
    ],
    credentials: true,
  })
);

app.use(express.json());

/*
  ✅ Health check route
*/
app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "smart-task-manager-api" });
});

/*
  ✅ Routes
*/
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/comments", commentRoutes);

/*
  ✅ Global Error Handler
*/
app.use((err, req, res, next) => {
  console.error(err);
  const status = Number(err.statusCode || err.status) || 500;
  const message = err.message || "Internal server error";
  res.status(status).json({ message });
});

/*
  ✅ Start server
*/
async function start() {
  try {
    await connectDB();

    if (!process.env.JWT_SECRET) {
      console.warn(
        "⚠️ WARNING: JWT_SECRET is not set. Auth may fail."
      );
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (e) {
    console.error("❌ Failed to start:", e.message);
    process.exit(1);
  }
}

start();