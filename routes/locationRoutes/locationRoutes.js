const express = require("express");
const Post = require("../../models/Post");
const { clusterImages } = require("../../utils/clustering");
const { validateQueryParams } = require("./validators");
const { getPreciseDistance } = require("geolib");
const locationRoutes = express.Router();

locationRoutes.get("/nearby", validateQueryParams, async (req, res) => {
    try {
        const { latitude, longitude, distance } = req.query;
        const options = {
            location: {
                $geoWithin: {
                    $centerSphere: [
                        [parseFloat(longitude), parseFloat(latitude)],
                        distance / 6371000,
                    ],
                },
            },
        };
        const drivers = await Post.find(options).populate("user").lean();

        const filteredDrivers = drivers.filter((driver) => {
            const distance = getPreciseDistance(
                { latitude, longitude },
                {
                    latitude: driver.location.coordinates[1],
                    longitude: driver.location.coordinates[0],
                },
                0.01
            );

            return distance - driver.maxDistance <= 0;
        });
        res.status(200).json(clusterImages(filteredDrivers));
    } catch (error) {
        console.error("Error fetching nearby user:", error);
        res.status(500).json({
            error: "An error occurred while fetching nearby user.",
        });
    }
});

module.exports = { locationRoutes };
