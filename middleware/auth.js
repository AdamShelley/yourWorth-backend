const jwt = require("jsonwebtoken");
const HttpError = require("../models/http-error");

module.exports = (req, res, next) => {
  if (req.method === "OPTIONS") {
    return next();
  }

  try {
    const token = req.headers.authorization.split(" ")[1];
    // No header set
    if (!token) throw new Error("Authentication failed");
    // Verify JWT
    const decodedToken = jwt.verify(token, "chernobyl");
    req.userData = {
      userId: decodedToken.userId,
    };
    next();
  } catch (err) {
    // No token
    return next(new HttpError("Authentication failed", 401));
  }
};
