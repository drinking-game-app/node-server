/*
 * File: user.routes.ts
 * Project: drinking-game-app-server
 * Version: 1.0.0
 * File Created: Thursday, 7th May 2020 11:47:08 am
 * Author: Eoan O'Dea - eoan@wspace.ie
 * ---------------
 * File Description: Routes for the User collection
 * Last Modified: Thursday, 7th May 2020 12:00:15 pm
 * Modified By: Eoan O'Dea - eoan@wspace.ie
 * ---------------
 * Copyright 2020 - WebSpace
 */


import express from 'express'
import * as userCtrl from '../controllers/user.controller'

const router = express.Router()
const prefix = "/api/user"

/**
 * @method POST - Create a new user
 * @method GET - List all users by a track
 */
router.route(`${prefix}`)
    .post(userCtrl.create)
    .get(userCtrl.list)

/**
 * @method GET - User By ID
 * @method PUT - Update a user by ID
 * @method DELETE - Delete a user by ID
 */
router.route(`${prefix}/:id`)
    .get(userCtrl.show)
    .put(userCtrl.update)
    .delete(userCtrl.remove)


export default router