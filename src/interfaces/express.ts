import { Request } from "express";
import { IUserDocument } from "../models/user.model";


/**
 * Extending Request to contain middleware
 */
export default interface RequestMiddleware extends Request {
    profile?: IUserDocument
    auth?: IUserDocument
}