const mongoose = require("mongoose");
const HttpError = require("../models/http-error");
const { validationResult } = require("express-validator");
const { v4: uuidv4 } = require("uuid");
const Account = require("../models/account");
const User = require("../models/user");

// Get all users accounts
// GET /accounts
const getAllAccounts = async (req, res, next) => {
  let accounts;
  try {
    accounts = await Account.find({}, "-amount");
  } catch (err) {
    return next(new HttpError("Something went wrong", 500));
  }

  res.json({
    accounts: accounts.map((account) => account.toObject({ getters: true })),
  });
};

// GET specific account by ID
const getAccountById = async (req, res, next) => {
  const { accountId } = req.params.id;

  let existingAccount;
  try {
    existingAccount = await Account.findOne({ id: accountId });
  } catch (err) {
    const error = new HttpError(
      "Could not find the account with that ID.",
      500
    );
    return next(error);
  }

  if (!existingAccount) {
    return next(new HttpError("Account with that ID does not exist", 401));
  }

  res.json({ account: existingAccount });
};

// GET all accounts for specific user ID
const getUsersAccounts = async (req, res, next) => {
  const userId = req.params.uid;

  let userWithAccounts;
  try {
    userWithAccounts = await User.findById(userId).populate("accounts");
    console.log(userWithAccounts);
  } catch (err) {
    return next(new HttpError("Could not find any accounts", 500));
  }

  if (!userWithAccounts) {
    return next(
      new HttpError("Could not find any accounts with the provided UserID", 404)
    );
  }

  res.status(201).json({
    accounts: userWithAccounts.accounts.map((account) =>
      account.toObject({ getters: true })
    ),
  });
};

// Create new account for user
// POST /accounts/
const createNewFinanceAccount = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(404).json({ message: "Please add some text" });
    throw new HttpError("Please add some text", 422);
  }

  const { name, category, balance, user } = req.body;

  const createdAccount = new Account({
    id: uuidv4(),
    user,
    name,
    category,
    balance,
  });

  console.log(createdAccount);

  let existingUser;

  try {
    existingUser = await User.findById(user);
  } catch (err) {
    return next(new HttpError("Could not create the account", 500));
  }

  if (!existingUser)
    return next(new HttpError("Could not find a user with that ID", 404));

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdAccount.save({ session: sess });

    existingUser.accounts.push(createdAccount);
    existingUser.netWorth += parseFloat(createdAccount.balance);
    existingUser.accountList.push(createdAccount.name);
    console.log(existingUser);
    await existingUser.save({ session: sess });
    console.log("Saving existing user");
    await sess.commitTransaction();
  } catch (err) {
    console.log(err);
    const error = new HttpError(
      "Creating new account failed. Please try again",
      500
    );
    return next(error);
  }

  res.status(201).json({ user: createdAccount.toObject({ getters: true }) });
};

// Update account details by AccountId
const updateAccountDetails = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new HttpError("Invalid inputs passed, check data", 422);
  }

  const { name, category, balance } = req.body;
  const accountId = req.params.aid;

  console.log("REQUEST TO CHANGE ACCOUNT DETAILS");
  console.log(name, category, balance);

  let account;
  try {
    account = await Account.findById(accountId).populate("user");
  } catch (error) {
    return next(
      new HttpError(
        "Could not find an account with that id, please try again",
        500
      )
    );
  }

  if (!account) {
    return next(
      new HttpError(
        "Could not find an account with that id, please try again",
        500
      )
    );
  }
  // Need to create data snapshot in here
  console.log("-----------");
  console.log("UPDATING ACCOUNT");
  console.log(account);

  let newNetWorth = (account.user.netWorth -= parseFloat(account.balance));
  newNetWorth += parseFloat(balance);

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    account.name = name;
    account.category = category;
    account.balance = balance;
    account.user.netWorth = newNetWorth;
    await account.save({ session: sess });
    await account.user.save({ session: sess });
    sess.commitTransaction();
  } catch (err) {
    return next(
      new HttpError(
        "Could not find an account with that id, please try again",
        500
      )
    );
  }

  res.status(201).json({ account: account.toObject({ getters: true }) });
};

// Create account snapshot and update values
const createSnapshot = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new HttpError("Invalid inputs passed, check data", 422);
  }

  const { snapshot, newData, userId } = req.body;

  let user;
  try {
    user = await User.findById(userId).populate("accounts");
  } catch (err) {
    return next(
      new HttpError(
        "Could not locate a user with that ID, please try again",
        500
      )
    );
  }

  if (!user) {
    return next(
      new HttpError(
        "Could not locate a user with that ID, please try again",
        500
      )
    );
  }

  let existingAccounts;
  try {
    existingAccounts = await Account.find({
      user: mongoose.Types.ObjectId(userId),
    });
  } catch (err) {
    return next(new HttpError("Could not find the account with that ID", 500));
  }

  if (!existingAccounts)
    return next(
      new HttpError("Could not find the right accounts, please try again.", 500)
    );

  const currentDate = new Date();

  try {
    let today = new Date().toISOString().split("T")[0];
    const data = {
      [today]: snapshot,
    };

    const sess = await mongoose.startSession();
    sess.startTransaction();

    // Update snapshot
    user.prevAccountDataSnapshots.push(data);
    user.lastUpdated = currentDate;

    let newNetWorth = 0;

    // update each balance - Check for match by ID
    existingAccounts.forEach(async (acc, index) => {
      newData.forEach((newAcc) => {
        if (acc.name === newAcc.name) {
          acc.balance = newAcc.balance;
          newNetWorth += newAcc.balance;
        }
      });
      // Save each document in the array
      await existingAccounts[index].save();
    });

    // Update netWorth
    user.netWorth = newNetWorth;
    await user.save({ session: sess });

    // Update networth
    sess.commitTransaction();
  } catch (err) {
    console.log(err);
    return next(
      new HttpError("Could not save the account changes, please try again", 500)
    );
  }

  res.status(201).json({ message: "Success", user: user });
};

// Delete a users account
// DELETE /accounts/:id
const deleteAccount = async (req, res, next) => {
  console.log("Starting deletion");
  const accountId = req.params.aid;

  let account;
  try {
    account = await Account.findById(accountId).populate("user");
  } catch (err) {
    return next(new HttpError("Could not delete the account", 500));
  }

  if (!account)
    return next(new HttpError("Could not find an account with that id", 404));

  console.log("Account to be deleted:");
  console.log(account);

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await account.deleteOne({ session: sess });
    account.user.accountList.pull(account.name);
    account.user.accounts.pull(account);
    account.user.netWorth -= parseFloat(account.balance);
    await account.user.save({ session: sess });
    sess.commitTransaction();
  } catch (err) {
    return next(new HttpError("Could not delete the account", 500));
  }

  res.status(201).json({ message: "Account deleted!" });
};

exports.getAllAccounts = getAllAccounts;
exports.getAccountById = getAccountById;
exports.getUsersAccounts = getUsersAccounts;
exports.createNewFinanceAccount = createNewFinanceAccount;
exports.updateAccountDetails = updateAccountDetails;
exports.createSnapshot = createSnapshot;
exports.deleteAccount = deleteAccount;
