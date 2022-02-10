const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const HttpError = require("../models/http-error");
const { v4: uuidv4 } = require("uuid");
const User = require("../models/user");

// Get all users
// GET /users/
const getUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, "-password");
  } catch (err) {
    return next(new HttpError("Something went wrong", 500));
  }

  res.json({ users: users.map((user) => user.toObject({ getters: true })) });
};

// Get specific users
// GET /users/:id
const getUserById = async (req, res, next) => {
  const userId = req.params.id;

  console.log(userId);

  let user;
  try {
    user = await User.findById(userId).populate("accounts");
  } catch (err) {
    const error = new HttpError("Could not find a user with that id.", 500);
    return next(error);
  }

  if (!user) {
    return next(new HttpError("User was not found", 404));
  }
  console.log(user);

  res.json({ user });
};

// Login
// POST /users/login
const login = async (req, res, next) => {
  const { email, password } = req.body;

  console.log("Requesting Login");

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError("Logging in failed. Please try again.", 500);
    return next(error);
  }

  if (!existingUser) {
    return next(new HttpError("Invalid credentials, could not login", 401));
  }
  // Check hashed password

  let validPassword = false;

  try {
    validPassword = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    return next(new HttpError("Please check your credentials", 500));
  }

  if (!validPassword) {
    return next(new HttpError("Invalid credentials, could not login", 401));
  }

  let token;
  try {
    token = jwt.sign(
      { userId: existingUser.id, email: existingUser.email },
      `${process.env.JWT_KEY}`,
      { expiresIn: "2h" }
    );
  } catch (err) {
    const error = new HttpError("Logging in failed. Please try again", 500);
    return next(error);
  }

  console.log(existingUser);

  res.json({
    userId: existingUser.id,
    email: existingUser.email,
    token: token,
    firstTimeUser: existingUser.firstTimeUser,
  });
};

// Signup
// POST /users/signup
const signup = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.json({ message: "Please correct your data" });
    throw new HttpError("Please correct your data", 422);
  }

  console.log("No Errors");

  const { name, email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError("Could not create the user", 500);
    return next(error);
  }

  if (existingUser) {
    const error = new HttpError(
      "User exists already, please login instead",
      422
    );
    return next(error);
  }

  // Hash the users password
  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    return next(new HttpError("Could not create user, please try again", 500));
  }

  const createdUser = new User({
    id: uuidv4(),
    name,
    email,
    password: hashedPassword,
    age: 18,
    ageToRetire: 99,
    firstCreated: new Date(Date.now()),
    lastUpdated: null,
    netWorth: 0,
    targetWorth: 0,
    worthDateTarget: 0,
    accountList: [],
    accounts: [],
    prevAccountDataSnapshots: [],
    firstTimeUser: true,
  });

  try {
    await createdUser.save();
  } catch (err) {
    console.log(err);
    const error = new HttpError(
      "Creating new User failed. Please try again",
      500
    );
    return next(error);
  }

  let token;
  try {
    token = jwt.sign(
      { userId: createdUser.id, email: createdUser.email },
      `${process.env.JWT_KEY}`,
      { expiresIn: "2h" }
    );
  } catch (err) {
    const error = new HttpError(
      "Creating new token failed. Please try again",
      500
    );
    return next(error);
  }

  console.log(createdUser);

  res
    .status(201)
    .json({ userId: createdUser.id, email: createdUser.email, token: token });
};

// Update user details
// PATCH /user/
const updateUser = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    throw new HttpError("Invalid inputs passed, please check data", 422);

  const {
    userId,
    targetWorth,
    targetAge,
    name,
    currentAge,
    drawDownAmount,
    monthlyIncrease,
  } = req.body;

  let user;
  try {
    user = await User.findById(userId);
  } catch (err) {
    console.log(err);
    const error = new HttpError("Could not find a user with that id.", 500);
    return next(error);
  }

  if (!user) {
    return next(new HttpError("User was not found", 404));
  }

  user.targetWorth = targetWorth;
  user.ageToRetire = targetAge;
  user.name = name ? name : user.name;
  user.age = currentAge;
  user.drawDownAmount = drawDownAmount;
  user.monthlyIncrease = monthlyIncrease
    ? monthlyIncrease
    : user.monthlyIncrease;
  user.firstTimeUser = false;

  try {
    await user.save();
  } catch (err) {
    console.log(err);
    throw new HttpError("Something went wrong could not update.", 500);
  }

  res.status(201).json({ user: user.toObject({ getters: true }) });
};

const updateCurrency = async (req, res, next) => {
  const { userId, currency } = req.body;

  console.log(currency);

  let user;
  try {
    user = await User.findById(userId);
  } catch (err) {
    console.log(err);
    const error = new HttpError("Could not find a user with that id.", 500);
    return next(error);
  }

  if (!user) {
    return next(new HttpError("User was not found", 404));
  }

  user.currency = currency;

  try {
    await user.save();
  } catch (err) {
    console.log(err);
    throw new HttpError("Something went wrong could not update.", 500);
  }

  res.status(201).json({ user: user.toObject({ getters: true }) });
};

const resetData = async (req, res, next) => {
  const { userId } = req.body;

  console.log("Resetting Data");

  let user;
  try {
    user = await User.findById(userId);
  } catch (err) {
    console.log(err);
    const error = new HttpError("Could not find a user with that id.", 500);
    return next(error);
  }

  if (!user) {
    return next(new HttpError("User was not found", 404));
  }

  user.netWorth = parseFloat(0);
  user.accounts = [];
  user.prevAccountDataSnapshots = [];

  try {
    await user.save();
  } catch (err) {
    console.log(err);
    throw new HttpError("Something went wrong - could not delete data.", 500);
  }

  res.status(201).json({ user: user.toObject({ getters: true }) });
};

const destroyAll = async (req, res, next) => {
  const { userId } = req.body;

  let user;
  try {
    user = await User.findById(userId);
  } catch (err) {
    console.log(err);
    const error = new HttpError("Could not find a user with that id.", 500);
    return next(error);
  }

  if (!user) {
    return next(new HttpError("User was not found", 404));
  }

  try {
    await user.deleteOne();
  } catch (err) {
    throw new HttpError(
      "Something went wrong - could not delete account.",
      500
    );
  }

  res.status(201).json({ message: "Account Deleted" });
};

exports.getUsers = getUsers;
exports.getUserById = getUserById;
exports.login = login;
exports.signup = signup;
exports.updateUser = updateUser;
exports.updateCurrency = updateCurrency;
exports.resetData = resetData;
exports.destroyAll = destroyAll;
