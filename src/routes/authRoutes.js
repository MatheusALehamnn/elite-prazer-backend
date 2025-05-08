const express = require("express");
const authController = require("../controllers/authController");

const router = express.Router();

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/forgotPassword", authController.forgotPassword);
router.patch("/resetPassword/:token", authController.resetPassword);

// Protect all routes after this middleware (if any other user-specific routes are added here)
// router.use(authController.protect); 
// Example of a protected route if you add more under /api/v1/users later
// router.patch("/updateMyPassword", authController.updatePassword);

module.exports = router;
