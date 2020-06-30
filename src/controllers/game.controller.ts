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

import { Application } from 'express';
import GameSock, { Lobby, Player, Question, RoundOptions, onClaimSocket, updatePlayers } from '@rossmacd/gamesock-server';
import jwt from 'jsonwebtoken';
import config from '../../config/config';
import _ from 'underscore';
import fs from 'fs';
import { readFileSync, readFile } from 'fs';
import http from 'http';
import https from 'https';
import { questionList as allQuestions } from '../data/Questions.json';


interface GameOptions {
  rounds: number;
  numQuestions: number;
  timeToWriteQuestions: number;
  timeToAnswerQuestions: number;
  timeBetweenQuestions: number;
  timeBetweenRounds: number;
  points: number;
}

const defaultGameOptions: GameOptions = {
  rounds: 3,
  numQuestions: 2,
  timeToWriteQuestions: 45,
  timeToAnswerQuestions: 5,
  timeBetweenQuestions: 8,
  timeBetweenRounds: 10000,
  points: 1,
};

interface CustomLobby extends Lobby {
  ready: boolean;
}

const lobbies: Map<string, CustomLobby> = new Map();

/**
 * Main Game Controller
 *
 * Handles all functions within a game
 *
 * @param {Application} app
 * @param {boolean} https
 */
export const gameController = (app: Application) => {
  if (process.env.NODE_ENV === 'development') {
    app.get('/', (req, res) => {
      app.set('json spaces', 4);
      res.type('json');
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify([...lobbies]));
    });
  }

  /**
   * This route checks if a game is still in progress
   */
  app.post('/api/gameActive', (req, res) => {
    if (lobbies.has(req.body.lobbyName) && lobbies.get(req.body.lobbyName).players.some((player) => player.id === req.body.id)) {
      res.send({ active: true });
    } else {
      res.send({ active: false });
    }
  });

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
    try {
      const verified = jwt.verify(token, config.jwtSecret);

      return true;
    } catch (err) {
      console.log('User is not authenticated', err);
      return false;
    }
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
    if (lobbies.has(lobby.name)) return false;
    console.log('lobby created', lobby);
    // Convert to extended version of the lobby
    const customLobby: CustomLobby = { ...lobby, ready: true };
    lobbies.set(lobby.name, customLobby);
    // throw new Error('Test')
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
    if (lobbies.has(lobbyName) && findPlayerIndexByName(lobbyName, player.name) === -1 && lobbies.get(lobbyName).ready && lobbies.get(lobbyName).round === 0) {
      lobbies.get(lobbyName).players.push(player);
      returnLobbies = lobbies.get(lobbyName).players;
    } else GameSock.throwToRoom(lobbyName, 'Player is already in this lobby');

    return returnLobbies;
  });

  /**
   * Update a single player
   */
  GameSock.onUpdateSinglePlayer((lobbyName: string, player: Player) => {
    // const lIndex = findLobbyIndex(lobbyName);
    const pIndex = findPlayerIndex(lobbyName, player.id);

    player = { ...player, score: 0 };
    lobbies.get(lobbyName).players[pIndex] = player;

    return player;
  });

  // Get player list
  GameSock.onGetPlayers((lobbyName: string) => {
    console.log('getting players', lobbies.get(lobbyName).players);
    // Return player list
    return lobbies.get(lobbyName).players;
  });

  // Start the game
  GameSock.onStartGame((lobbyName: string, socketId: string) => {
    console.log('starting GAMEEEE', lobbyName, socketId);
    // Remove players who have disconnected:
    if (lobbies.has(lobbyName) && lobbies.get(lobbyName).unclaimedIps.size > 0) {
      lobbies.get(lobbyName).unclaimedIps.forEach((value, key, map) => {
        lobbies.get(lobbyName).players = lobbies.get(lobbyName).players.filter((player) => player.id !== key);
        console.log('Filtered', lobbies.get(lobbyName).players);
        lobbies.get(lobbyName).unclaimedIps.delete(key);
      });
      console.log('hell nag', lobbies.get(lobbyName).players);
      updatePlayers(lobbyName, lobbies.get(lobbyName).players);
      return {
        ok: false,
        gameSettings: null,
      };
    }

    // Check if we can start game
    if (lobbies.has(lobbyName) && lobbies.get(lobbyName).players.length > 2 && socketId === lobbies.get(lobbyName).players[0].id) {
      lobbies.get(lobbyName).round = 1 as 0;
      lobbies.get(lobbyName).questions = [];

      const gameOptions = {
        // Total rounds
        rounds: defaultGameOptions.rounds,
      };

      const pickedPlayers = pickPlayers(lobbies.get(lobbyName), gameOptions.rounds);
      lobbies.get(lobbyName).hotseatPairs = pickedPlayers as [Player, Player][];
      onRoundStart(lobbyName, pickedPlayers[0]);

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
   * Questions being returned to the server after phase 1
   *
   * @param {string} lobbyName
   * @param {Question[]} questions
   * @param roundOptions
   */
  GameSock.onReturnQuestions((lobbyName: string, questions: Question[], roundOptions) => {
    if (!lobbies.has(lobbyName)) return [];
    // Randomize question order
    const newQuestionList = shuffleArray(questions);
    console.log('return questions!!!dgnsaiogndsaiogdns', newQuestionList);
    // Store the questions
    lobbies.get(lobbyName).questions = newQuestionList;
    return newQuestionList;
  });

  /**
   * When a player answers a question, store it in the question
   *
   * question[0] = {question: 'string', answer: number, playerId: string}
   *
   * @param {string} lobbyName
   * @param {string} socketId
   * @param {number} questionNumber
   * @param {number} answer
   */
  GameSock.onAnswerQuestions((lobbyName, socketId, questionNumber, answer, roundNum) => {
    if (!lobbies.has(lobbyName)) return;
    console.log('question answered!', socketId, questionNumber, answer, roundNum);
    // Check which positin in the current hotseat the dude is in
    const hotseatPosition = lobbies.get(lobbyName).hotseatPairs[roundNum - 1].findIndex((player) => player.id === socketId);
    // If player is not in hotseat they go bye bye
    if (hotseatPosition !== -1) {
      lobbies.get(lobbyName).questions[questionNumber].answers[hotseatPosition] = answer;
    }
  });

  /**
   * When the server requests answers from players
   *
   * @param {string} lobbyName
   * @param {number} questionIndex
   */
  GameSock.onRequestAnswer((lobbyName, questionIndex, roundNum) => {
    if (!lobbies.has(lobbyName)) return [];

    // If both players have answered, and gave the same answer, give them points
    if (lobbies.get(lobbyName).questions[questionIndex].answers.length === 2 && lobbies.get(lobbyName).questions[questionIndex].answers[0] === lobbies.get(lobbyName).questions[questionIndex].answers[1]) {
      // Give points to the hotseatPlayers
      addPoints(lobbyName, lobbies.get(lobbyName).hotseatPairs[roundNum - 1][0].id, defaultGameOptions.points);
      addPoints(lobbyName, lobbies.get(lobbyName).hotseatPairs[roundNum - 1][1].id, defaultGameOptions.points);
    } else {
      // if not, give the audience points
      addPoints(lobbyName, lobbies.get(lobbyName).questions[questionIndex].playerId, defaultGameOptions.points);
    }

    return lobbies.get(lobbyName).questions[questionIndex].answers;
  });

  /**
   * When a round / game ends
   *
   * @param {string} lobbyName
   */
  GameSock.onRoundEnd((lobbyName, roundNum) => {
    if (!lobbies.has(lobbyName)) return;
    console.log('checking if theres another round', lobbies.get(lobbyName).round, defaultGameOptions.rounds, 'ROund over?: ', lobbies.get(lobbyName).round < defaultGameOptions.rounds);
    if (lobbies.get(lobbyName).round < defaultGameOptions.rounds) {
      // Next round
      lobbies.get(lobbyName).round++;
      lobbies.get(lobbyName).questions = [];
      lobbies.get(lobbyName).ready = true;

      // setTimeout(() => {
      //   console.log('starting new round', roundNum, 'picked players!', lobbies.get(lobbyName).hotseatPairs[roundNum]);
      //   onRoundStart(lobbyName, lobbies.get(lobbyName).hotseatPairs[roundNum], lobbies.get(lobbyName).round);
      // }, defaultGameOptions.timeBetweenRounds);
    }
  });

  /**
   * When the host sends a continue game signal - either at the end of the round or a game
   *
   * Will either result in the next round starting or the game restarting if its already over
   */
  GameSock.onContinueGame((lobbyName: string, socketID: string) => {
    if (!lobbies.has(lobbyName)) return [];
    if (lobbies.get(lobbyName).ready && socketID === lobbies.get(lobbyName).players[0].id && lobbies.get(lobbyName).questions.length === 0 && lobbies.get(lobbyName).round <= defaultGameOptions.rounds) {
      // Continue the game
      // if(roundOver && round !==roundnums){startNextRound()}
      // if (roundOver){restartGame()}
      lobbies.get(lobbyName).ready = false;
      onRoundStart(lobbyName, lobbies.get(lobbyName).hotseatPairs[lobbies.get(lobbyName).round - 1], lobbies.get(lobbyName).round);
    }
  });

  /**
   * When there are not enough answers add in a random one to fill out the game
   * should return random
   */
  GameSock.onNoAnswer(() => {
    // const allQuestions: string[] = JSON.parse(readFileSync('../data/Questions.json', { encoding: 'utf8' })).questionList;
    return _.sample(allQuestions);
  });

  onClaimSocket((lobbyName: string, playerId: string, ipAddress: string, newID: string) => {
    console.log('Claiming socket', lobbies.has(lobbyName), ipAddress, lobbies.get(lobbyName).unclaimedIps);
    if (lobbies.has(lobbyName) && lobbies.get(lobbyName).unclaimedIps.has(playerId) && lobbies.get(lobbyName).unclaimedIps.get(playerId) === ipAddress) {
      const playerIndex = findPlayerIndex(lobbyName, playerId);
      if (playerIndex !== -1) {
        // console.log(`Success switching`, { ...lobbies.get(lobbyName).players[playerIndex], id: newID });
        lobbies.get(lobbyName).players[playerIndex] = { ...lobbies.get(lobbyName).players[playerIndex], id: newID };
        updatePlayers(lobbyName, lobbies.get(lobbyName).players);
        lobbies.get(lobbyName).unclaimedIps.delete(playerId);
        console.log('Switcho', lobbies.get(lobbyName).players[playerIndex]);
        return true;
      }
    }
    return false;
  });

  /**
   * When a player disconnects from a lobby
   *
   * @param {string} lobbyName
   * @param {string} playerdId
   */
  GameSock.onDisconnect((lobbyName: string, playerId: string, ipAddress: string) => {
    if (!lobbies.has(lobbyName) || typeof lobbyName !== 'string') {
      return;
    }
    const pIndex = findPlayerIndex(lobbyName, playerId);
    if (pIndex === 0) {
      console.log('deleting' + lobbyName);
      deleteLobby(lobbyName);
      GameSock.kickAll(lobbyName);
    } else if (pIndex !== -1) {
      console.log(`IpAddress: ${ipAddress}`);
      // Allow localhost through
      lobbies.get(lobbyName).unclaimedIps.set(playerId, ipAddress);
    }
  });

  const onRoundStart = async (lobbyName: string, pickedPlayers: Player[], round: number = 1) => {
    if (!lobbies.has(lobbyName)) return;
    console.log('round number', round);
    console.log('pickedplayers', pickedPlayers);
    GameSock.startRound(lobbyName, {
      roundNum: round,
      hotseatPlayers: [pickedPlayers[0], pickedPlayers[1]],
      numQuestions: defaultGameOptions.numQuestions,
      time: defaultGameOptions.timeToWriteQuestions,
      tta: defaultGameOptions.timeToAnswerQuestions,
      delayBetweenQs: defaultGameOptions.timeBetweenQuestions,
    });
  };

  /**
   * Splice the array if the lobby is the last item in it
   * If not set the lobby to null
   *
   * @param {number} lIndex
   */
  const deleteLobby = (lobbyName: string) => {
    console.log('Deleteing the lobby');
    lobbies.delete(lobbyName);
  };

  const removeFromLobby = async (lobbyName: string, playerId: string) => {
    if (lobbies.has(lobbyName) && lobbies.get(lobbyName).players.some((player) => player.id === playerId)) {
      const pIndex = findPlayerIndex(lobbyName, playerId);
      if (pIndex !== -1) {
        lobbies.get(lobbyName).players.splice(pIndex);
      }
      if (lobbies.get(lobbyName).unclaimedIps.has(playerId)) {
        lobbies.get(lobbyName).unclaimedIps.delete(playerId);
      }
    }
  };

  /**
   * Adds points to a specific player
   *
   * @param {number} lIndex
   * @param {string} playerId
   * @param {number} points
   */
  const addPoints = (lobbyName: string, playerId: string, points: number) => {
    const pIndex = findPlayerIndex(lobbyName, playerId);
    if (lobbies.get(lobbyName).players[pIndex]) lobbies.get(lobbyName).players[pIndex].score += points;
  };
  /**
   *
   * @param {Question[]} array
   */
  const shuffleArray = (array: Question[]) => {
    return array
      .map((a) => ({ sort: Math.random(), value: a }))
      .sort((a, b) => a.sort - b.sort)
      .map((a) => a.value);
  };

  /**
   * Picks random players for the hotseat
   *
   * @param {Lobby} lobby
   * @param {number} lIndex
   */
  const pickPlayers = (lobby: Lobby, totalRounds: number): Player[][] => {
    // Create an array with all player indexes
    const playerArr = [...Array(lobby.players.length).keys()];
    return shuffleAndPair(playerArr, totalRounds, lobby.players);
  };

  /**
   * Find a player index using a lobby number and playerId
   *
   * @param {string} lobbyName
   * @param {string} playerId
   * @return {number} index
   */
  const findPlayerIndex = (lobbyName: string, playerId: string): number => {
    if (!lobbies.has(lobbyName)) return -1;
    return lobbies.get(lobbyName).players.findIndex((player: Player) => playerId === player.id);
  };

  /**
   * Find a player index using a lobby number and player name
   *
   * @param {string} lobbyName
   * @param {string} playerName
   * @return {number} index
   */
  const findPlayerIndexByName = (lobbyName: string, playerName: string): number => {
    if (!lobbies.has(lobbyName)) return -1;
    return lobbies.get(lobbyName).players.findIndex((player: Player) => playerName === player.name);
  };

  const shuffleAndPair = (array: number[], pairs: number, players: Player[]): Player[][] => {
    let resultIndexArray: number[] = [];
    if (pairs < array.length / 2) {
      resultIndexArray = shuffle(array);
    } else {
      // Account for when the pairs cannot be directly made from a multiple of all players
      for (let i = Math.ceil(array.length / pairs); i--; ) {
        resultIndexArray = [...resultIndexArray, ...shuffle(array)];
        console.log('Adding another set of players');
      }
    }
    // Pair
    const resultIndexPairs = pair(resultIndexArray as number[]);
    console.log('Pairs', resultIndexPairs);
    // trim
    if (resultIndexPairs.length < pairs) {
      console.error('Random pair picker fucked up');
    }
    resultIndexPairs.length = pairs;

    // [[1,2],[3,4]]
    // Convert to an array of players - TODO could be more efficient by just storing id - would have to account for that in frontend
    const resultPlayers = [];
    for (const [pairIndex, resultPairs] of resultIndexPairs.entries()) {
      resultPlayers.push([]);
      for (const playerIndex of resultPairs) {
        resultPlayers[pairIndex].push(players[playerIndex]);
      }
    }
    return resultPlayers as Player[][];
  };

  const shuffle = (array: number[]) => {
    // shuffle
    for (let i = array.length; i--; ) {
      const j = Math.floor(Math.random() * i);
      const temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
    return array;
  };
  const pair = (arr: number[], size = 2): number[][] => {
    return arr.map((x, i) => i % size === 0 && arr.slice(i, i + size)).filter((x) => x);
  };

  app = GameSock.startSyncServer(app);




  const httpsOn = process.env.HTTPS || false;
  // const httpsOn = false;
  let server;

  // Choosing https or not - untested
  if (httpsOn === 'true') {
    server = https.createServer(
      {
        key: fs.readFileSync('/etc/letsencrypt/live/api.shcoop.clovux.net/privkey.pem'),
        cert: fs.readFileSync('/etc/letsencrypt/live/api.shcoop.clovux.net/fullchain.pem'),
      },
      app
    );
  } else {
    server = new http.Server(app);
  }
  server = GameSock.sockServer(server);

  /**
   *
   * Return the socket server to express
   */
  return server;
};
