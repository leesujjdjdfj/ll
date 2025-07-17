const express = require("express")
const http = require("http")
const WebSocket = require("ws")
const path = require("path")

const app = express()
const server = http.createServer(app)
const wss = new WebSocket.Server({ server })

app.use(express.static(path.join(__dirname, "public")))
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")))
app.get("/game.html", (req, res) => res.sendFile(path.join(__dirname, "public", "game.html")))

const games = {}

// --- Helper Functions ---
const isValidNumber = (number, digits) =>
  typeof number === "string" && number.length === digits && !isNaN(number) && new Set(number).size === number.length
const checkGuess = (secret, guess) => {
  let s = 0,
    b = 0
  for (let i = 0; i < secret.length; i++) {
    if (secret[i] === guess[i]) s++
    else if (secret.includes(guess[i])) b++
  }
  return { strikes: s, balls: b }
}

function broadcastGameReady(game) {
  game.players.forEach((player, index) => {
    const opponent = game.players.find((p) => p !== player)
    const myData = game.playerData.get(player)
    const opponentData = game.playerData.get(opponent)

    let message = ""
    let playerColor = null

    if (game.gameType === "baseball") {
      message = game.turn === player ? "게임 시작! 당신의 턴입니다." : "게임 시작! 상대방의 턴을 기다리세요."
    } else if (game.gameType === "omok") {
      playerColor = index + 1 // 첫 번째 플레이어는 1(흑돌), 두 번째는 2(백돌)
      message = game.turn === player ? "게임 시작! 당신은 흑돌(선공)입니다." : "게임 시작! 당신은 백돌(후공)입니다."
    }

    player.send(
      JSON.stringify({
        type: "game_ready",
        message: message,
        myNickname: myData.nickname,
        opponentNickname: opponentData.nickname,
        myScore: myData.score,
        opponentScore: opponentData.score,
        playerColor: playerColor,
        isMyTurn: game.turn === player,
      }),
    )
  })
}

function resetBaseballGame(game) {
  game.players.forEach((p) => {
    const playerData = game.playerData.get(p)
    playerData.number = null
    playerData.playAgain = false
    p.send(JSON.stringify({ type: "prompt_secret", digits: game.digits }))
  })
}

function resetOmokGame(game) {
  game.board = Array(15)
    .fill(null)
    .map(() => Array(15).fill(0))
  game.turn = game.players[0] // 흑돌(선공)
  game.players.forEach((p) => {
    const playerData = game.playerData.get(p)
    if (playerData) playerData.playAgain = false
  })
  broadcastGameReady(game)
}

// --- WebSocket Logic ---
wss.on("connection", (ws) => {
  console.log("클라이언트 연결")
  ws.gameRoom = null

  ws.on("message", (message) => {
    const data = JSON.parse(message)
    const game = games[ws.gameRoom]

    switch (data.type) {
      case "create_game": {
        const { gameType, nickname, options } = data
        const roomCode = Math.floor(1000 + Math.random() * 9000).toString()

        const gameData = { gameType, roomCode, players: [ws], playerData: new Map() }
        gameData.playerData.set(ws, { nickname, score: 0 })

        if (gameType === "baseball") {
          gameData.digits = options.digits
        } else if (gameType === "omok") {
          gameData.board = Array(15)
            .fill(null)
            .map(() => Array(15).fill(0))
        }

        games[roomCode] = gameData
        ws.gameRoom = roomCode
        ws.send(JSON.stringify({ type: "game_created", roomCode }))
        break
      }

      case "join_game": {
        const { roomCode, nickname } = data
        const gameToJoin = games[roomCode]
        if (!gameToJoin || gameToJoin.players.length !== 1) {
          ws.send(JSON.stringify({ type: "error", message: "입장할 수 없는 방입니다." }))
          return
        }

        gameToJoin.players.push(ws)
        ws.gameRoom = roomCode
        gameToJoin.playerData.set(ws, { nickname, score: 0 })

        if (gameToJoin.gameType === "baseball") {
          resetBaseballGame(gameToJoin)
        } else if (gameToJoin.gameType === "omok") {
          resetOmokGame(gameToJoin)
        }
        break
      }

      case "set_secret": {
        // 숫자야구 전용
        if (!game || game.gameType !== "baseball") return
        const playerData = game.playerData.get(ws)
        if (!isValidNumber(data.number, game.digits)) {
          ws.send(JSON.stringify({ type: "error", message: `유효하지 않은 숫자입니다.` }))
          return
        }
        playerData.number = data.number

        const allNumbersSet = Array.from(game.playerData.values()).every((d) => d.number)
        if (game.playerData.size === 2 && allNumbersSet) {
          game.turn = game.players[0]
          broadcastGameReady(game)
        }
        break
      }

      case "guess": {
        // 숫자야구 전용
        if (!game || game.gameType !== "baseball" || ws !== game.turn) return
        const opponentWs = game.players.find((p) => p !== ws)
        const myData = game.playerData.get(ws)
        const opponentData = game.playerData.get(opponentWs)

        if (!isValidNumber(data.guess, game.digits)) {
          ws.send(JSON.stringify({ type: "error", message: `유효하지 않은 추측입니다.` }))
          return
        }

        const result = checkGuess(opponentData.number, data.guess)
        const updateMsg = { type: "update", guess: data.guess, result: `${result.strikes}S ${result.balls}B` }
        ws.send(JSON.stringify({ ...updateMsg, by: "me" }))
        opponentWs.send(JSON.stringify({ ...updateMsg, by: "opponent" }))

        if (result.strikes === game.digits) {
          myData.score++
          ws.send(
            JSON.stringify({
              type: "game_over",
              result: "win",
              message: `🎉 ${myData.nickname}(이)가 승리했습니다!`,
              opponentSecret: opponentData.number,
            }),
          )
          opponentWs.send(
            JSON.stringify({
              type: "game_over",
              result: "lose",
              message: `패배했습니다. ${myData.nickname}(이)가 승리했습니다.`,
              opponentSecret: myData.number,
            }),
          )
        } else {
          game.turn = opponentWs
          ws.send(JSON.stringify({ type: "info", message: "상대방의 턴입니다.", isMyTurn: false }))
          opponentWs.send(JSON.stringify({ type: "info", message: "당신의 턴입니다.", isMyTurn: true }))
        }
        break
      }

      case "place_stone": {
        // 오목 전용
        if (!game || game.gameType !== "omok" || ws !== game.turn) {
          console.log("Invalid place_stone request:", {
            hasGame: !!game,
            gameType: game?.gameType,
            isMyTurn: ws === game?.turn,
            currentTurn: game?.players.indexOf(game?.turn),
          })
          return
        }

        const { x, y } = data
        if (game.board[y][x] !== 0) return

        const playerIndex = game.players.indexOf(ws)
        const playerColor = playerIndex + 1

        console.log(`Player ${playerIndex + 1} (${playerColor === 1 ? "흑돌" : "백돌"}) placed stone at (${x}, ${y})`)

        game.board[y][x] = playerColor
        game.players.forEach((p) => p.send(JSON.stringify({ type: "update_board", x, y, player: playerColor })))

        // 승리 조건 검사
        if (checkOmokWin(game.board, x, y, playerColor)) {
          const winner = ws
          const loser = game.players.find((p) => p !== ws)
          const winnerData = game.playerData.get(winner)
          const loserData = game.playerData.get(loser)

          winnerData.score++

          winner.send(
            JSON.stringify({
              type: "game_over",
              result: "win",
              message: `🎉 ${winnerData.nickname}(이)가 승리했습니다!`,
            }),
          )
          loser.send(
            JSON.stringify({
              type: "game_over",
              result: "lose",
              message: `패배했습니다. ${winnerData.nickname}(이)가 승리했습니다.`,
            }),
          )
          return
        }

        // 턴 변경
        const nextPlayerIndex = (playerIndex + 1) % 2
        game.turn = game.players[nextPlayerIndex]

        console.log(`Turn changed to player ${nextPlayerIndex + 1}`)

        // 각 플레이어에게 턴 정보 전송
        game.players.forEach((player, index) => {
          const isMyTurn = player === game.turn
          player.send(
            JSON.stringify({
              type: "info",
              message: isMyTurn ? "당신의 턴입니다." : "상대방의 턴입니다.",
              isMyTurn: isMyTurn,
            }),
          )
        })
        break
      }

      case "timeout": {
        // 오목 타임아웃
        if (!game || game.gameType !== "omok" || ws !== game.turn) return
        const opponent = game.players.find((p) => p !== ws)
        const myData = game.playerData.get(ws)
        const opponentData = game.playerData.get(opponent)

        opponentData.score++

        ws.send(
          JSON.stringify({
            type: "game_over",
            result: "lose",
            message: "시간 초과로 패배했습니다.",
          }),
        )
        opponent.send(
          JSON.stringify({
            type: "game_over",
            result: "win",
            message: `${myData.nickname}이(가) 시간 초과로 패배했습니다. 승리!`,
          }),
        )
        break
      }
      case "surrender": {
        // 오목 기권 처리
        if (!game || game.gameType !== "omok") return
        const opponent = game.players.find((p) => p !== ws)
        const myData = game.playerData.get(ws)
        const opponentData = game.playerData.get(opponent)

        opponentData.score++

        ws.send(
          JSON.stringify({
            type: "game_over",
            result: "lose",
            message: "기권했습니다.",
          }),
        )
        opponent.send(
          JSON.stringify({
            type: "game_over",
            result: "win",
            message: `${myData.nickname}이(가) 기권했습니다. 승리!`,
          }),
        )
        break
      }

      case "chat_message": {
        if (!game) return
        const senderData = game.playerData.get(ws)
        const chatMsg = { type: "chat_message", senderNickname: senderData.nickname, text: data.text }
        game.players.forEach((p) => p.send(JSON.stringify(chatMsg)))
        break
      }

      case "play_again": {
        if (!game) return
        const playerData = game.playerData.get(ws)
        if (playerData) playerData.playAgain = true
        const allReady = Array.from(game.playerData.values()).every((d) => d.playAgain)

        if (game.playerData.size === 2 && allReady) {
          if (game.gameType === "baseball") resetBaseballGame(game)
          else if (game.gameType === "omok") resetOmokGame(game)
        }
        break
      }
    }
  })

  ws.on("close", () => {
    console.log("클라이언트 연결 해제")
    const game = games[ws.gameRoom]
    if (game) {
      const remainingPlayer = game.players.find((p) => p !== ws)
      if (remainingPlayer) {
        const myData = game.playerData.get(remainingPlayer)
        remainingPlayer.send(
          JSON.stringify({
            type: "game_over",
            result: "win",
            message: `상대방이 연결을 끊었습니다.`,
          }),
        )
      }
      delete games[ws.gameRoom]
    }
  })
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => console.log(`${PORT} 포트에서 서버가 실행되었습니다. `))

function checkOmokWin(board, x, y, player) {
  const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1], // 가로, 세로, 대각선
  ]

  for (const [dx, dy] of directions) {
    let count = 1

    // 한 방향으로 검사
    for (let i = 1; i < 5; i++) {
      const nx = x + dx * i
      const ny = y + dy * i
      if (nx < 0 || nx >= 15 || ny < 0 || ny >= 15) break
      if (board[ny][nx] === player) count++
      else break
    }

    // 반대 방향으로 검사
    for (let i = 1; i < 5; i++) {
      const nx = x - dx * i
      const ny = y - dy * i
      if (nx < 0 || nx >= 15 || ny < 0 || ny >= 15) break
      if (board[ny][nx] === player) count++
      else break
    }

    if (count >= 5) return true
  }
  return false
}
