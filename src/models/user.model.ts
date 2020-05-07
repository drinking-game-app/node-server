/*
 * File: user.model.ts
 * Project: drinking-game-app-server
 * Version: 1.0.0
 * File Created: Thursday, 7th May 2020 11:47:08 am
 * Author: Eoan O'Dea - eoan@wspace.ie
 * ---------------
 * File Description: Model which represents the User schema
 * Last Modified: Thursday, 7th May 2020 11:47:27 am
 * Modified By: Eoan O'Dea - eoan@wspace.ie
 * ---------------
 * Copyright 2020 - WebSpace
 */

import mongoose, { Schema, Document } from "mongoose";

/**
 * Type declaration for User
 */
interface UserInterface extends Document {
  name: string;
  created: Date;
  updated: Date;
  email: string;
  hashed_password: string;
  salt: string;
  resetPasswordToken: string;
  resetPasswordExpires: Date;
  confirmEmailToken: string;
  confirmEmailTokenExpires: string;
}

/**
 * Schema for a user
 */
const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  created: {type: Date, default: Date.now},
  updated: {type: Date},
  email: {
    type: String,
    trim: true,
    unique: 'Email already exists',
    match: [/.+\@.+\..+/, 'Please fill a valid email address'],
    required: 'Email is required'
  },
  hashed_password: {
    type: String,
    required: "Password is required"
  },
  salt: String,
  resetPasswordToken: {
    type: String
  },
  resetPasswordExpires: {
    type: Date
  },
  confirmEmailToken: {
    type: String
  },
  confirmEmailTokenExpires: {
    type: Date
  }
});

const User = mongoose.model<UserInterface>("User", UserSchema);
export default User;