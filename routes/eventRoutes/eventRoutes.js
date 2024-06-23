const express = require("express");
const { Event } = require("../../models/Event");
const { getNearbyUsersFromRedis } = require("../../utils/clustering");
const eventRoutes = express.Router();
const eventRoutesIo = (io) => {
    eventRoutes.post("/create", async (req, res) => {
        try {
            const { createEventValue, userDetails } = req.body;
            const event = new Event({
                title: createEventValue.title,
                description: createEventValue.description,
                date: createEventValue.selectedDate,
                startTime: createEventValue.startTime,
                endTime: createEventValue.endTime,
                radius: createEventValue.sliderKm,
                creator: userDetails.userId,
                approvalRequired: createEventValue.isEnabled,
                location: {
                    type: "Point",
                    coordinates: [
                        userDetails.coordinates.longitude,
                        userDetails.coordinates.latitude,
                    ],
                },
            });
            const savedEvent = await event.save();
            const currentActiveUsers = await getNearbyUsersFromRedis(
                userDetails.coordinates.latitude,
                userDetails.coordinates.longitude,
                createEventValue.sliderKm
            );
            currentActiveUsers.forEach(async (user) => {
                io.to(user.socketId).emit("realTimeNewEventUpdate", {
                    event: savedEvent,
                });
            });
            res.status(201).json(savedEvent);
        } catch (e) {
            res.status(500).json({
                error: "An error occurred while creating the event.",
                e,
            });
        }
    });
    return eventRoutes;
};

module.exports = { eventRoutes: eventRoutesIo };
