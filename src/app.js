const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/authRoutes");

const app = express();

// Middlewares
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3001", // Allow frontend to connect
  credentials: true, // Allow cookies
}));
app.use(express.json()); // To parse JSON bodies
app.use(cookieParser()); // To parse cookies

// Routes
app.use("/api/v1/users", authRoutes);

// Basic error handling (can be expanded)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

module.exports = app;
