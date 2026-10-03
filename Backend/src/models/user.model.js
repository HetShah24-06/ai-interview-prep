const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: [true, "username already taken"],
    required: true,
  },

  email: {
    type: String,
    unique: [true, "Account already exists with this email address"],
    required: true,
  },

  password: {
    type: String,
    required: true,
  },

  /* the saved base resume, reused across report generations so the user
     doesn't have to re-upload it every time. excluded from default
     queries (select: false) since login/get-me never need it and it can
     be a few MB of binary data */
  resumeFile: {
    type: Buffer,
    select: false,
  },
  resumeFileName: {
    type: String,
    select: false,
  },
  resumeText: {
    type: String,
    select: false,
  },
  resumeUpdatedAt: {
    type: Date,
    select: false,
  },
});

const userModel = mongoose.model("users", userSchema);

module.exports = userModel;
