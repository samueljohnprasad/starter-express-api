const { getPreciseDistance } = require("geolib");
const { redisClient } = require("./redisClient");

const clusteringThreshold = 20;

const areImagesClose = (image1, image2) => {
    const distance = getPreciseDistance(
        {
            latitude: image1.location.coordinates[1],
            longitude: image1.location.coordinates[0],
        },
        {
            latitude: image2.location.coordinates[1],
            longitude: image2.location.coordinates[0],
        },
        0.01
    );

    return distance <= clusteringThreshold;
};

const clusterImages = (imageData) => {
    const clusteredMarkers = [];
    const remainingMarkers = [...imageData];

    while (remainingMarkers.length > 0) {
        const currentImage = remainingMarkers.pop();
        const cluster = [currentImage];

        for (let i = remainingMarkers.length - 1; i >= 0; i--) {
            if (areImagesClose(currentImage, remainingMarkers[i])) {
                cluster.push(remainingMarkers[i]);
                remainingMarkers.splice(i, 1);
            }
        }

        clusteredMarkers.push(cluster);
    }
    return clusteredMarkers;
};

const getNearbyUsersFromRedis = async (latitude, longitude, radius) => {
    try {
        const users = await redisClient.hGetAll("activeUsers");

        const nearbyUsers = [];
        for (const [userId, userData] of Object.entries(users)) {
            const { coordinates, userName, imageId, socketId } =
                JSON.parse(userData);
            console.log(
                "xd currentActiveUsers coordinates",
                coordinates,
                userName,
                userId
            );
            if (!coordinates?.[1] || !coordinates?.[0]) continue;
            const distance = getPreciseDistance(
                { latitude, longitude },
                { latitude: coordinates[1], longitude: coordinates[0] },
                0.01
            );
            console.log("xd currentActiveUsers distance", distance, radius);
            if (distance <= radius) {
                nearbyUsers.push({
                    userName,
                    userId,
                    coordinates,
                    imageId,
                    socketId,
                });
            }
        }

        return nearbyUsers;
    } catch (err) {
        console.error("Error retrieving users from Redis:", err);
        throw err;
    }
};

module.exports = { clusterImages, getNearbyUsersFromRedis };
