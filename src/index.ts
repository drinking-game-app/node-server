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



import config from '../config/config'
import app from './express'
import mongoose from 'mongoose'
import Session from 'express-session'

// Redis Database
import { createClient as createRedisClient } from 'redis';
// import connectRedis from 'connect-redis';

// @ts-ignore
// import sockServer from '@rossmacd/gamesock-server'
import {
  sockServer,
  onAuth,
  onLobbyCreate,
  onLobbyJoin,
  onPlayerReady,
  onUpdateSinglePlayer,
  onGetPlayers,
  Player,
  Lobby
} from '@rossmacd/gamesock-server'

/**
 * Mongoose Connection configurations
 */
const options = {
  useCreateIndex: true,
  useNewUrlParser: true,
  useFindAndModify: false,
  useUnifiedTopology: true
}

/**
 * Creates a global mongoose promise
 */
mongoose.Promise = global.Promise

/**
 * Connect using the config mongoURI and options
 */
mongoose.connect(config.mongoUri, options)

/**
 * Listen for an error
 */
mongoose.connection.on('error', () => {
  throw new Error(`unable to connect to database: ${config.mongoUri}`)
})


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
// override auth function
// gamesock.onAuth((token:string)=>{
//   console.log(token);
//   return true
// });
const myLobbies:Lobby[]=[];

app.get('/stats',(req,res)=>{
  let html=`<h1>Lobbies</h1>`
  myLobbies.forEach((lobby,index)=>html=html+`<h5>Lobby ${index}</h5><p>${ JSON.stringify(lobby)}</p>`)
  return res.status(200).send(html)}
)

// Authorize function
onAuth((token: string) => {
  return true;
});

// Push lobby into local array
onLobbyCreate((newLobby)=>{
  myLobbies.push(newLobby);
  return true
})

// Push player into their lobby
onLobbyJoin((lobbyName, player)=>{
  const plIndex = myLobbies.findIndex(lobby=>lobby.name===lobbyName);
  // don't join lobby if it dosnt exist
  if(plIndex===-1) return []
  // Add player to lobby
  myLobbies[plIndex].players.push(player);
  return myLobbies[plIndex].players
})

// Set player Status to ready
onPlayerReady((lobbyName:string, playerId:string)=>{
  // Get the lobby
  const lIndex = myLobbies.findIndex(lobby=>lobby.name===lobbyName);
  // Get the player
  const pIndex = myLobbies[lIndex].players.findIndex((player:Player)=>player.id===playerId);
  // Set the status to ready server-side
  myLobbies[lIndex].players[pIndex].ready=true;
  // Broadcast the playerNumber back to the others
  return pIndex
})

// Update a single player
onUpdateSinglePlayer((lobbyName:string, player:Player)=>{
  console.log('Updating')
  // Get the lobby
  // const lIndex = myLobbies.findIndex(lobby=>lobby.name===lobbyName);
  player.name = 'Ultan';
  return player;
})

// Get player list
onGetPlayers((lobbyName:string)=>{
  // Get the lobby
  const lIndex = myLobbies.findIndex(lobby=>lobby.name===lobbyName);
  // Return player list
  return myLobbies[lIndex].players;
})

// Create http/s server
const server = sockServer(app, false);


/**
 * Listen on the specified port, and for any errors
 */
server.listen(config.port, () => {
  console.info('Server started on port %s.', config.port)
})
.on("error", (err: any) => {
  console.error("Server Error: ", err)
})
