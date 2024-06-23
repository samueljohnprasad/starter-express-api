const express = require("express");
const userRoutes = express.Router();
var jwt = require("jsonwebtoken");
const User = require("../../models/User");
const { cartoonNames } = require("../../helpers");
const { SECRET_KEY } = require("../../utils/constants");
const { logger } = require("../../utils/logger");

userRoutes.post("/shop", async (req, res) => {
    try {
        const { userName, latitude, longitude } = req.body; // Assuming the request body contains the driver's name, latitude, and longitude
        const user = new User({
            userName,
            location: {
                type: "Point",
                coordinates: [longitude, latitude],
            },
        });

        const savedUser = await user.save();

        res.status(201).json(savedUser);
    } catch (error) {
        console.error("Error creating user:", error);
        res.status(500).json({
            error: "An error occurred while creating the user.",
        });
    }
});

userRoutes.post("/guest-login", async (req, res) => {
    try {
        let userName;
        let exists;
        do {
            const randomNumber = Math.floor(Math.random() * 20);
            userName =
                cartoonNames[randomNumber] +
                parseInt(Math.random() * 100000000);
            exists = await User.findOne({ userName });
        } while (exists);
        const imageId = Math.floor(Math.random() * 8);
        const user = new User({
            userName,
            imageId: imageId,
        });
        const savedUser = await user.save();
        const token = jwt.sign({ _id: savedUser._id, userName }, SECRET_KEY);

        res.status(201).json({
            token,
            userName: savedUser.userName,
            userId: savedUser._id,
            imageId: savedUser.imageId,
        });
    } catch (error) {
        console.error("Error creating user:", error);
        res.status(500).json({
            error: "An error occurred while creating the user.",
        });
    }
});

userRoutes.post("/verify-token", async (req, res) => {
    try {
        const { token } = req.body;
        var decoded = jwt.verify(token, "SECRET_KEY");
        return res.status(200).json(decoded);
    } catch (error) {
        console.error("Error creating user:", error);
        res.status(500).json({
            error: "An error occurred while creating the user.",
        });
    }
});

userRoutes.post("/change-image", async (req, res) => {
    try {
        const { userId, imageId } = req.body;
        logger.info(`User ${userId} changed their image to ${imageId}`);
        const user = await User.findById(userId);
        user.imageId = imageId;
        await user.save();
        return res.status(200).json({ imageId });
    } catch (error) {
        console.error("Error changing image:", error);
        res.status(500).json({
            error: "An error occurred while changing the image.",
        });
    }
});

module.exports = { userRoutes };
