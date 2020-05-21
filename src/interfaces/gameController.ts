/*
 * File: gameController.ts
 * Project: drinking-game-app-server
 * Version: 1.0.0
 * File Created: Thursday, 21st May 2020 3:11:04 pm
 * Author: Eoan O'Dea - eoan@wspace.ie
 * ---------------
 * File Description: Type interfaces for the game controller
 * Last Modified: Thursday, 21st May 2020 3:11:19 pm
 * Modified By: Eoan O'Dea - eoan@wspace.ie
 * ---------------
 * Copyright 2020 - WebSpace
 */



/**
 * Interface for a user within a lobby
 */
interface ILobbyUser {
    name: string;
    points: 0;
}

/**
 * Interface for a single lobby
 */
interface ILobby {
    name: string;
    isPlaying: boolean;
    round: 0;
    users: ILobbyUser;
}

/**
 * Interface for the Lobbies array of objects
 */
export interface ILobbies {
    [index: number]: ILobby
}