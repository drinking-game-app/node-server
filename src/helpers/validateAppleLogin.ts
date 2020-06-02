/*
 * File: validateAppleLogin.ts
 * Project: drinking-game-app-server
 * Version: 1.0.0
 * File Created: Friday, 22nd May 2020 12:18:09 pm
 * Author: Eoan O'Dea - eoan@wspace.ie
 * ---------------
 * File Description: Validates logins from Apple
 * Last Modified: Friday, 22nd May 2020 12:18:34 pm
 * Modified By: Eoan O'Dea - eoan@wspace.ie
 * ---------------
 * Copyright 2020 - WebSpace
 */

/**
 * JSON Web token import
 */
import jwt from "jsonwebtoken";

/**
 * Import fetch for request making
 */
import fetch from 'node-fetch'

/**
 * Importing environment variables
 */
import config from "./../../config/config";

/**
 * A user logging in with apple
 * being sent along with 
 * the request body
 */
interface IAppleUserBody {
  name: string;
  email: string;
}

/**
 * The request body being sent 
 * from the frontend
 */
interface IAppleRequestBody {
  token: string;
  user: IAppleUserBody;
}

/**
 * Verify the Apple JWT token sent from the frontend
 *
 * @param {Request} req
 * @param {Response} res
 */
export const loginWithApple = (body: IAppleRequestBody) => {
  return new Promise(async (resolve, reject) => {
    try {

      /**
       * Generate a clientSecret web token
       * using the ES256 algorithm
      */
      const clientSecret = await getClientSecret();

      /**
       * Get the apple bundle ID from
       * the environment variables
       */
      const clientId = config.apple_bundle_id;
      
      /**
       * Build the url with: 
       * -created client secret
       * -token from the request
       * -client ID from environment variables
       * -grant type
       */
      const urlBody = `code=${body.token}&client_secret=${clientSecret}&client_id=${clientId}&grant_type=authorization_code`;

      /**
       * Send a fetch request to apple to
       * confirm the auth token
       */
      let res: any = await fetch(`https://appleid.apple.com/auth/token`, {
        method: "POST",
        body: urlBody,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      })

      /**
       * If the response was ok (200),
       * parse the JSON and get the user
       */
      if(res.ok) {
        let jsonRes = await res.json()

        /**
         * Get the user from the JWT token
         */
        const decodedUser = getUser(jsonRes.id_token)

        /**
         * Build the user object
         * to be resolved back to 
         * the auth controller
         */
        let user: any = {
          email: decodedUser.email,
          refreshToken: jsonRes.refresh_token,
          accessToken: jsonRes.access_token,
        }

        /**
         * If the request body contained an email,
         * this means it is the first time this user
         * signed up, so attach their name to the object
         */
        if(body.user.email) user.name = body.user.name

        return resolve(user)
      }

      throw new Error(`Could not validate the user`);

    } catch (err) {
      console.log("error autenticating with Apple!", err);
      reject(err);
    }
  });
};

/**
 * Decode the user from
 * a JWT sent by apple
 * 
 * @param {string} token 
 */
const getUser = (token: string) => {
	const parts = token.split('.')
	try {
		return JSON.parse(Buffer.from(parts[1], 'base64').toString('ascii'))
	} catch (e) {
		return null
	}
}

/**
 * Generate a client secret to send to Apple
 */
const getClientSecret = async () => {
  const privateKey = config.apple_private_key.replace(/\\n/g, '\n');

  const headers = {
    kid: config.apple_key_id,
    // @ts-ignore
    typ: undefined,
    alg: "ES256",
  };
  const claims = {
    iss: config.apple_team_id,
    aud: "https://appleid.apple.com",
    sub: config.apple_bundle_id,
  };
  const token = jwt.sign(claims, privateKey, {
    algorithm: "ES256",
    header: headers,
    expiresIn: "24h",
  });
  return token;
};
