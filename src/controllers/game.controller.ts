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

// import { Application } from "express";
// import GameSock, { Lobby, Player } from "@rossmacd/gamesock-server";

// const lobbies: Lobby[] = [];

// /**
//  * Main Game Controller
//  *
//  * Handles all functions within a game
//  *
//  * @param {Application} app
//  * @param {boolean} https
//  */
// export const gameController = (app: Application, https: boolean) => {
//   /**
//    * Check if the user is authenticated
//    * before allowing them to continue
//    *
//    * Takes in a JWT token
//    *
//    * @param {string} token
//    *
//    * @returns {boolean}
//    */
//   GameSock.onAuth((token: string) => {
//     /**
//      * @todo check JWT token and confirm auth
//      */

//     return true;
//   });

//   /**
//    * On creating a lobby
//    *
//    * @param {ILobby} lobby
//    */
//   GameSock.onLobbyCreate((lobby: Lobby) => {
//     /**
//      * @todo check if the lobby doesn't already exist
//      */
//     if (lobbies.filter((dat) => dat.name === lobby.name).length > 0)
//       return false;
//     console.log("lobby created", lobby);

//     lobbies.push(lobby);
//     return true;
//   });

//   /**
//    * On joining a lobby
//    *
//    * @todo return either an empty array or array of players
//    *
//    * @param {string} lobbyName
//    * @param {Player} player
//    */
//   GameSock.onLobbyJoin((lobbyName: string, player: Player) => {
//     /**
//      * @todo check if the lobby allows players
//      */
//     let returnLobbies: Player[] = [];
//     lobbies.forEach((lobby) => {
//       const playerExists = lobby.players.find(
//         (lobbyPlayer: Player) => lobbyPlayer.name === player.name
//       );
//       if (lobby.name === lobbyName && !playerExists) {
//         lobby.players.push(player);
//         returnLobbies = lobby.players;
//       }
//     });

//     return returnLobbies;
//   });

//   /**
//    * When a player is ready within a lobby
//    *
//    * @param {string} lobbyName
//    * @param {string} playerId
//    */
//   GameSock.onPlayerReady((lobbyName: string, playerId: string) => {
//     /**
//      * @todo if all players are ready start the game
//      */
//     console.log("player ready", lobbyName, playerId);
//     /**
//      * Returning 0 is the host
//      */
//     return 0;
//   });

//   // Update a single player
//   GameSock.onUpdateSinglePlayer((lobbyName: string, player: Player) => {
//     console.log("Updating");
//     // Get the lobby
//     // const lIndex = myLobbies.findIndex(lobby=>lobby.name===lobbyName);
//     player.name = "Ultan";
//     return player;
//   });

//   /**
//    * Return the socket server to express
//    */
//   return GameSock.sockServer(app, https);
// };
