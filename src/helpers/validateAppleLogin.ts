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
 * Import fs from node
 */
import fs from "fs-extra";

/**
 * Import fetch for request making
 */
import fetch from 'node-fetch'

/**
 * Importing environment variables
 */
import config from "./../../config/config";

/**
 * Verify the Apple JWT token sent from the frontend
 *
 * @param {Request} req
 * @param {Response} res
 */
export const loginWithApple = (type: string, token: string) => {
  return new Promise(async (resolve, reject) => {
    try {
    console.log('starting login with apple')

      const clientSecret = await getClientSecret();
      /**
       * @todo Find out what the fuck this is
       */
      const clientId = config.apple_bundle_id;

      /**
       * Verify the token created in the frotnend
       * with Apple, along with our client ID
       */

      /**
       * Build the url with all the appropiate information
       */
      const requestBody: any = {
        grant_type: 'authorization_code',
        code: token,
        client_id: clientId,
        client_secret: clientSecret,
      }
      const urlBody = `code=${token}&client_secret=${clientSecret}&client_id=${clientId}&grant_type=authorization_code`;
        console.log('url!', urlBody)
      /**
       * Send a fetch request to apple to
       * confirm the auth token
       */
      const res: any = await fetch(`https://appleid.apple.com/auth/token`, {
        method: "POST",
        // @ts-ignore
        // data: querystring.stringify(requestBody),
        body: urlBody,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });
      // if(res.body.error)
      console.log('apple response!', res)

      /**
       * Create the user from the res payload
       */
      const user: any = {
        name: res.name,
        email: res.email,
        oAuthToken: res.sub,
      };

      resolve(user);
    } catch (err) {
      console.log("error autenticating with Apple!", err);
      reject(err);
    }
  });
};

/**
 * Generate a client secret to send to Apple
 */
const getClientSecret = async () => {
  const privateKey = await fs.readFile(config.private_key_file_path);
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
