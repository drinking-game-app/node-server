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

interface GameOptions {
  rounds: number;
  numQuestions: number;
  timeToWriteQuestions: number;
  timeToAnswerQuestions: number;
  timeBetweenQuestions: number;
}

const defaultGameOptions: GameOptions = {
  rounds: 1,
  numQuestions: 3,
  timeToWriteQuestions: 30,
  timeToAnswerQuestions: 3,
  timeBetweenQuestions: 5,
};

let lobbies: Lobby[] = [];

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
    if (lobbies.filter((dat) => {
      if(dat && dat.name === lobby.name) return true
    }).length > 0)
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
    const lIndex = findLobbyIndex(lobbyName);

    if (lIndex !== -1 && findPlayerIndexByName(lIndex, player.name) === -1) {
      lobbies[lIndex].players.push(player);
      returnLobbies = lobbies[lIndex].players;
    } else GameSock.throwToRoom(lobbyName, "Player is already in this lobby");

    return returnLobbies;
  });

  /**
   * Update a single player
   */
  GameSock.onUpdateSinglePlayer((lobbyName: string, player: Player) => {
    const lIndex = findLobbyIndex(lobbyName);
    const pIndex = findPlayerIndex(lIndex, player.id);

    player = { ...player, score: 0 };
    lobbies[lIndex].players[pIndex] = player;

    return player;
  });

  // Get player list
  GameSock.onGetPlayers((lobbyName: string) => {
    // Get the lobby
    const lIndex = findLobbyIndex(lobbyName);
    // Return player list
    return lobbies[lIndex].players;
  });

  // Start the game
  GameSock.onStartGame((lobbyName: string, socketId: string) => {
    console.log('starting GAMEEEE', lobbyName, socketId)
    // Get the lobby
    const lIndex = findLobbyIndex(lobbyName);
    // Check if we can start game
    if (
      lobbies[lIndex].players.length > 2 &&
      socketId === lobbies[lIndex].players[0].id
    ) {
      const gameOptions = {
        // Total rounds
        rounds: defaultGameOptions.rounds,
      };

      const pickedPlayers = pickPlayers(lobbies[lIndex], lIndex);
      lobbies[lIndex].currentHotseat = [
        pickedPlayers[0].id,
        pickedPlayers[1].id,
      ];

      onRoundStart(lobbyName, pickedPlayers);

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
      const lIndex = findLobbyIndex(lobbyName);
      lobbies[lIndex].questions = newQuestionList;

      // TODO move to library
      for (const question of questions) {
        question.answers = [];
      }

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
  GameSock.onAnswerQuestions((lobbyName, socketId, questionNumber, answer) => {
    const lIndex = findLobbyIndex(lobbyName);

    // Check which positin in the current hotseat the dude is in
    const hotseatPosition = lobbies[lIndex].currentHotseat.findIndex(
      (playerId) => playerId === socketId
    );
    // If player is not in hotseat they go bye bye
    if (hotseatPosition !== -1) {
      lobbies[lIndex].questions[questionNumber].answers[
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
  GameSock.onRequestAnswer((lobbyName, questionIndex) => {
    const lIndex = findLobbyIndex(lobbyName);

    // If both players have answered, and gave the same answer, give them points
    if (
      lobbies[lIndex].questions[questionIndex].answers.length === 2 &&
      lobbies[lIndex].questions[questionIndex].answers[0] ===
        lobbies[lIndex].questions[questionIndex].answers[1]
    ) {
      // Give points to the hotseatPlayers
      addPoints(lIndex, lobbies[lIndex].currentHotseat[0], 100);
      addPoints(lIndex, lobbies[lIndex].currentHotseat[1], 100);
    } else {
      // if not, give the audience points
      addPoints(lIndex, lobbies[lIndex].questions[questionIndex].playerId, 100);
    }

    return lobbies[lIndex].questions[questionIndex].answers;
  });

  /**
   * When a round / game ends
   *
   * @param {string} lobbyName
   */
  GameSock.onRoundEnd((lobbyName) => {
    const lIndex = findLobbyIndex(lobbyName);
    console.log('checking if theres another round', lobbies[lIndex].round, defaultGameOptions.rounds )
    if (lobbies[lIndex].round < defaultGameOptions.rounds) {
      // Next round
      lobbies[lIndex].round++;
      lobbies[lIndex].questions = [];

      const pickedPlayers = pickPlayers(lobbies[lIndex],lIndex);
      setTimeout(() => {
        console.log("starting new round");
        onRoundStart(lobbyName, pickedPlayers, lobbies[lIndex].round);
      }, 5000);
    } else {
      // End game
      console.log("Game done");
      deleteLobby(lIndex);
    }
  });

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
    const lIndex=findLobbyIndex(lobbyName)
    if (lIndex === -1) {
      return;
    }
    const pIndex = findPlayerIndex(lIndex, playerdId);
    if (pIndex === 0) {
      console.log('deleting' + lobbyName);
      lobbies[lIndex] = null;

      /**
       * @todo - trigger GameSock function to kick all players
       */
      return;
    }

  })


  const onRoundStart = async (
    lobbyName: string,
    pickedPlayers: [Player, Player],
    round: number = 1
  ) => {
    console.log('round number',round)
    GameSock.startRound(lobbyName, {
      roundNum: round,
      hotseatPlayers: pickedPlayers,
      numQuestions: defaultGameOptions.numQuestions,
      time: defaultGameOptions.timeToWriteQuestions,
    });
  };

  /**
   * Splice the array if the lobby is the last item in it
   * If not set the lobby to null
   *
   * @param {number} lIndex
   */
  const deleteLobby = (lIndex: number) => {
    console.log("Deleteing the lobby");

    if (lIndex === lobbies.length - 1) lobbies.splice(lIndex, 1);
    else lobbies[lIndex] = null;
  };

  /**
   * Adds points to a specific player
   *
   * @param {number} lIndex
   * @param {string} playerId
   * @param {number} points
   */
  const addPoints = async (
    lIndex: number,
    playerId: string,
    points: number
  ) => {
    const pIndex = findPlayerIndex(lIndex, playerId);
    lobbies[lIndex].players[pIndex].score += points;
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
  const pickPlayers = (lobby: Lobby,lIndex:number): [Player, Player] => {
    // Create an array with all player indexes
    const playerArr = [...Array(lobby.players.length).keys()]
    console.log('picking random player', playerArr)
    // check if there were players picked before
    if(lobby.currentHotseat && lobby.currentHotseat.length > 0) {
    // remove a random player from the playerArr
      const oldPickedPlayer = findPlayerIndex(lIndex, lobby.currentHotseat[Math.round(Math.random())])
      playerArr.splice(oldPickedPlayer, 1)
      console.log('removing one old picked player', playerArr)
    }

    // Pick a random player, removing them from the array
    const randomPlayer1 = playerArr.splice(Math.floor(Math.random()*playerArr.length), 1)[0]
    console.log('random player one picked', playerArr)
    // Pick a second random player
    const randomPlayer2 = Math.floor(Math.random()*playerArr.length)
    console.log('picked two random players', randomPlayer1, randomPlayer2)

    console.log('Random players picked!', lobby.players[randomPlayer1], lobby.players[randomPlayer2])

    return [lobby.players[randomPlayer1], lobby.players[randomPlayer2]];
  };

  /**
   * Find a lobby index using a lobby name
   *
   * @param {string} lobbyName
   * @return {number} index
   */
  const findLobbyIndex = (lobbyName: string): number => {
    return lobbies.findIndex((lobby) => {
      if(lobby && lobby.name === lobbyName) return true
    });
  };

  /**
   * Find a player index using a lobby number and playerId
   *
   * @param {string} lobbyName
   * @param {string} playerId
   * @return {number} index
   */
  const findPlayerIndex = (lobbyNumber: number, playerId: string): number => {
    return lobbies[lobbyNumber].players.findIndex(
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
    lobbyNumber: number,
    playerName: string
  ): number => {
    return lobbies[lobbyNumber].players.findIndex(
      (player: Player) => playerName === player.name
    );
  };

  /**
   * Delete Lobbies for testing
   */
  app.get("/api/deleteLobby", (req, res) => {
    lobbies = [];
    res.status(200).json("👺");
  });

  /**
   *
   * Return the socket server to express
   */
  return GameSock.sockServer(app, https);
};
