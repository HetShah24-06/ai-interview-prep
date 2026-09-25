const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const multer = require("multer");

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);

/* require all the routes here */
const authRouter = require("./routes/auth.routes");
const interviewRouter = require("./routes/interview.routes");

/* using all the routes here */
app.use("/api/auth", authRouter);
app.use("/api/interview", interviewRouter);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

/* central error handler, keeps every failure as json instead of an html stack */
app.use((err, req, res, next) => {
  console.error(err);

  if (err.name === "ValidationError") {
    return res.status(400).json({ message: err.message });
  }

  if (err.code === 11000) {
    return res.status(400).json({
      message: "Account already exists with this email address or username",
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({ message: "Invalid id" });
  }

  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: err.message });
  }

  /* upstream gemini failures, do not pass their status through as ours */
  if (err.name === "ApiError") {
    const outOfQuota = err.status === 402 || err.status === 429;
    return res.status(503).json({
      message: outOfQuota
        ? "The AI service is out of quota, please try again later."
        : "The AI service could not complete the request.",
    });
  }

  res.status(err.status || 500).json({
    message: err.expose ? err.message : "Something went wrong",
  });
});

module.exports = app;
