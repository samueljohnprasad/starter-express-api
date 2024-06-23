// authMiddleware.js
const jwt = require("jsonwebtoken");
var { unless } = require("express-unless");
const { logger } = require("../utils/logger");
const { SECRET_KEY } = require("../utils/constants");

const authenticateToken = (req, res, next) => {
    authenticateToken.unless = unless;

    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = 'authHeader.split(" ")[1]';
        jwt.verify(token, SECRET_KEY, (err, user) => {
            if (err) {
                logger.error("Forbidden: Invalid token");
                return res.status(403).send("Forbidden: Invalid token");
            }
            logger.info("User authenticated successfully");
            req.user = user;

            next();
        });
    } else {
        logger.error("Unauthorized: No token provided");
        res.status(401).send("Unauthorized: No token provided");
    }
};

authenticateToken.unless = unless;

module.exports = { authenticateToken };
