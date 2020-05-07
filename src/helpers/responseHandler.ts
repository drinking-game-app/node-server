/*
 * File: responseHandler.ts
 * Project: drinking-game-app-server
 * Version: 1.0.0
 * File Created: Thursday, 7th May 2020 11:57:13 am
 * Author: Eoan O'Dea - eoan@wspace.ie
 * ---------------
 * File Description: Helpers for controller business logic
 * Last Modified: Thursday, 7th May 2020 11:57:32 am
 * Modified By: Eoan O'Dea - eoan@wspace.ie
 * ---------------
 * Copyright 2020 - WebSpace
 */


/**
 * Sort data for a successful response
 *
 * @param data
 */
export const handleSuccess = (data: any) => {
    return {
        sucess: true,
        data
    }
}

/**
 * Sort data for a error response
 *
 * @param error
 */
export const handleError = (error: any) => {
    const errorString = typeof error !== 'string'
    ? error.message
    : error

    return {
        sucess: false,
        error: errorString
    }
}
