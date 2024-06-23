const express = require("express");
const mongoose = require("mongoose");
const { getMongoLink } = require("./helpers.js");
const cors = require("cors");
const http = require("http");
// const { authenticateToken } = require("./middleware/authenticateToken.js");

const socketIo = require("socket.io");
const { postRoutes } = require("./routes/postRoutes/postRoutes.js");
const { locationRoutes } = require("./routes/locationRoutes/locationRoutes.js");
const { userRoutes } = require("./routes/userRoutes/userRoutes.js");
const { fakeRoutes } = require("./routes/fake/fake.js");
const { handleConnection } = require("./controllers/index.js");
const { eventRoutes } = require("./routes/eventRoutes/eventRoutes.js");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    path: "/myapp/socket.io",
    rejectUnauthorized: false,
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

app.use(express.json());
app.use(cors());

// app.use(authenticateToken.unless({ path: ["/guest-login"] }));

const url = getMongoLink();
mongoose
    .connect(url)
    .then(() => {
        console.log("connected to database");
    })
    .catch((err) => console.error("Database connection error:", err));

app.all("/", (req, res) => {
    console.log("Just got a request!");
    res.send("Yo sam!");
});

app.use("/fake", fakeRoutes);
app.use("/locations", locationRoutes);
app.use("/posts", postRoutes);
app.use("/users", userRoutes);
app.use("/events", eventRoutes(io));
// app.use("/events", eventRoutes);

io.on("connection", (socket) => handleConnection(io, socket));

//eslint-disable-next-line no-undef
server.listen(process.env.PORT || 3000, () => {
    console.log("Server is Running");
});

// // eslint-disable-next-line no-undef
// app.listen(process.env.PORT || 3000, () => {
//     console.log("Server is Running");
// });
