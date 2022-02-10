const express = require("express");
const { check } = require("express-validator");
const HttpError = require("../models/http-error");
const userControllers = require("../controllers/users-controllers");
const router = express.Router();

// Get all users
router.get("/", userControllers.getUsers);
// Get Specific user
router.get("/:id", userControllers.getUserById);
// Signup NEW user
router.post(
  "/signup",
  [
    check("name").trim().notEmpty(),
    check("email").normalizeEmail().isEmail(),
    check("password").isLength({ min: 6 }),
  ],
  userControllers.signup
);
// Login
router.post("/login", userControllers.login);
// Update current users details
router.patch("/update", userControllers.updateUser);
// Delete users specific details
router.patch("/currency", userControllers.updateCurrency);
// Reset data pushed in account page
router.patch("/d", userControllers.resetData);
// Delete users account (everything) via account page
router.delete("/destroy", userControllers.destroyAll);

module.exports = router;
