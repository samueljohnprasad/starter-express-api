const mongoose = require("mongoose");
const { model } = require("mongoose");

const postSchema = new mongoose.Schema({
  userName: { type: String, required: true },
  message: { type: String, required: true },
  createAt: { type: Date, required: true },
  maxDistance: { type: String, required: true },
  userId: { type: String, required: true },
  location: {
    type: { type: String, required: true },
    coordinates: [Number],
  },
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
});

postSchema.index({ location: "2dsphere" }); // Create a 2dsphere index on the location field

module.exports = model("posts", postSchema);
