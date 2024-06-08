const express = require("express");
const fakeRoutes = express.Router();
const { faker } = require("@faker-js/faker");
const Post = require("../../models/Post");

const centerLat = 17.4270611; // Specify your desired center latitude
const centerLng = 78.391113; // Specify your desired center longitude
async function generateDummyData() {
    const users = [];

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
        await post.save();
        users.push(user);
    }
    return { users };
}

fakeRoutes.get("/data", (req, res) => {
    generateDummyData();
    return res.status(201).json({ message: "success" });
});

module.exports = { fakeRoutes };

//    { "_id": ObjectId("6509662561cd48235321181d") }
//13.0827 80.2707//
