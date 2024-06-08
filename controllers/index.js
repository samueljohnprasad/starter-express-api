const { socketAuth } = require("../middleware/socketAuth");
const { logger } = require("../utils/logger");
const { redisClient } = require("../utils/redisClient");
const {
    postNewPost,
    updateUserLocation,
    postComment,
    handleDisconnect,
} = require("./posts");

const handleConnection = async (io, socket) => {
    logger.info(`A user connected to socket, ${socket.handshake.auth.userId}`);
    // console.log("socket.handshake.auth", socket.handshake);
    socket.use((_, next) => socketAuth(socket, next));

    const userId = socket.handshake.auth.userId;
    const userString = await redisClient.hGet("activeUsers", userId);
    const userDetails = JSON.parse(userString);
    if (userId) {
        redisClient
            .hSet(
                "activeUsers",
                userId,
                JSON.stringify({ ...(userDetails || {}), socketId: socket.id })
            )
            .then(() => {
                logger.info(
                    `User ${userId} connected with socket ID ${socket.id}`
                );
            })
            .catch((err) => {
                logger.error(`Error adding user ${userId} to Redis:`, err);
            });
    }

    socket.on("joinPostRoom", (postId) => {
        socket.join(postId);
        logger.info(`User joined room for post ${postId}`);
    });

    socket.on("leavePostRoom", (postId) => {
        socket.leave(postId);
        logger.info(`User left room for post ${postId}`);
    });

    socket.on("update_userLocation", (data) => {
        if (data.userId && data.longitude && data.latitude && data.imageId) {
            redisClient
                .hSet(
                    "activeUsers",
                    data.userId,
                    JSON.stringify({
                        coordinates: [data.longitude, data.latitude],
                        socketId: socket.id,
                        imageId: data.imageId,
                        userName: data.userName,
                    })
                )
                .then(() => {
                    logger.info(`Updated location for user ${data.userId}`);
                })
                .catch((err) => {
                    logger.error(
                        `Error updating location for user ${data.userId} in Redis:`,
                        err
                    );
                });
        }
        return updateUserLocation({ io, socket, data });
    });

    socket.on("postNewPost", (data, callback) =>
        postNewPost({ io, socket, data, callback })
    );

    socket.on("postComment", (room, data) => postComment({ io, data, room }));

    socket.on("disconnect", () => handleDisconnect({ io, socket }));
};

module.exports = { handleConnection };
