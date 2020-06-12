/*
 * File: dbErrorHandler.ts
 * Project: drinking-game-app-server
 * Version: 1.0.0
 * File Created: Saturday, 16th May 2020 8:34:28 pm
 * Author: Eoan O'Dea - eoan@wspace.ie
 * ---------------
 * File Description: Removing sensitive information from DB errors and transforming them into a somewhat readable message
 * Last Modified: Saturday, 16th May 2020 8:34:34 pm
 * Modified By: Eoan O'Dea - eoan@wspace.ie
 * ---------------
 * Copyright 2020 - WebSpace
 */


'use strict'

/**
 * Get unique error field name
 */
const getUniqueErrorMessage = (err: any) => {
    let output

    try {
        const obj = err.keyValue
        const arr = Object.entries(obj)

        const msg = `${arr.map(dat => dat)} already exists`

        output = msg.replace(","," ")
    } catch (ex) {
        output = 'Unique field already exists'
    }

    return output
}

/**
 * Get the error message from error object
 */
const getErrorMessage = (err: any) => {
    let message = ''

    if (err.code) {
        switch (err.code) {
            case 11000:
            case 11001:
                message = getUniqueErrorMessage(err)
                break
            default:
                message = 'Something went wrong'
        }
    } else {
        for (const errName in err.errors) {
            if (err.errors[errName].message) message = err.errors[errName].message
        }
    }

    return message
}

export default getErrorMessage

