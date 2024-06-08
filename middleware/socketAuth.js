const { logger } = require("../utils/logger");

const socketAuth = (socket, next) => {
    logger.info(`Token, ${socket.handshake.query?.token}`);

    // Your authentication logic here
    if (tokenIsValid("token")) {
        next();
    } else {
        logger.warn("Authentication error: Invalid token");
        next(new Error("Authentication error"));
    }
};

function tokenIsValid() {
    logger.info("Token is valid");
    return true;
}

module.exports = { socketAuth };
