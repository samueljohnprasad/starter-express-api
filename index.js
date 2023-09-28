const express = require("express");
const mongoose = require("mongoose");
const User = require("./models/User.js");
const Post = require("./models/Post.js");
const Comment = require("./models/Comment.js");
var jwt = require("jsonwebtoken");
const { clusterImages } = require("./utils/clustering.js");
const { cartoonNames, getMongoLink } = require("./helpers.js");
const cors = require("cors");

const http = require("http");

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
console.log(process.env.NODE_ENV);
mongoose.connect(url).then(() => {
  console.log("connected to database");
});

app.all("/", (req, res) => {
  console.log("Just got a request!");
  res.send("Yo sam!");
});

app.get("/nearby", async (req, res) => {
  try {
    const { latitude, longitude } = req.query; // Assuming the latitude, longitude, and maxDistance are provided as query parameters
    const options = {
      location: {
        $geoWithin: {
          $centerSphere: [
            [longitude.toString(), latitude.toString()],
            10 / 3963.2,
          ],
        },
      },
    };

    const drivers = await Post.find(options).lean();
    res.status(200).json(clusterImages(drivers));
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
    console.log(">>>body", req.body);
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
        cartoonNames[randomNumber] + parseInt(Math.random() * 100000000);
      exists = await User.findOne({ userName });
      console.log("while", { userName, exists });
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
    const {
      userName,
      userId,
      message,
      createAt,
      maxDistance,
      latitude,
      longitude,
    } = req.body;
    //console.log("req post backend", req.body);
    const post = new Post({
      userName,
      message,
      createAt,
      userId,
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
  console.log("post-comment called");
  try {
    const postId = "6509662561cd48235321181d";
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const newComment = new Comment({
      author: "User11111111111",
      text: "This is a comment11111111111.",
      userId: "32342333333333333333",
    });
    const savedComment = await newComment.save();
    post.comments.push(savedComment._id);
    await post.save();

    res.status(201).json(savedComment);
  } catch (e) {
    res.status(500).json({
      error: "Error updating post with comment",
    });
  }
});

app.get("/post/:postId", async (req, res) => {
  try {
    const { page } = req.query;
    console.log({ page });

    const commentsPerPage = 2; // Set the number of comments per page
    const skipAmount = (page - 1) * commentsPerPage;

    const postId = req.params.postId;
    const postWithComments = await Post.findById(postId).populate({
      path: "comments",
      options: {
        sort: { createdAt: -1 },
        skip: skipAmount,
        limit: 2,
      },
    });
    if (!postWithComments) {
      return res.status(404).json({ error: "Post not found" });
    }
    postWithComments.comments.reverse();
    console.log(
      "postWithComments.comments.reverse()",
      postWithComments.comments.reverse()
    );
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
          [longitude.toString(), latitude.toString()],
          100 / 3963.2,
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
      console.log("user.userName", user.userName);
      return {
        userName: user.userName,
        userId: user._id,
        coordinates: user.location.coordinates,
      };
    });
};

const userToSocketMap = {};
io.on("connection", (socket) => {
  let currentUserId;
  let newCoordinates;

  socket.on("someEvent", (data, callback) => {
    console.log(">>>>>>>>>>> someEvent if");

    if (data.data === "someData") {
      console.log(">>>>>>>>>>> someEvent");
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
      });
    });
    socket.emit("nearbyUsers", currentActiveUsers);
  });

  socket.on("postNewPost", async (data, callback) => {
    try {
      const {
        userName,
        userId,
        message,
        createAt,
        maxDistance,
        latitude,
        longitude,
      } = data;
      console.log("postNewPost", { data });
      const post = new Post({
        userName,
        message,
        createAt,
        userId,
        maxDistance,
        location: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
      });
      const savedPost = await post.save();
      const currentActiveUsers = await getNearByUsersActiveUsers(
        data.userId,
        data.longitude,
        data.latitude
      );
      currentActiveUsers.forEach((user) => {
        socket.to(userToSocketMap[user.userId]).emit("realTimeNewPostUpdates", {
          post: savedPost,
        });
      });

      callback({ newPost: savedPost, status: 200 });
    } catch (e) {
      console.log(e);
      callback({ status: 500 });
    }
    // socket.emit("realTimeNewPostUpdates", {
    //     data: "hello recieved new post",
    // });
  });

  socket.on("postComment", async ({ postId, comment, userId, author }) => {
    console.log("postComment", comment);

    try {
      const post = await Post.findById(postId);
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }

      const newComment = new Comment({
        author: author,
        text: comment,
        userId: userId,
      });
      const savedComment = await newComment.save();
      post.comments.push(savedComment._id);
      await post.save();
      console.log({ savedComment });
      io.emit("newComment", savedComment);
    } catch (e) {
      console.log(e);
    }
  });

  socket.on("disconnect", async () => {
    const currentActiveUsers = await getNearByUsersActiveUsers(
      socket.user,
      socket?.location?.[0] || 0,
      socket?.location?.[1] || 0
    );
    currentActiveUsers.forEach((user) => {
      socket.to(userToSocketMap[user.userId]).emit("locationUpdate_left_user", {
        userId: socket.user,
      });
    });

    console.log(">>>>>>>>>>>> User disconnected");
    delete userToSocketMap[currentUserId];
  });
});

server.listen(process.env.PORT || 3000, () => {
  console.log("Server is Running");
});

// app.listen(process.env.PORT || 3000, () => {
//   console.log("Server is Running");
// });
