const userModel = require("../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const tokenBlacklistModel = require("../models/blacklist.model");
const { registerSchema, loginSchema } = require("../validators/auth.validator");

const isProduction = process.env.NODE_ENV === "production";

/* keep the cookie lifetime in sync with the "1d" jwt expiry below */
const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  maxAge: 24 * 60 * 60 * 1000,
};

/* readable by frontend JS (not httpOnly) so it can be echoed back in the
   X-CSRF-Token header, see middlewares/csrf.middleware.js */
const csrfCookieOptions = { ...cookieOptions, httpOnly: false };

function issueSession(res, user) {
  const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
  const csrfToken = crypto.randomBytes(32).toString("hex");

  res.cookie("token", token, cookieOptions);
  res.cookie("csrfToken", csrfToken, csrfCookieOptions);

  /* also handed back in the response body (not just the cookie) because the
     frontend and backend live on different domains in production (Vercel /
     Render) — document.cookie on the frontend's origin can never see a
     cookie set by a different origin, even a non-httpOnly one, so the
     frontend has to get its copy here instead and hold it in memory */
  return csrfToken;
}

/**
 * @name registerUserController
 * @description register a new user, expects username, email and password in the request body
 * @access Public
 */
async function registerUserController(req, res) {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0].message,
    });
  }

  const { username, email, password } = parsed.data;

  const isUserAlreadyExists = await userModel.findOne({
    $or: [{ username }, { email }],
  });

  if (isUserAlreadyExists) {
    return res.status(400).json({
      message: "Account already exists with this email address or username",
    });
  }

  const hash = await bcrypt.hash(password, 10);

  const user = await userModel.create({
    username,
    email,
    password: hash,
  });

  const csrfToken = issueSession(res, user);

  res.status(201).json({
    message: "User registered successfully",
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
    },
    csrfToken,
  });
}

/**
 * @name loginUserController
 * @description login a user, expects email and password in the request body
 * @access Public
 */
async function loginUserController(req, res) {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0].message,
    });
  }

  const { email, password } = parsed.data;

  const user = await userModel.findOne({ email });

  if (!user) {
    return res.status(400).json({
      message: "Invalid email or password",
    });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    return res.status(400).json({
      message: "Invalid email or password",
    });
  }

  const csrfToken = issueSession(res, user);

  res.status(200).json({
    message: "User loggedIn successfully.",
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
    },
    csrfToken,
  });
}

/**
 * @name logoutUserController
 * @description clear token from user cookie and add the token in blacklist
 * @access public
 */
async function logoutUserController(req, res) {
  const token = req.cookies.token;

  if (token) {
    await tokenBlacklistModel.create({ token });
  }

  res.clearCookie("token", cookieOptions);
  res.clearCookie("csrfToken", csrfCookieOptions);

  res.status(200).json({
    message: "User logged out successfully",
  });
}

/**
 * @name getMeController
 * @description get the current logged in user details.
 * @access private
 */
async function getMeController(req, res) {
  const user = await userModel.findById(req.user.id);

  if (!user) {
    return res.status(404).json({
      message: "User not found",
    });
  }

  res.status(200).json({
    message: "User details fetched successfully",
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
    },
    /* the browser still sends this cookie to the backend on every request
       regardless of the frontend's origin, so it's available here even
       though the frontend can't read it itself; handing it back lets the
       frontend re-sync its in-memory copy after a page reload */
    csrfToken: req.cookies.csrfToken,
  });
}

module.exports = {
  registerUserController,
  loginUserController,
  logoutUserController,
  getMeController,
};
