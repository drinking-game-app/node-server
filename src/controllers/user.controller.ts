/*
 * File: user.controller.ts
 * Project: drinking-game-app-server
 * Version: 1.0.0
 * File Created: Thursday, 7th May 2020 11:47:08 am
 * Author: Eoan O'Dea - eoan@wspace.ie
 * ---------------
 * File Description: Controller for the User Model
 * Last Modified: Thursday, 7th May 2020 11:52:10 am
 * Modified By: Eoan O'Dea - eoan@wspace.ie
 * ---------------
 * Copyright 2020 - WebSpace
 */


/**
 * Primary dependencies
 */
import { Request, Response } from "express";

/**
 * Model Schema
 */
import User from "../models/user.model";

/**
 * Helpers for sucess and error responses
 */
import { handleSuccess, handleError } from "../helpers/responseHandler";

/**
 * Create a user in the database
 *
 * @param req
 * @param res
 */
export const create = async (req: Request, res: Response) => {
  try {
    const user = new User(req.body);

    const response = await user.save();

    return res.status(200).json(handleSuccess(response));
  } catch (err) {
    return res.status(400).json(handleError(err));
  }
};

/**
 * Retreive all users from the database
 *
 * @param req
 * @param res
 */
export const list = async (req: Request, res: Response) => {
  try {
    const users = await User.find({});

    return res.status(200).json(handleSuccess(users));
  } catch (err) {
    return res.status(400).json(handleError(err));
  }
};

/**
 * Retreive a user by ID from the database
 *
 * @param req
 * @param res
 */
export const show = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('_id name email created');

    return res.status(200).json(handleSuccess(user));
  } catch (err) {
    return res.status(400).json(handleError(err));
  }
};

/**
 * Update a user by ID
 *
 * @param req
 * @param res
 */
export const update = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(id, req.body, {new: true});

    return res.status(200).json(handleSuccess(user));
  } catch (err) {
    return res.status(400).json(handleError(err));
  }
};

/**
 * Delete a user by ID
 *
 * @param req
 * @param res
 */
export const remove = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await User.deleteOne({ _id: id });

    return res.status(200).json(handleSuccess(user));
  } catch (err) {
    return res.status(400).json(handleError(err));
  }
};
