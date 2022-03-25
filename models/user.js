const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const userSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  age: {
    type: Number,
  },
  ageToRetire: {
    type: Number,
  },
  firstCreated: {},
  lastUpdated: {
    type: Date,
  },
  netWorth: {
    type: Number,
  },
  targetWorth: {
    type: Number,
  },
  worthDateTarget: {
    type: Date,
  },
  drawDownAmount: {
    type: Number,
  },
  monthlyIncrease: {
    type: Number,
  },
  firstTimeUser: {
    type: Boolean,
    default: true,
  },
  currency: {
    type: String,
    default: "£",
  },
  accountList: [
    {
      type: String,
    },
  ],

  accounts: [
    {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: "Account",
    },
  ],
  prevAccountDataSnapshots: [],
});

module.exports = mongoose.model("User", userSchema);
