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

interface IAppleRequestBody {
  token: string;
  name: string;
  email: string;
}

/**
 * Verify the Apple JWT token sent from the frontend
 *
 * @param {Request} req
 * @param {Response} res
 */
export const loginWithApple = (type: string, body: IAppleRequestBody) => {
  return new Promise(async (resolve, reject) => {
    try {

      const clientSecret = await getClientSecret();
      /**
       * @todo Find out what the fuck this is
       */
      const clientId = config.apple_bundle_id;


      /**
       * Verify the token created in the frotnend
       * with Apple, along with our client ID
       */
        console.log("commencing apple verification!", body)
      /**
       * Build the url with all the appropiate information
       */
      const urlBody = `code=${body.token}&client_secret=${clientSecret}&client_id=${clientId}&grant_type=authorization_code`;

      /**
       * Send a fetch request to apple to
       * confirm the auth token
       */
      const res: any = await fetch(`https://appleid.apple.com/auth/token`, {
        method: "POST",
        body: urlBody,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      })

      const jsonRes = await res.JSON()
      
      
      console.log('JSON apple response!', jsonRes)

      if(res.status === 200) {
        return resolve({
          name: body.name,
          email: body.email,
          oAuthToken: body.token
        })
      }

      throw new Error(`Could not validate the user`);
      // console.log('user ID!!!', getUserId(res.data.id_token))

      // /**
      //  * Create the user from the res payload
      //  */
      // const user: any = {
      //   name: res.name,
      //   email: res.email,
      //   oAuthToken: res.sub,
      // };

      // resolve(null);
    } catch (err) {
      console.log("error autenticating with Apple!", err);
      reject(err);
    }
  });
};

const getUserId = (token: string) => {
	const parts = token.split('.')
	try {
		return JSON.parse(new Buffer(parts[1], 'base64').toString('ascii'))
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
