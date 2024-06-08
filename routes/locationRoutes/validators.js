const { check, validationResult } = require("express-validator");
const validateQueryParams = [
    check("latitude")
        .exists()
        .withMessage("Latitude is required")
        .isFloat({ min: -90, max: 90 })
        .withMessage("Latitude must be a valid float between -90 and 90"),
    check("longitude")
        .exists()
        .withMessage("Longitude is required")
        .isFloat({ min: -180, max: 180 })
        .withMessage("Longitude must be a valid float between -180 and 180"),
    check("distance")
        .exists()
        .withMessage("Distance is required")
        .isFloat({ min: 0 })
        .withMessage(
            "Distance must be a valid float greater than or equal to 0"
        ),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
];

module.exports = { validateQueryParams };
