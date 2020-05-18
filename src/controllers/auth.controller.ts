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
 * Google oAuth Import & Initialization
 */
import {OAuth2Client} from 'google-auth-library';

const client = new OAuth2Client(config.google_client_id)

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
            handleSuccess({token, user: {name: user.name, email: user.email, _id: user._id}})
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


/**
 * Verify the Google JWT token sent from the frontend
 *
 * @param {Request} req
 * @param {Response} res
 */
export const loginWithGoogle = async(req: Request, res: Response) => {
    try {
        /**
         * Verify the token created in the frotnend
         * with Google, along with our client ID
         */
        const ticket = await client.verifyIdToken({
            idToken: req.body.token,
            audience: config.google_client_id,
        });

        /**
         * Get the payload from the verified ticket
         */
        const payload = ticket.getPayload();

        /**
         * Create a user object from 
         * the ticket payload
         */
        const user: any = {
            name: payload.name,
            email: payload.email,
            oAuthToken: payload.sub,
        }

        /**
         * Either create or update a user in our database
         * with the email provided from the ticket payload
         */
        const response = await User.findOneAndUpdate(
            {'email': user.email},
            user,
            {
                new: true,
                upsert: true
            }
        )

        /**
         * Sign the user's unique ID into a
         * JSON Web Token string payload
         */
        const token = jwt.sign(
            {
              _id: response._id
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
            handleSuccess({token, user: {name: response.name, email: response.email, _id: response._id}})
        );

    } catch(err) {
        return res.status(401).json(handleError(err))
    }
}
