const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    location: {
        type: {
            type: String,
            enum: ["Point"],
            required: true,
        },
        coordinates: { type: [Number], required: true },
    },
    radius: { type: Number, required: true },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    photos: [{ type: String }],
    approvalRequired: { type: Boolean, default: false },
    chat: [
        {
            user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            message: String,
            createdAt: { type: Date, default: Date.now },
        },
    ],
    createdAt: { type: Date, default: Date.now },
});

eventSchema.index({ location: "2dsphere" });

const Event = mongoose.model("Event", eventSchema);

module.exports = { Event };
