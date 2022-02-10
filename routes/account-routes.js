const express = require("express");
const { check } = require("express-validator");
const accountControllers = require("../controllers/account-controllers");
const checkAuth = require("../middleware/auth");
const router = express.Router();

router.use(checkAuth);

// Get all accounts
router.get("/", accountControllers.getAllAccounts);
// Get all accounts by USERID
router.get("/:uid", accountControllers.getUsersAccounts);
// GET account by ID
router.get("/:id", accountControllers.getAccountById);
// Create snapshot and update account details
router.patch("/log", accountControllers.createSnapshot);
// Create new account
router.post(
  "/",
  [check("name").trim().notEmpty(), check("category").trim().notEmpty()],
  accountControllers.createNewFinanceAccount
);
// Update account details
router.patch("/:aid", accountControllers.updateAccountDetails);

// Delete account
router.delete("/:aid", accountControllers.deleteAccount);

module.exports = router;
