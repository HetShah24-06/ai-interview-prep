const rateLimit = require("express-rate-limit");

/* brute-force guard on login/register only, not on every route */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts, please try again later." },
});

module.exports = { authLimiter };
