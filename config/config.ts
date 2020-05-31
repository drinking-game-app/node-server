/*
 * File: config.ts
 * Project: drinking-game-app-server
 * Version: 1.0.0
 * File Created: Thursday, 7th May 2020 11:02:28 am
 * Author: Eoan O'Dea - eoan@wspace.ie
 * ---------------
 * File Description: Imports environment variables and allows them to be accessed during runtime
 * Last Modified: Thursday, 7th May 2020 11:02:46 am
 * Modified By: Eoan O'Dea - eoan@wspace.ie
 * ---------------
 * Copyright 2020 - WebSpace
 */


import dotenv from 'dotenv'
dotenv.config()

const config = {
    env: process.env.NODE_ENV || "development",
    port: process.env.PORT || 3000,
    mongoUri: process.env.MONGO_URI || "",
    CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || "http://localhost:3000",
    jwtSecret: process.env.JWT_SECRET,
    SESSION_TTL: process.env.SESSION_TTL,
    google_client_id: process.env.GOOGLE_CLIENT_ID,
    prod_ios_google_client_id: process.env.PROD_IOS_GOOGLE_CLIENT_ID,
    dev_ios_google_client_id: process.env.DEV_IOS_GOOGLE_CLIENT_ID,
    dev_android_google_client_id: process.env.DEV_ANDROID_GOOGLE_CLIENT_ID,
    prod_android_google_client_id: process.env.PROD_ANDROID_GOOGLE_CLIENT_ID,
    apple_private_key:  process.env.APPLE_PRIVATE_KEY,
    apple_key_id: process.env.APPLE_KEY_ID,
    apple_team_id: process.env.APPLE_TEAM_ID,
    apple_bundle_id: process.env.APPLE_BUNDLE_ID
}

export default config