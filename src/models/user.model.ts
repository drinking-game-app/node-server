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
import crypto from 'crypto'

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

/**
 * Encrypt the password
 * And make the salt
 */
UserSchema
  .virtual('password')
  .set(function(password: string) {
    this._password = password
    this.salt = this.makeSalt()
    this.hashed_password = this.encryptPassword(password)
  })
  .get(function() {
    return this._password
  })

/**
 * Validate the hashed password
 */
UserSchema.path('hashed_password').validate(function() {
  if (this._password && this._password.length < 6) {
    this.invalidate('password', 'Password must be at least 6 characters.')
  }
  if (this.isNew && !this._password) {
    this.invalidate('password', 'Password is required')
  }
}, null)

/**
 * Declaring methods for the User Schema
 */
UserSchema.methods = {
  authenticate(plainText: string) {
    return this.encryptPassword(plainText) === this.hashed_password
  },
  encryptPassword(password: string) {
    if (!password) return ''
    try {
      return crypto
        .createHmac('sha1', this.salt)
        .update(password)
        .digest('hex')
    } catch (err) {
      return ''
    }
  },
  makeSalt() {
    return Math.round((new Date().valueOf() * Math.random())) + ''
  }
}

const User = mongoose.model<UserInterface>("User", UserSchema);
export default User;