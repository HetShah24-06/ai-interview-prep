const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const userController = require("../controllers/user.controller");
const upload = require("../middlewares/file.middleware");
const { csrfProtection } = require("../middlewares/csrf.middleware");
const { authLimiter } = require("../middlewares/rateLimit.middleware");

const userRouter = express.Router();

/**
 * @route GET /api/users/profile
 * @description get the logged-in user's profile and saved-resume metadata
 * @access private
 */
userRouter.get("/profile", authMiddleware.authUser, userController.getProfileController);

/**
 * @route PUT /api/users/resume
 * @description save or replace the user's base resume
 * @access private
 */
userRouter.put(
  "/resume",
  authMiddleware.authUser,
  csrfProtection,
  upload.single("resume"),
  userController.uploadResumeController,
);

/**
 * @route DELETE /api/users/resume
 * @description remove the saved resume from the user's profile
 * @access private
 */
userRouter.delete(
  "/resume",
  authMiddleware.authUser,
  csrfProtection,
  userController.deleteResumeController,
);

/**
 * @route GET /api/users/resume
 * @description download the user's saved resume PDF
 * @access private
 */
userRouter.get("/resume", authMiddleware.authUser, userController.downloadResumeController);

/**
 * @route PUT /api/users/email
 * @description change the logged-in user's email, requires current password
 * @access private
 */
userRouter.put(
  "/email",
  authMiddleware.authUser,
  csrfProtection,
  authLimiter,
  userController.updateEmailController,
);

/**
 * @route PUT /api/users/password
 * @description change the logged-in user's password, requires current password
 * @access private
 */
userRouter.put(
  "/password",
  authMiddleware.authUser,
  csrfProtection,
  authLimiter,
  userController.updatePasswordController,
);

module.exports = userRouter;
