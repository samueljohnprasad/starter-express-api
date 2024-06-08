const express = require("express");
const Post = require("../../models/Post");
const { logger } = require("../../utils/logger");
const Comment = require("../../models/Comment");
const postRoutes = express.Router();

postRoutes.post("/post", async (req, res) => {
    try {
        const { userId, message, createAt, maxDistance, latitude, longitude } =
            req.body;
        const post = new Post({
            message,
            createAt,
            user: userId,
            maxDistance,
            location: {
                type: "Point",
                coordinates: [longitude, latitude],
            },
        });
        const savedPost = await post.save();
        return res.status(201).json(savedPost);
    } catch (error) {
        console.error("Error creating user:", error);
        res.status(500).json({
            error: "An error occurred while creating the user.",
        });
    }
});

postRoutes.get("/post-comment", async (req, res) => {
    try {
        const postId = "651887ae27e73eb52e8e0d3c";
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ error: "Post not found" });
        }

        const newComment = new Comment({
            text: "This is a comment 64a6edf83f3d142d1f674d29",
            user: "6515af7b5cda0bb7f10c5838",
        });

        const savedComment = await newComment.save();

        post.comments.push(savedComment._id);
        await post.save();

        res.status(201).json(savedComment);
    } catch (e) {
        console.log(e);
        res.status(500).json({
            error: "Error updating post with comment",
        });
    }
});

postRoutes.get("/post/:postId", async (req, res) => {
    try {
        const { page, timestamp } = req.query;

        const postId = req.params.postId;
        const populateOptions = {
            path: "comments",
            populate: { path: "user" },
            options: {
                sort: { createdAt: -1 },
                limit: page,
            },
        };

        if (timestamp) {
            populateOptions.match = {
                createdAt: { $lt: new Date(timestamp) },
            };
        }

        const postWithComments = await Post.findById(postId)
            .populate("user")
            .populate(populateOptions);
        if (!postWithComments) {
            return res.status(404).json({ error: "Post not found" });
        }

        res.status(200).json(postWithComments);
    } catch (err) {
        logger.warn("error fetching post with comments", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = { postRoutes };
