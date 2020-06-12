/*
 * File: express.ts
 * Project: drinking-game-app-server
 * Version: 1.0.0
 * File Created: Monday, 11th May 2020 2:14:53 pm
 * Author: Eoan O'Dea - eoan@wspace.ie
 * ---------------
 * File Description: Type interfaces for Express
 * Last Modified: Thursday, 21st May 2020 3:11:25 pm
 * Modified By: Eoan O'Dea - eoan@wspace.ie
 * ---------------
 * Copyright 2020 - WebSpace
 */

import { Request } from "express";
import { IUserDocument } from "../models/user.model";


/**
 * Extending Request to contain middleware
 */
export default interface RequestMiddleware extends Request {
    profile?: IUserDocument
    auth?: IUserDocument
}