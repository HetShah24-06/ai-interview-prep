const rateLimit = require("express-rate-limit");

/* brute-force guard on login/register only, not on every route */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts, please try again later." },
});

/* each call costs a Gemini request (money + quota) and ~10s of compute,
   so this is tighter than the auth limiter */
const interviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many report generations, please try again later." },
});

module.exports = { authLimiter, interviewLimiter };
