/*
 * File: auth.controller.ts
 * Project: drinking-game-app-server
 * Version: 1.0.0
 * File Created: Thursday, 7th May 2020 12:26:48 pm
 * Author: Eoan O'Dea - eoan@wspace.ie
 * ---------------
 * File Description: Controller for User Authentication
 * Last Modified: Thursday, 7th May 2020 12:29:06 pm
 * Modified By: Eoan O'Dea - eoan@wspace.ie
 * ---------------
 * Copyright 2020 - WebSpace
 */


/**
 * Primary dependencies
 */
import { Request, Response, NextFunction } from "express";
import RequestMiddleware from "../interfaces/express";

/**
 * Model Schema
 */
import User from "../models/user.model";

/**
 * JSON Web token imports
 */
import jwt from "jsonwebtoken";
import expressJwt from "express-jwt";

/**
 * Importing environment variables
 */
import config from "./../../config/config";

/**
 * Helpers for success / error responses
 */
import { handleError, handleSuccess } from "../helpers/responseHandler";

/**
 * Handle a user signin
 *
 * @param req
 * @param res
 */
export const signin = async (req: Request, res: Response) => {
    try {
        const {email, password} = req.body

        /**
         * Find a user with this email
         */
        const user: any = await User.findOne({email})

        /**
         * If no user is found, or if the password
         * doesn't match, drrthrow an error
         */
        if(!user) throw new Error(`No user exists with the email ${email}`)

        if(!user.authenticate(password)) throw new Error("Email and Password don't match")

        /**
         * Sign the user's unique ID into a
         * JSON Web Token string payload
         */
        const token = jwt.sign(
            {
              _id: user._id
            },
            config.jwtSecret
        );

        /**
         * Set the token as a cookie in the response
         */
        res.cookie("t", token, {
            expires: new Date(Date.now() + parseInt(config.SESSION_TTL, 10)),
            httpOnly: false
        });

        /**
         * Return a 200 response with the token and user
         */
        return res.status(200).json(
            handleSuccess({token, user})
        );

    } catch (err) {
        return res.status(401).json(handleError(err))
    }
}

/**
 * Clears the token from the response cookies
 * and responds with a 200 status
 *
 * @param req
 * @param res
 */
export const signout = (req: Request, res: Response) => {
    res.clearCookie("t");
    return res.status(200).json(handleSuccess("Signed out"))
};

/**
 * Ensure a user is signed in before continuing
 */
export const requireSignin = expressJwt({
  secret: config.jwtSecret,
  userProperty: "auth"
});

/**
 * Ensure a user has authorization, and is the logged in user before continuing
 * If not, respond with a 403 response
 */
export const hasAuthorization = (req: RequestMiddleware, res: Response, next: NextFunction) => {
    const authorized = req.profile && req.auth && req.profile._id.toString() === req.auth._id;

    if (!authorized) {
        return res.status(403).json(handleError("You are not authorized to access this information"));
    }

    next();
};