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
import GameSock, {
  Lobby,
  Player,
  Question,
  RoundOptions,
} from "@rossmacd/gamesock-server";
import jwt from "jsonwebtoken";
import config from "../../config/config";
import _ from 'underscore'

interface GameOptions {
  rounds: number;
  numQuestions: number;
  timeToWriteQuestions: number;
  timeToAnswerQuestions: number;
  timeBetweenQuestions: number;
  timeBetweenRounds: number;
}

const defaultGameOptions: GameOptions = {
  rounds: 2,
  numQuestions: 3,
  timeToWriteQuestions: 30,
  timeToAnswerQuestions: 3,
  timeBetweenQuestions: 5,
  timeBetweenRounds: 10000
};

let lobbies: Map<string,Lobby> = new Map();

/**
 * Main Game Controller
 *
 * Handles all functions within a game
 *
 * @param {Application} app
 * @param {boolean} https
 */
export const gameController = (app: Application, https: boolean) => {
  app.get('/',(req,res)=>{
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify([...lobbies]));
  })
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
      console.log("User is not authenticated", err);
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
    if (lobbies.has(lobby.name))
      return false;
    console.log("lobby created", lobby);

    lobbies.set(lobby.name, lobby);
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
    if (lobbies.has(lobbyName) && findPlayerIndexByName(lobbyName, player.name) === -1) {
      lobbies.get(lobbyName).players.push(player);
      returnLobbies = lobbies.get(lobbyName).players;
    } else GameSock.throwToRoom(lobbyName, "Player is already in this lobby");

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
    console.log(lobbies.get(lobbyName))
    // Return player list
    return lobbies.get(lobbyName).players;
  });

  // Start the game
  GameSock.onStartGame((lobbyName: string, socketId: string) => {
    console.log('starting GAMEEEE', lobbyName, socketId)
    // Check if we can start game
    if (
      lobbies.get(lobbyName).players.length > 2 &&
      socketId === lobbies.get(lobbyName).players[0].id
    ) {
      const gameOptions = {
        // Total rounds
        rounds: defaultGameOptions.rounds,
      };

      const pickedPlayers = pickPlayers(lobbies.get(lobbyName), gameOptions.rounds);
      console.log('ALLLICKEDLAYERS', pickedPlayers)
      onRoundStart(lobbyName, pickedPlayers[0]);

      return {
        ok: true,
        gameSettings: gameOptions,
      };
    } else {
      GameSock.throwToRoom(lobbyName, "Not enough players to start game!😲");
      console.log("Not enough players!");
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
  GameSock.onReturnQuestions(
    (lobbyName: string, questions: Question[], roundOptions) => {
      // Randomize question order
      const newQuestionList = shuffleArray(questions);
      console.log("return questions!!!dgnsaiogndsaiogdns", newQuestionList);
      // Store the questions
      lobbies.get(lobbyName).questions = newQuestionList;

      // TODO move to library - should be done
      // for (const question of questions) {
      //   question.answers = [];
      // }

      return newQuestionList;
    }
  );

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
  GameSock.onAnswerQuestions((lobbyName, socketId, questionNumber, answer,roundNum) => {
    console.log('question answered!', socketId, questionNumber, answer)
    // Check which positin in the current hotseat the dude is in
    const hotseatPosition = lobbies.get(lobbyName).hotseatPairs[roundNum].findIndex(
      (player) => player.id === socketId
    );
    // If player is not in hotseat they go bye bye
    if (hotseatPosition !== -1) {
      lobbies.get(lobbyName).questions[questionNumber].answers[
        hotseatPosition
      ] = answer;
    }
  });

  /**
   * When the server requests answers from players
   *
   * @param {string} lobbyName
   * @param {number} questionIndex
   */
  GameSock.onRequestAnswer((lobbyName, questionIndex,roundNum) => {
    // const lIndex = findLobbyIndex(lobbyName);

    // If both players have answered, and gave the same answer, give them points
    if (
      lobbies.get(lobbyName).questions[questionIndex].answers.length === 2 &&
      lobbies.get(lobbyName).questions[questionIndex].answers[0] ===
      lobbies.get(lobbyName).questions[questionIndex].answers[1]
    ) {
      // Give points to the hotseatPlayers
      addPoints(lobbyName, lobbies.get(lobbyName).hotseatPairs[roundNum][0].id, 100);
      addPoints(lobbyName, lobbies.get(lobbyName).hotseatPairs[roundNum][1].id, 100);
    } else {
      // if not, give the audience points
      addPoints(lobbyName, lobbies.get(lobbyName).questions[questionIndex].playerId, 100);
    }

    return lobbies.get(lobbyName).questions[questionIndex].answers;
  });

  /**
   * When a round / game ends
   *
   * @param {string} lobbyName
   */
  GameSock.onRoundEnd((lobbyName,roundNum) => {
    // const lIndex = findLobbyIndex(lobbyName);
    console.log('checking if theres another round', lobbies.get(lobbyName).round, defaultGameOptions.rounds )
    if (lobbies.get(lobbyName).round < defaultGameOptions.rounds) {
      // Next round
      lobbies.get(lobbyName).round++;
      lobbies.get(lobbyName).questions = [];

      setTimeout(() => {
        console.log("starting new round");
        onRoundStart(lobbyName, lobbies.get(lobbyName).hotseatPairs[roundNum], lobbies.get(lobbyName).round);
      },
      defaultGameOptions.timeBetweenRounds);
    }
    // } else {
      // End game

      // setTimeout(() => {
      //   console.log("Game done");
      //   deleteLobby(lIndex);
      // }, 5000);
    // }
  });

  /**
   * When the host sends a continue game signal - either at the end of the round or a game
   *
   * Will either result in the next round starting or the game restarting if its already over
   */
  GameSock.onContinueGame((lobbyName:string,socketID:string)=>{
    if(socketID===lobbies.get(lobbyName).players[0].id){
      // Continue the game
      // if(roundOver && round !==roundnums){startNextRound()}
      // if (roundOver){restartGame()}
    }
  })

  /**
   * When there are not enough answers add in a random one to fill out the game
   * should return random
   */
  GameSock.onNoAnswer(()=>{
    return "Who's more likely to not answer a question"
  })


  /**
   * When a player disconnects from a lobby
   *
   * @param {string} lobbyName
   * @param {string} playerdId
   */
  GameSock.onDisconnect((lobbyName: string, playerdId: string)=>{
    if(typeof lobbyName !=='string'){
      return
    }
    // const lIndex=findLobbyIndex(lobbyName)
    if (!lobbies.has(lobbyName)) {
      return;
    }
    const pIndex = findPlayerIndex(lobbyName, playerdId);
    if (pIndex === 0) {
      console.log('deleting' + lobbyName);
      deleteLobby(lobbyName)
      GameSock.kickAll(lobbyName)
    }
  })


  const onRoundStart = async (
    lobbyName: string,
    pickedPlayers: Player[],
    round: number = 1
  ) => {
    console.log('round number',round)
    console.log('pickedplayers',pickedPlayers)
    GameSock.startRound(lobbyName, {
      roundNum: round,
      hotseatPlayers: [pickedPlayers[0],pickedPlayers[1]],
      numQuestions: defaultGameOptions.numQuestions,
      time: defaultGameOptions.timeToWriteQuestions,
      tta:defaultGameOptions.timeToAnswerQuestions,
      delayBetweenQs:defaultGameOptions.timeBetweenQuestions
    });
  };

  /**
   * Splice the array if the lobby is the last item in it
   * If not set the lobby to null
   *
   * @param {number} lIndex
   */
  const deleteLobby = (lobbyName: string) => {
    console.log("Deleteing the lobby");
    lobbies.delete(lobbyName)
  };

  /**
   * Adds points to a specific player
   *
   * @param {number} lIndex
   * @param {string} playerId
   * @param {number} points
   */
  const addPoints = (
    lobbyName:string,
    playerId: string,
    points: number
  ) => {
    const pIndex = findPlayerIndex(lobbyName, playerId);
    lobbies.get(lobbyName).players[pIndex].score += points;
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
  const pickPlayers = (lobby: Lobby,totalRounds:number): Player[][] => {
    // Create an array with all player indexes
    const playerArr = [...Array(lobby.players.length).keys()]
    return shuffleAndPair(playerArr,totalRounds,lobby.players)
  };

  /**
   * Find a player index using a lobby number and playerId
   *
   * @param {string} lobbyName
   * @param {string} playerId
   * @return {number} index
   */
  const findPlayerIndex = (lobbyName: string, playerId: string): number => {
    return lobbies.get(lobbyName).players.findIndex(
      (player: Player) => playerId === player.id
    );
  };

  /**
   * Find a player index using a lobby number and player name
   *
   * @param {string} lobbyName
   * @param {string} playerName
   * @return {number} index
   */
  const findPlayerIndexByName = (
    lobbyName: string,
    playerName: string
  ): number => {
    return lobbies.get(lobbyName).players.findIndex(
      (player: Player) => playerName === player.name
    );
  };

  /**
   * Delete Lobbies for testing
   */
  app.get("/api/deleteLobby", (req, res) => {
    lobbies = new Map();
    res.status(200).json("👺");
  });


  const shuffleAndPair = (array:number[],pairs:number,players:Player[]):Player[][]=>{
    let resultIndexArray:number[];
    if(pairs<array.length){
      resultIndexArray= shuffle(array)
    }else {
      // Account for when the pairs cannot be directly made from a multiple of all players
        for(let i=Math.round(pairs/array.length);i--;){
          resultIndexArray=[...resultIndexArray, shuffle(array)] as number[]
        }
    }
    // Pair
    const resultIndexPairs=pair(resultIndexArray as number[])
    // trim
    if(resultIndexPairs.length<pairs)console.error('Random pair picker fucked up')
    resultIndexPairs.length=pairs
    // console
    // Convert to an array of players - TODO could be more efficient by just storing id - would have to account for that in frontend
    const resultPlayers=[]
    for(const [pairIndex,resultPairs] of resultIndexPairs.entries()){
      resultPlayers.push([])
      for(const playerIndex of resultPairs){
        resultPlayers[pairIndex]=players[playerIndex]
      }
    }
    return resultPlayers as Player[][]
}

const shuffle =(array:number[]) =>{
  // shuffle
  for(let i = array.length;i--;){
    const j = Math.floor(Math.random() * i)
    const temp = array[i]
    array[i] = array[j]
    array[j] = temp
  }
  return array
}
const pair=(arr:number[], size = 2):number[][]=> {
  return arr.map((x, i) => i % size === 0 && arr.slice(i, i + size)).filter(x => x)
}


  /**
   *
   * Return the socket server to express
   */
  return GameSock.sockServer(app, https);
};
