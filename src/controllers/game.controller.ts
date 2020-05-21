/*
 * File: game.controller.ts
 * Project: drinking-game-app-server
 * Version: 1.0.0
 * File Created: Thursday, 21st May 2020 1:24:40 pm
 * Author: Eoan O'Dea - eoan@wspace.ie
 * ---------------
 * File Description: Main controller for the game
 * Last Modified: Thursday, 21st May 2020 3:21:03 pm
 * Modified By: Eoan O'Dea - eoan@wspace.ie
 * ---------------
 * Copyright 2020 - WebSpace
 */



import { Application } from "express";
import GameSock from "@rossmacd/gamesock-server";
import { ILobbies } from "../interfaces/gameController";

const lobbies: ILobbies = [];

/**
 * Main Game Controller
 *
 * Handles all functions within a game
 *
 * @param {Application} app
 * @param {boolean} https
 */
export const gameController = (app: Application, https: boolean) => {
  /**
   * Check if the user is authenticated
   * before allowing them to continue
   *
   * Takes in a JWT token
   *
   * @param {string} token
   *
   * @returns {boolean}
   */
  GameSock.onAuth((token: string) => {
    /**
     * @todo check JWT token and confirm auth
     */

    return true;
  });

  /**
   * On creating a lobby
   *
   * @param {ILobby} lobby
   */
  GameSock.onLobbyCreate((lobby) => {
    /**
     * @todo check if the lobby doesn't already exist
     */

    return true;
  });

  /**
   * On joining a lobby
   *
   * @param {string} lobbyName
   * @param {Player} player
   */
  GameSock.onLobbyJoin((lobbyName, player) => {
    /**
     * @todo check if the lobby allows players
     */

    return true;
  });

  /**
   * When a player is ready within a lobby
   *
   * @param {string} lobbyName
   * @param {string} playerId
   */
  GameSock.onPlayerReady((lobbyName, playerId) => {
    /**
     * @todo if all players are ready start the game
     */

    /**
     * Returning 0 is the host
     */
    return 0;
  });

  /**
   * Return the socket server to express
   */
  return GameSock.sockServer(app, https);
};
