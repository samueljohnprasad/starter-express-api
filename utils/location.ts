const User = require("../models/User");

const userToSocketMap = {};
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
