const express = require("express");
const mongoose = require("mongoose");
const User = require("./models/User.js");
const Post = require("./models/Post.js");
const Comment = require("./models/Comment.js");
var jwt = require("jsonwebtoken");
const { clusterImages, calculateDistance } = require("./utils/clustering.js");
const { cartoonNames, getMongoLink } = require("./helpers.js");
const cors = require("cors");
const http = require("http");
const { faker } = require("@faker-js/faker");

const socketIo = require("socket.io");
//    { "_id": ObjectId("6509662561cd48235321181d") }
//13.0827 80.2707//
const app = express();
app.use(express.json());
app.use(cors());
const server = http.createServer(app);
const io = socketIo(server, {
    path: "/myapp/socket.io",
    rejectUnauthorized: false,
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

const url = getMongoLink();
mongoose.connect(url).then(() => {
    console.log("connected to database");
});

app.all("/", (req, res) => {
    console.log("Just got a request!");
    res.send("Yo sam!");
});

app.get("/nearby", async (req, res) => {
    try {
        console.log("req", req.query);

        const { latitude, longitude, distance } = req.query; // Assuming the latitude, longitude, and maxDistance are provided as query parameters
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
        // 10 -5
        const drivers = await Post.find(options).populate("user").lean();
        console.log("drivers", drivers.length);

        const filteredDrivers = drivers.filter((driver) => {
            const distance = calculateDistance(
                latitude,
                longitude,
                driver.location.coordinates[1],
                driver.location.coordinates[0]
            );

            return distance - driver.maxDistance <= 0;
        });
        console.log("filteredDrivers", filteredDrivers.length);

        res.status(200).json(clusterImages(filteredDrivers));
    } catch (error) {
        console.error("Error fetching nearby user:", error);
        res.status(500).json({
            error: "An error occurred while fetching nearby user.",
        });
    }
});

app.post("/shop", async (req, res) => {
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

app.post("/guest-login", async (req, res) => {
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
        const token = jwt.sign({ _id: savedUser._id, userName }, "SECRET_KEY");

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

app.post("/post", async (req, res) => {
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

app.post("/verify-token", async (req, res) => {
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

app.get("/post-comment", async (req, res) => {
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
        const savedPost = await post.save();

        res.status(201).json(savedComment);
    } catch (e) {
        console.log(e);
        res.status(500).json({
            error: "Error updating post with comment",
        });
    }
});

app.get("/post/:postId", async (req, res) => {
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
        res.status(500).json({ error: err.message });
    }
});

const getNearByUsersActiveUsers = async (userId, longitude, latitude) => {
    const options = {
        location: {
            $geoWithin: {
                $centerSphere: [
                    [parseFloat(longitude), parseFloat(latitude)],
                    100000 / 6371000,
                ],
            },
        },
    };

    const nearbyUsers = await User.find(options);
    return nearbyUsers
        .filter((user) => {
            if (!userToSocketMap[user._id] || user._id == userId) return false;
            return true;
        })
        .map((user) => {
            return {
                userName: user.userName,
                userId: user._id,
                coordinates: user.location.coordinates,
                imageId: user.imageId,
            };
        });
};

const userToSocketMap = {};
io.on("connection", (socket) => {
    let currentUserId;
    let newCoordinates;

    socket.on("someEvent", (data, callback) => {
        if (data.data === "someData") {
            callback("success");
        } else {
            callback("error");
        }
    });

    console.log("user connected");
    socket.on("update_userLocation", async (data) => {
        socket.user = data.userId;
        socket.location = [data.longitude, data.latitude];
        userToSocketMap[data.userId] = socket.id;
        currentUserId = data.userId;

        newCoordinates = [data.longitude, data.latitude];
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
        const currentActiveUsers = await getNearByUsersActiveUsers(
            data.userId,
            data.longitude,
            data.latitude
        );
        currentActiveUsers.forEach((user) => {
            socket.to(userToSocketMap[user.userId]).emit("locationUpdate", {
                userName: data.userName,
                userId: data.userId,
                coordinates: newCoordinates,
                imageId: data.imageId,
            });
        });
        socket.emit("nearbyUsers", currentActiveUsers);
    });

    socket.on("postNewPost", async (data, callback) => {
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
            const savedPost = await post.save();
            await savedPost.populate("user");

            const currentActiveUsers = await getNearByUsersActiveUsers(
                data.userId,
                data.longitude,
                data.latitude
            );
            currentActiveUsers.forEach((user) => {
                console.log({ user });
                socket
                    .to(userToSocketMap[user.userId])
                    .emit("realTimeNewPostUpdates", {
                        post: savedPost,
                    });
            });
            console.log({ currentActiveUsers });
            callback({ newPost: savedPost, status: 200 });
        } catch (e) {
            console.log(e);
            callback({ status: 500 });
        }
    });

    socket.on("postComment", async ({ postId, comment, userId }) => {
        try {
            const post = await Post.findById(postId);
            if (!post) {
                return res.status(404).json({ error: "Post not found" });
            }

            const newComment = new Comment({
                text: comment,
                user: userId,
            });
            const savedComment = await newComment.save();
            post.comments.push(savedComment._id);
            await post.save();
            const userComments = await savedComment.populate("user");
            io.emit("newComment", userComments);
        } catch (e) {
            console.log(e);
        }
    });

    //Events and Meetup Planning: Allow users to create and discover local events, set up meetups, and RSVP to events.

    socket.on("disconnect", async () => {
        const currentActiveUsers = await getNearByUsersActiveUsers(
            socket.user,
            socket?.location?.[0] || 0,
            socket?.location?.[1] || 0
        );
        currentActiveUsers.forEach((user) => {
            socket
                .to(userToSocketMap[user.userId])
                .emit("locationUpdate_left_user", {
                    userId: socket.user,
                });
        });

        console.log(">>>>>>>>>>>> User disconnected");
        delete userToSocketMap[currentUserId];
    });
});

const centerLat = 17.4270611; // Specify your desired center latitude
const centerLng = 78.391113; // Specify your desired center longitude
async function generateDummyData() {
    const users = [];
    const posts = [];
    const comments = [];

    for (let i = 0; i < 50; i++) {
        const radiusInKilometers = 150;
        const radiusInDegrees = radiusInKilometers / 111.32;

        const randomAngle = Math.random() * 2 * Math.PI;
        const randomDistance = Math.sqrt(Math.random()) * radiusInDegrees;
        const latitude = centerLat + randomDistance * Math.cos(randomAngle);
        const longitude = centerLng + randomDistance * Math.sin(randomAngle);
        const user = {
            message: faker.word.words(),
            location: {
                type: "Point",
                coordinates: [longitude, latitude],
            },
            maxDistance: 500000,
            user: "6586548efc0fc5d1aaae876b",
            comments: "6580855ba870a46848930273",
        };
        const post = new Post(user);
        const savedPost = await post.save();
        users.push(user);
    }
    return { users };
}

app.get("/fake", (req, res) => {
    generateDummyData();
    return res.status(201).json({ message: "success" });
});

server.listen(process.env.PORT || 3000, () => {
    // console.log(generateDummyData());

    console.log("Server is Running");
});

// app.listen(process.env.PORT || 3000, () => {
//   console.log("Server is Running");
// });
