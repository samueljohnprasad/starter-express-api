const Comment = require("../models/Comment");
const Post = require("../models/Post");
const User = require("../models/User");
const { logger } = require("../utils/logger");
const { redisClient } = require("../utils/redisClient");
const { getNearbyUsersFromRedis } = require("../utils/clustering");

exports.postNewPost = async ({ socket, data, callback }) => {
    try {
        const { userId, message, maxDistance, latitude, longitude } = data;
        const post = new Post({
            message,
            user: userId,
            maxDistance,
            location: {
                type: "Point",
                coordinates: [longitude, latitude],
            },
        });
        console.log("maxDistance", maxDistance);
        const savedPost = await post.save();
        await savedPost.populate("user");

        const currentActiveUsers = await getNearbyUsersFromRedis(
            data.latitude,
            data.longitude,
            maxDistance
        );
        console.log("xd currentActiveUsers", currentActiveUsers);
        currentActiveUsers.forEach(async (user) => {
            socket.to(user.socketId).emit("realTimeNewPostUpdates", {
                post: savedPost,
            });
        });
        // console.log({ currentActiveUsers });
        callback({ newPost: savedPost, status: 200 });
    } catch (e) {
        console.log(e);
        callback({ status: 500 });
    }
};

exports.updateUserLocation = async ({ data, socket }) => {
    socket.user = data.userId;
    socket.location = [data.longitude, data.latitude];

    const newCoordinates = [data.longitude, data.latitude];
    await User.findOneAndUpdate(
        { _id: data.userId },
        {
            $set: {
                "location.type": "Point",
                "location.coordinates": newCoordinates,
            },
        },
        { new: true }
    );
    const currentActiveUsers = await getNearbyUsersFromRedis(
        data.latitude,
        data.longitude,
        10000
    );

    currentActiveUsers.forEach((user) => {
        socket.to(user.socketId).emit("locationUpdate", {
            userName: data.userName,
            userId: data.userId,
            coordinates: newCoordinates,
            imageId: data.imageId,
        });
    });
    socket.emit("nearbyUsers", currentActiveUsers);
};

exports.postComment = async ({ data, io, room }) => {
    try {
        logger.info(
            "Posting comment",
            room,
            data.postId,
            data.comment,
            data.userId
        );
        const { comment, postId, userId } = data;
        logger.info("Posting comment", postId, comment, userId);
        const post = await Post.findById(postId);
        if (!post) {
            return;
        }

        const newComment = new Comment({
            text: comment,
            user: userId,
        });
        const savedComment = await newComment.save();
        post.comments.push(savedComment._id);
        await post.save();
        const populatedComment = await savedComment.populate("user");
        io.to(room).emit("newComment", { postId, comment: populatedComment });
    } catch (e) {
        logger.error(e, "Error updating post with comment");
        console.log(e);
    }
};
exports.handleDisconnect = async ({ socket }) => {
    const currentActiveUsers = await getNearbyUsersFromRedis(
        socket?.location?.[1] || 0,
        socket?.location?.[0] || 0,
        10000
    );
    currentActiveUsers.forEach((user) => {
        socket.to(user.socketId).emit("locationUpdate_left_user", {
            userId: socket.user,
        });
    });

    redisClient
        .hDel("activeUsers", socket.user)
        .then(() => {
            logger.info(
                `User ${socket.user} remove from redis with socket ID ${socket.id}`
            );
        })
        .catch((err) => {
            logger.error(`Error removing user ${socket.user} from Redis:`, err);
        });

    console.log(">>>>>>>>>>>> User disconnected");
};
