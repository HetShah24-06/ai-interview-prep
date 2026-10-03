const { z } = require("zod");

const updateEmailSchema = z.object({
  newEmail: z
    .string({ required_error: "New email is required" })
    .trim()
    .toLowerCase()
    .email("Please provide a valid email address"),
  currentPassword: z
    .string({ required_error: "Current password is required" })
    .min(1, "Current password is required"),
});

const updatePasswordSchema = z.object({
  currentPassword: z
    .string({ required_error: "Current password is required" })
    .min(1, "Current password is required"),
  newPassword: z
    .string({ required_error: "New password is required" })
    .min(6, "New password must be at least 6 characters"),
});

module.exports = { updateEmailSchema, updatePasswordSchema };
