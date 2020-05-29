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
import GameSock, { Lobby, Player } from "@rossmacd/gamesock-server";

const lobbies: Lobby[] = [];

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
  GameSock.onLobbyCreate((lobby: Lobby) => {
    /**
     * @todo check if the lobby doesn't already exist
     */
    if (lobbies.filter((dat) => dat.name === lobby.name).length > 0)
      return false;
    console.log("lobby created", lobby);

    lobbies.push(lobby);
    return true;
  });

  /**
   * On joining a lobby
   *
   * @param {string} lobbyName
   * @param {Player} player
   */
  GameSock.onLobbyJoin((lobbyName: string, player: Player) => {
    let returnLobbies: Player[] = [];

    lobbies.forEach((lobby) => {

      const playerExists = lobby.players.find(
        (lobbyPlayer: Player) => lobbyPlayer.name === player.name
      );

      if (lobby.name === lobbyName && !playerExists) {
        lobby.players.push(player);
        returnLobbies = lobby.players;
      } else GameSock.throwToRoom(lobbyName, 'Player is already in this lobby')
    });

    return returnLobbies;
  });

  /**
   * Update a single player
   */
  GameSock.onUpdateSinglePlayer((lobbyName: string, player: Player) => {
    const lIndex = findLobbyIndex(lobbyName)
    const pIndex = findPlayerIndex(lIndex, player.id)

    player = { ...player, score: 0 };
    lobbies[lIndex].players[pIndex] = player;

    return player;
  });



// Get player list
GameSock.onGetPlayers((lobbyName: string) => {
  // Get the lobby
  const lIndex = findLobbyIndex(lobbyName)
  // Return player list
  return lobbies[lIndex].players;
});

// Start the game
GameSock.onStartGame((lobbyName: string, socketId: string) => {
  // Get the lobby
  const lIndex = findLobbyIndex(lobbyName)
  // Check if we can start game
  if (lobbies[lIndex].players.length > 2 && socketId === lobbies[lIndex].players[0].id) {
    const gameOptions = {
      rounds: 3,
    };
    GameSock.startRound(lobbyName, {
      roundNum:1,
      hotseatPlayers: pickPlayers(lobbies[lIndex].players),
      numQuestions: 3,
      time:0,
      timerStart:0
    });
    return {
      ok: true,
      gameSettings: gameOptions,
    };
  } else {
    GameSock.throwToRoom(lobbyName, 'Not enough players to start game!😲');
    console.log('Not enough players!');
    return {
      ok: false,
      gameSettings: null,
    };
  }
});

/**
 * Picks players for the hotseat
 *
 * @todo - some random picking in here
 *
 * @param {Player[]} players
 */
const pickPlayers = (players: Player[]):[Player,Player] => {
  return [players[0], players[1]]
}






  /**
   * Find a lobby index using a lobby name
   *
   * @param {string} lobbyName
   * @return {number} index
   */
  const findLobbyIndex = (lobbyName: string): number => {
   return lobbies.findIndex((lobby) => lobby.name === lobbyName);
  }

  /**
   * Find a player index using a lobby number and playerId
   *
   * @param {string} lobbyName
   * @param {string} playerId
   * @return {number} index
   */
  const findPlayerIndex = (lobbyNumber: number, playerId:string): number => {
    return lobbies[lobbyNumber].players.findIndex((player: Player) => playerId === player.id);
   }

  /**
   *
   * Return the socket server to express
   */
  return GameSock.sockServer(app, https);
};
