/*
 * File: validateGoogleLogin.ts
 * Project: drinking-game-app-server
 * Version: 1.0.0
 * File Created: Friday, 22nd May 2020 12:18:09 pm
 * Author: Eoan O'Dea - eoan@wspace.ie
 * ---------------
 * File Description: Validates logins from Google
 * Last Modified: Friday, 22nd May 2020 12:19:00 pm
 * Modified By: Eoan O'Dea - eoan@wspace.ie
 * ---------------
 * Copyright 2020 - WebSpace
 */

/**
 * Importing environment variables
 */
import config from "./../../config/config";

/**
 * Google oAuth Import & Initialization
 */
import { OAuth2Client } from "google-auth-library";

/**
 * Whatever device the login with google
 * request came from, return the associated
 * google oAuth client id
 *
 * @param {string} type
 */
const getAudienceFromType = (type: string) => {
    switch (type) {
      case "ios":
        return config.env === 'development' ? config.dev_ios_google_client_id : config.prod_ios_google_client_id;
      case "android":
        return config.dev_android_google_client_id;
      default:
        return config.google_client_id;
    }
  };


/**
 * Verify the Google JWT token sent from the frontend
 *
 * @param {Request} req
 * @param {Response} res
 */
export const loginWithGoogle = (type: string, token: string, accessToken: string = null) => {
    return new Promise(async (resolve, reject) => {

      /**
       * Get the config variable depending on the request type
       *
       * -ios
       * -android
       * -web
       */
      const audience = getAudienceFromType(type);

      /**
       * Initialize the oAuth client with the config variable
       */
      const client = new OAuth2Client(audience);

      try {
        /**
         * Verify the token created in the frotnend
         * with Google, along with our client ID
         */
        const ticket = await client.verifyIdToken({
          idToken: token,
          audience,
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
        };

        /**
         * For iOS & Android only
         * If the user has a access token, store it in the DB
         */
        if (accessToken) user.accessToken = accessToken;

        resolve(user);
      } catch (err) {
        console.log("error autenticating with Google!", err);
        reject(err);
      }
    });
  };



