const mongoose = require("mongoose");
const { model } = require("mongoose");

const postSchema = new mongoose.Schema({
    message: { type: String, required: true },
    createAt: { type: Date, default: Date.now },
    maxDistance: { type: Number, required: true },
    location: {
        type: { type: String, enum: ["Point"], required: true },
        coordinates: {
            type: [Number],
            required: true,
        },
    },
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true,
    },
});

postSchema.index({ location: "2dsphere" }); // Create a 2dsphere index on the location field
module.exports = model("posts", postSchema);
