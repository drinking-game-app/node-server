/*
 * File: index.ts
 * Project: drinking-game-app-server
 * Version: 1.0.0
 * File Created: Thursday, 7th May 2020 10:42:01 am
 * Author: Eoan O'Dea - eoan@wspace.ie
 * ---------------
 * File Description: Entry point for the application, imports express and connects to the database
 * Last Modified: Thursday, 7th May 2020 11:45:23 am
 * Modified By: Eoan O'Dea - eoan@wspace.ie
 * ---------------
 * Copyright 2020 - WebSpace
 */

import config from '../config/config';
import app from './express';
import mongoose from 'mongoose';
import Session from 'express-session';

// Redis Database
import { createClient as createRedisClient } from 'redis';
// import connectRedis from 'connect-redis';
import { sockServer, onAuth, onLobbyCreate, onLobbyJoin, onUpdateSinglePlayer, onGetPlayers, onStartGame, startRound, throwToRoom, Player, Lobby,onReturnQuestions,Question } from '@rossmacd/gamesock-server';

/**
 * Mongoose Connection configurations
 */
const options = {
  useCreateIndex: true,
  useNewUrlParser: true,
  useFindAndModify: false,
  useUnifiedTopology: true,
};

/**
 * Creates a global mongoose promise
 */
mongoose.Promise = global.Promise;

/**
 * Connect using the config mongoURI and options
 */
mongoose.connect(config.mongoUri, options);

/**
 * Listen for an error
 */
mongoose.connection.on('error', () => {
  throw new Error(`unable to connect to database: ${config.mongoUri}`);
});

// // Configuration about your Redis session data structure.
// const redisClient = createRedisClient();
// // const RedisStore = connectRedis(Session);

// redisClient.on("error", (error) =>{
//   console.error(error);
// });

// redisClient.set("key", "lovelyTest");
// redisClient.get("key", (err,key)=>{
//   if(err){
//     console.log(err);
//   }else{
//   console.log(key);
// }
// });

// Game Code
const myLobbies: Lobby[] = [];

app.get('/stats', (req, res) => {
  let html = `<h1>Lobbies</h1>`;
  myLobbies.forEach((lobby, index) => (html = html + `<h5>Lobby ${index}</h5><p>${JSON.stringify(lobby)}</p>`));
  return res.status(200).send(html);
});

// Authorize function
onAuth((token: string) => {
  return true;
});

// Push lobby into local array
onLobbyCreate((newLobby) => {
  myLobbies.push(newLobby);
  return true;
});

// Push player into their lobby
onLobbyJoin((lobbyName, player) => {
  const plIndex = myLobbies.findIndex((lobby) => lobby.name === lobbyName);
  // don't join lobby if it dosnt exist
  if (plIndex === -1) return [];
  // Add player to lobby
  myLobbies[plIndex].players.push(player);
  return myLobbies[plIndex].players;
});

// Update a single player
onUpdateSinglePlayer((lobbyName: string, newPlayer: Player) => {
  console.log('Updating');
  // Get the lobby
  const lIndex = myLobbies.findIndex((lobby) => lobby.name === lobbyName);
  const pIndex = myLobbies[lIndex].players.findIndex((player: Player) => player.id === newPlayer.id);
  newPlayer = { ...newPlayer, name: 'Ultan', score: 0 };
  myLobbies[lIndex].players[pIndex] = newPlayer;
  return newPlayer;
});

// Get player list
onGetPlayers((lobbyName: string) => {
  // Get the lobby
  const lIndex = myLobbies.findIndex((lobby) => lobby.name === lobbyName);
  // Return player list
  return myLobbies[lIndex].players;
});

// Start the game
onStartGame((lobbyName: string, socketId: string) => {
  // Get the lobby
  const lIndex = myLobbies.findIndex((lobby) => lobby.name === lobbyName);
  // Check if we can start game
  if (myLobbies[lIndex].players.length > 2 || socketId === myLobbies[lIndex].players[0].id) {
    const gameOptions = {
      rounds: 3,
    };
    startRound(lobbyName, {
      roundNum:1,
      hotseatPlayers: [myLobbies[lIndex].players[0],myLobbies[lIndex].players[1]],
      numQuestions: 3,
      time:30,
    });
    return {
      ok: true,
      gameSettings: gameOptions,
    };
  } else {
    throwToRoom(lobbyName, 'Not enough players to start game!😲');
    console.log('Not enough players!');
    return {
      ok: false,
      gameSettings: null,
    };
  }
});

onReturnQuestions((lobbyName: string, questions: Question[], roundOptions) => {
  // This should shuffle the questions for debuggable results we just reverse
  return questions.reverse()
})

// Create http/s server
const server = sockServer(app, false);

// test

/**
 * Listen on the specified port, and for any errors
 */
server
  .listen(config.port, () => {
    console.info('Server started on port %s.', config.port);
  })
  .on('error', (err: any) => {
    console.error('Server Error: ', err);
  });
