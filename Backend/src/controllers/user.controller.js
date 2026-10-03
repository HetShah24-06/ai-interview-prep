const bcrypt = require("bcryptjs");
const userModel = require("../models/user.model");
const { extractPdfText } = require("../utils/pdf.util");
const { updateEmailSchema, updatePasswordSchema } = require("../validators/user.validator");

/**
 * @description Get the logged-in user's profile, including saved-resume metadata
 * (filename + last-updated date, not the file content itself).
 */
async function getProfileController(req, res) {
  const user = await userModel
    .findById(req.user.id)
    .select("+resumeFileName +resumeUpdatedAt");

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.status(200).json({
    message: "Profile fetched successfully.",
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      resume: user.resumeFileName
        ? { fileName: user.resumeFileName, updatedAt: user.resumeUpdatedAt }
        : null,
    },
  });
}

/**
 * @description Save (or replace) the user's base resume. Stores the raw PDF
 * for later download and the extracted text for reuse in report generation.
 */
async function uploadResumeController(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: "Please attach a PDF file." });
  }

  const resumeText = await extractPdfText(req.file.buffer);

  await userModel.findByIdAndUpdate(req.user.id, {
    resumeFile: req.file.buffer,
    resumeFileName: req.file.originalname,
    resumeText,
    resumeUpdatedAt: new Date(),
  });

  res.status(200).json({
    message: "Resume saved to your profile.",
    resume: { fileName: req.file.originalname, updatedAt: new Date() },
  });
}

/**
 * @description Remove the saved resume from the user's profile.
 */
async function deleteResumeController(req, res) {
  await userModel.findByIdAndUpdate(req.user.id, {
    $unset: { resumeFile: 1, resumeFileName: 1, resumeText: 1, resumeUpdatedAt: 1 },
  });

  res.status(200).json({ message: "Saved resume removed." });
}

/**
 * @description Download the user's saved resume PDF.
 */
async function downloadResumeController(req, res) {
  const user = await userModel
    .findById(req.user.id)
    .select("+resumeFile +resumeFileName");

  if (!user?.resumeFile) {
    return res.status(404).json({ message: "No saved resume found." });
  }

  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${user.resumeFileName}"`,
  });
  res.send(user.resumeFile);
}

/**
 * @description Change the logged-in user's email. Requires the current
 * password so a hijacked session cookie alone can't lock the real owner out.
 */
async function updateEmailController(req, res) {
  const parsed = updateEmailSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const { newEmail, currentPassword } = parsed.data;

  const user = await userModel.findById(req.user.id);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

  if (!isPasswordValid) {
    return res.status(400).json({ message: "Current password is incorrect." });
  }

  const emailTaken = await userModel.findOne({ email: newEmail, _id: { $ne: user._id } });

  if (emailTaken) {
    return res.status(400).json({
      message: "Account already exists with this email address",
    });
  }

  user.email = newEmail;
  await user.save();

  res.status(200).json({
    message: "Email updated successfully.",
    user: { id: user._id, username: user.username, email: user.email },
  });
}

/**
 * @description Change the logged-in user's password. Requires the current
 * password for the same reason as email changes.
 */
async function updatePasswordController(req, res) {
  const parsed = updatePasswordSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const { currentPassword, newPassword } = parsed.data;

  const user = await userModel.findById(req.user.id);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

  if (!isPasswordValid) {
    return res.status(400).json({ message: "Current password is incorrect." });
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  res.status(200).json({ message: "Password updated successfully." });
}

module.exports = {
  getProfileController,
  uploadResumeController,
  deleteResumeController,
  downloadResumeController,
  updateEmailController,
  updatePasswordController,
};
