const mongoose = require("mongoose");

async function connectToBD() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");
  } catch (err) {
    /* no point serving requests that will all fail on the first query */
    console.error("Error connecting to MongoDB:", err);
    process.exit(1);
  }
}

module.exports = connectToBD;
