const { logger } = require("./logger");

const redis = require("redis");
const redisClient = redis.createClient();

const setRedis = async () => {
    const client = await redisClient
        .on("error", (err) => logger.error(`Redis Client Error ${err}`))
        .on("ready", () => logger.info("Redis Client Ready"))
        .on("connect", () => logger.info("Redis Client Connected"))
        .connect(() => console.log("Redis Client Connected"));

    return client;
};
setRedis();
module.exports = { redisClient };

// client
//     .hSet(
//         "activeUsers",
//         "userIdSam",
//         JSON.stringify({
//             socketId: "socket.iddd",
//         })
//     )
//     .then(() => {
//         logger.info(`Updated location for user `);
//     })
//     .catch((err) => {
//         logger.error(`Error updating location for user s:`, err);
//     });
// const users = await client.hGetAll("activeUsers");
// console.log("redisClientredisClient dd client", client);

// console.log("alllll", users);

// for await (const key of client.scanIterator({
//     TYPE: "string",
//     MATCH: "key*",
// })) {
//     // use the key!
//     console.log(await client.get(key));
// }

// const sdfsd = await client.hGet("activeUsers", "userId");
// console.log("sdfsd", sdfsd);
// console.log("alllll", await client.hGetAll("activeUsers"));
