document.addEventListener("DOMContentLoaded", () => {
  // URL 파라미터에서 게임 타입과 모드 가져오기
  const urlParams = new URLSearchParams(window.location.search)
  const gameType = urlParams.get("type")
  const gameMode = urlParams.get("mode") // 'single' 또는 null
  const gameDigits = Number.parseInt(urlParams.get("digits")) || 3 // 자릿수 파라미터 추가
  const nickname = sessionStorage.getItem("playerNickname")

  if (!gameType || !nickname) {
    window.location.href = "/"
    return
  }

  // ===================================================================
  // =================== 싱글 플레이 모드 로직 ==========================
  // ===================================================================
  if (gameMode === "single" && gameType === "baseball") {
    const body = document.body
    const baseballGameScreen = document.getElementById("baseball-game-screen")

    // 싱글모드 플래그 설정
    const isSingleMode = true

    // 헤더 텍스트 변경
    const headerTitle = document.querySelector(".baseball-header h1")
    if (headerTitle) {
      headerTitle.textContent = "⚾ 숫자야구 싱글"
    }

    // 개발자 모드 플래그 (테스트용)
    const isDevMode = false // 배포 시 false로 설정

    // 새로운 숫자야구 UI 요소들 (싱글모드용)
    const myNicknameBaseballDisplay = document.getElementById("my-nickname-display")
    const opponentNicknameBaseballDisplay = document.getElementById("opponent-nickname-display")
    const myScoreBaseballDisplay = document.getElementById("my-score-display")
    const opponentScoreBaseballDisplay = document.getElementById("opponent-score-display")
    const mySecretBaseballDisplay = document.getElementById("my-secret-display")
    const myGuessesBaseball = document.getElementById("my-guesses-baseball")
    const opponentGuessesBaseball = document.getElementById("opponent-guesses-baseball")
    const baseballChatBox = document.getElementById("baseball-chat-box")
    const baseballChatInput = document.getElementById("baseball-chat-input")
    const baseballChatSend = document.getElementById("baseball-chat-send")
    const baseballGuessInput = document.getElementById("baseball-guess-input")
    const baseballGuessButton = document.getElementById("baseball-guess-button")
    const baseballSurrenderButton = document.getElementById("baseball-surrender-button")
    const baseballGameOverModal = document.getElementById("baseball-game-over-modal")
    const baseballResultTitle = document.getElementById("baseball-result-title")
    const baseballResultMessage = document.getElementById("baseball-result-message")
    const baseballAnswerDisplay = document.getElementById("baseball-answer-display")
    const baseballPlayAgain = document.getElementById("baseball-play-again")

    let computerSecretNumber = ""
    let attempts = 0
    let gameEnded = false
    let myScore = 0
    const computerScore = 0

    // 자릿수에 따른 최대 턴 수 설정
    const maxTurns = gameDigits === 3 ? 15 : gameDigits === 4 ? 25 : 50
    let remainingTurns = maxTurns

    // 전역 함수로 toggleExpand 정의
    window.toggleExpand = (id) => {
      const el = document.getElementById(id)
      if (el.style.maxHeight === "none") {
        el.style.maxHeight = "170px"
      } else {
        el.style.maxHeight = "none"
      }
    }

    // 싱글플레이 화면 보여주기
    baseballGameScreen.classList.remove("hidden")

    // 초기 UI 설정
    initializeSinglePlayerUI()

    function initializeSinglePlayerUI() {
      // 싱글 플레이어 클래스 추가
      baseballGameScreen.classList.add("single-player")

      // 컨텐츠 영역에도 싱글 플레이어 클래스 추가
      const baseballContent = document.querySelector(".baseball-content")
      if (baseballContent) {
        baseballContent.classList.add("single-player")
      }

      // 상대 추측 기록 패널 완전히 제거
      const panels = document.querySelectorAll(".baseball-panel")
      if (panels.length >= 2) {
        panels[1].remove() // 상대 추측 기록 패널 완전 삭제
      }

      // 내 비밀번호 표시 영역 숨기기
      const statsSection = document.querySelector(".stats-section")
      if (statsSection) {
        statsSection.style.display = "none"
      }

      // 플레이어 정보 설정
      myNicknameBaseballDisplay.textContent = nickname
      opponentNicknameBaseballDisplay.textContent = "도전 과제"
      myScoreBaseballDisplay.textContent = myScore
      opponentScoreBaseballDisplay.textContent = "∞"

      // 남은 횟수 표시 영역 추가
      addRemainingAttemptsDisplay()

      // 게임 시작
      startNewSingleGame()

      // 이벤트 리스너 설정
      setupSinglePlayerEvents()
    }

    function addRemainingAttemptsDisplay() {
      // 기존 게임 정보 영역에 남은 횟수 표시 추가
      const gameInfo = document.querySelector(".game-info")
      if (gameInfo) {
        gameInfo.innerHTML = `
      <span id="player-info">플레이어: <span id="my-nickname-display">${nickname}</span> vs <span id="opponent-nickname-display">도전 과제</span></span>
      <span id="remaining-attempts" class="remaining-attempts">남은 시도: <span id="remaining-count">${remainingTurns}</span> / ${maxTurns}</span>
    `
      }
    }

    function updateRemainingAttempts() {
      const remainingCountElement = document.getElementById("remaining-count")
      if (remainingCountElement) {
        remainingCountElement.textContent = remainingTurns

        // 남은 횟수에 따른 색상 변경
        const remainingAttemptsElement = document.getElementById("remaining-attempts")
        if (remainingAttemptsElement) {
          if (remainingTurns <= 3) {
            remainingAttemptsElement.classList.add("danger")
          } else if (remainingTurns <= 7) {
            remainingAttemptsElement.classList.add("warning")
          } else {
            remainingAttemptsElement.classList.remove("danger", "warning")
          }
        }
      }
    }

    function startNewSingleGame() {
      // 컴퓨터의 비밀 숫자 생성 (중복 없이)
      generateComputerSecret()

      // UI 초기화
      myGuessesBaseball.innerHTML = ""
      baseballChatBox.innerHTML = ""

      // 게임 상태 초기화
      attempts = 0
      gameEnded = false
      remainingTurns = maxTurns

      // 남은 횟수 UI 업데이트
      updateRemainingAttempts()

      // 입력 활성화
      baseballGuessInput.disabled = false
      baseballGuessButton.disabled = false
      baseballGuessInput.value = ""

      // 시작 메시지
      addSystemMessage(`🔇 게임이 시작되었습니다! 컴퓨터의 ${gameDigits}자리 숫자를 맞춰보세요.`)

      // 개발자 모드에서만 정답 출력
      if (isDevMode) {
        console.log(`[개발자 모드] 컴퓨터 정답: ${computerSecretNumber}`)
      }
    }

    function generateComputerSecret() {
      const numbers = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]
      computerSecretNumber = ""

      for (let i = 0; i < gameDigits; i++) {
        const randomIndex = Math.floor(Math.random() * numbers.length)
        computerSecretNumber += numbers.splice(randomIndex, 1)[0]
      }
    }

    function setupSinglePlayerEvents() {
      // 추측 버튼
      baseballGuessButton.addEventListener("click", submitSinglePlayerGuess)

      // 추측 입력 엔터키
      baseballGuessInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && !baseballGuessButton.disabled) {
          submitSinglePlayerGuess()
        }
      })

      // 게임 종료 버튼
      baseballSurrenderButton.addEventListener("click", () => {
        if (confirm("정말 게임을 포기하시겠습니까?")) {
          endGame(false, "게임을 포기했습니다.")
        }
      })

      // 다시하기 버튼
      baseballPlayAgain.addEventListener("click", () => {
        baseballGameOverModal.classList.remove("show")
        body.classList.remove("win-effect", "lose-effect")
        startNewSingleGame()
      })

      // 채팅 기능 (시스템 메시지 전용)
      baseballChatInput.disabled = true
      baseballChatSend.disabled = true
      baseballChatInput.placeholder = "시스템 메시지 로그"
    }

    function submitSinglePlayerGuess() {
      if (gameEnded) return

      const guess = baseballGuessInput.value.trim()

      // 입력 검증
      if (!guess || guess.length !== gameDigits) {
        alert(`${gameDigits}자리 숫자를 입력해주세요.`)
        return
      }

      if (!/^\d+$/.test(guess)) {
        alert("숫자만 입력해주세요.")
        return
      }

      if (new Set(guess).size !== guess.length) {
        alert("중복되지 않는 숫자를 입력해주세요.")
        return
      }

      attempts++
      remainingTurns--

      // 남은 횟수 UI 업데이트
      updateRemainingAttempts()

      // 결과 계산
      const result = calculateResult(computerSecretNumber, guess)
      const isSuccess = result.strikes === gameDigits

      // 내 추측 기록에 추가
      addGuessToRecord(myGuessesBaseball, attempts, guess, `${result.strikes}S ${result.balls}B`, isSuccess, true)

      if (isSuccess) {
        // 승리
        myScore++
        myScoreBaseballDisplay.textContent = myScore
        addSystemMessage(`🎉 정답을 맞췄습니다! ${attempts}번 만에 성공!`)
        endGame(true, `축하합니다! ${attempts}번 만에 정답을 맞췄습니다!`)
      } else if (remainingTurns <= 0) {
        // 턴 소진으로 패배
        addSystemMessage("기회를 모두 사용했습니다...")
        endGame(false, "삐빅 바보입니다")
      } else {
        // 게임 계속
        addSystemMessage(`남은 기회: ${remainingTurns}번`)
      }

      baseballGuessInput.value = ""
    }

    function calculateResult(secret, guess) {
      let strikes = 0
      let balls = 0

      for (let i = 0; i < secret.length; i++) {
        if (secret[i] === guess[i]) {
          strikes++
        } else if (secret.includes(guess[i])) {
          balls++
        }
      }

      return { strikes, balls }
    }

    function addGuessToRecord(container, round, guess, result, isSuccess = false, isMyGuess = true) {
      const card = document.createElement("div")
      card.className = `guess-card ${isMyGuess ? "mine" : "theirs"}`

      if (isSuccess) {
        card.classList.add("success")
      }

      card.innerHTML = `
        <div class="round">${round}회차</div>
        <div class="details">입력: ${guess} → 결과: ${result}</div>
      `

      container.appendChild(card)
      container.scrollTop = container.scrollHeight
    }

    function addSystemMessage(message) {
      const chatMsg = document.createElement("div")
      chatMsg.className = "chat-msg system-chat"
      chatMsg.textContent = message
      baseballChatBox.appendChild(chatMsg)
      baseballChatBox.scrollTop = baseballChatBox.scrollHeight
    }

    function endGame(isWin, message) {
      gameEnded = true

      // 입력 비활성화
      baseballGuessInput.disabled = true
      baseballGuessButton.disabled = true

      // 게임 종료 모달 표시 (싱글모드에서는 정답 숨김)
      baseballResultTitle.textContent = isWin ? "🎉 승리!" : "😢 패배"
      baseballResultMessage.textContent = message

      // 싱글모드에서는 정답을 표시하지 않음
      baseballAnswerDisplay.textContent = "***"

      // 정답 표시 영역을 완전히 숨김
      const answerSection = baseballAnswerDisplay.parentElement
      if (answerSection) {
        answerSection.style.display = "none"
      }

      baseballGameOverModal.classList.add("show")

      // 시각적 효과 적용
      if (isWin) {
        body.classList.add("win-effect")
        // 승리 효과 추가
        createConfettiEffect()
      } else {
        body.classList.add("lose-effect")
      }
    }

    function createConfettiEffect() {
      // 간단한 confetti 효과
      for (let i = 0; i < 50; i++) {
        setTimeout(() => {
          const confetti = document.createElement("div")
          confetti.style.cssText = `
            position: fixed;
            top: -10px;
            left: ${Math.random() * 100}%;
            width: 10px;
            height: 10px;
            background: ${["#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#feca57"][Math.floor(Math.random() * 5)]};
            z-index: 10000;
            animation: confetti-fall 3s linear forwards;
            pointer-events: none;
          `
          document.body.appendChild(confetti)

          setTimeout(() => {
            document.body.removeChild(confetti)
          }, 3000)
        }, i * 100)
      }
    }

    // CSS 애니메이션 추가
    const style = document.createElement("style")
    style.textContent = `
      @keyframes confetti-fall {
        to {
          transform: translateY(100vh) rotate(360deg);
          opacity: 0;
        }
      }
    `
    document.head.appendChild(style)

    return // 싱글플레이 로직 종료
  }

  // ===================================================================
  // =================== 멀티 플레이 모드 로직 ==========================
  // ===================================================================

  // 공통 UI 요소
  const body = document.body
  const setupScreen = document.getElementById("setup-screen")
  const gamePlayScreen = document.getElementById("game-play-screen")
  const baseballGameScreen = document.getElementById("baseball-game-screen")
  const statusText = document.getElementById("status-text")
  const setupTitle = document.getElementById("setup-title")

  // 방 설정 요소
  const createRoomButton = document.getElementById("create-room-button")
  const roomCodeInput = document.getElementById("room-code-input")
  const joinRoomButton = document.getElementById("join-room-button")
  const roomInfo = document.getElementById("room-info")
  const roomCodeDisplay = document.getElementById("room-code-display")

  // 게임 플레이 요소 (기존 오목용)
  const gameTitle = document.getElementById("game-title")
  const infoText = document.getElementById("info-text")
  const myNicknameDisplay = document.getElementById("my-nickname")
  const opponentNicknameDisplay = document.getElementById("opponent-nickname")
  const myScoreDisplay = document.getElementById("my-score")
  const opponentScoreDisplay = document.getElementById("opponent-score")
  const mySecretNumberDisplay = document.getElementById("my-secret-number-display")
  const mySecretNumberSpan = document.getElementById("my-secret-number")
  const chatMessages = document.getElementById("chat-messages")
  const gameOverActions = document.getElementById("game-over-actions")
  const playAgainButton = document.getElementById("play-again-button")

  // 새로운 숫자야구 UI 요소들
  const myNicknameBaseballDisplay = document.getElementById("my-nickname-display")
  const opponentNicknameBaseballDisplay = document.getElementById("opponent-nickname-display")
  const myScoreBaseballDisplay = document.getElementById("my-score-display")
  const opponentScoreBaseballDisplay = document.getElementById("opponent-score-display")
  const mySecretBaseballDisplay = document.getElementById("my-secret-display")
  const myGuessesBaseball = document.getElementById("my-guesses-baseball")
  const opponentGuessesBaseball = document.getElementById("opponent-guesses-baseball")
  const baseballChatBox = document.getElementById("baseball-chat-box")
  const baseballChatInput = document.getElementById("baseball-chat-input")
  const baseballChatSend = document.getElementById("baseball-chat-send")
  const baseballGuessInput = document.getElementById("baseball-guess-input")
  const baseballGuessButton = document.getElementById("baseball-guess-button")
  const baseballSurrenderButton = document.getElementById("baseball-surrender-button")
  const baseballGameOverModal = document.getElementById("baseball-game-over-modal")
  const baseballResultTitle = document.getElementById("baseball-result-title")
  const baseballResultMessage = document.getElementById("baseball-result-message")
  const baseballAnswerDisplay = document.getElementById("baseball-answer-display")
  const baseballPlayAgain = document.getElementById("baseball-play-again")

  // 게임 상태 변수들
  let mySecretNumber = ""
  let clientGameDigits = 3
  let myGuessCount = 0
  let opponentGuessCount = 0
  let isMyTurn = false

  // 전역 함수로 toggleExpand 정의
  window.toggleExpand = (id) => {
    const el = document.getElementById(id)
    if (el.style.maxHeight === "none") {
      el.style.maxHeight = "170px"
    } else {
      el.style.maxHeight = "none"
    }
  }

  // 동적 생성될 UI
  const gameBoardArea = document.getElementById("game-board-area")
  const inputArea = document.getElementById("input-area")

  // 게임별 설정
  const baseballOptions = document.getElementById("baseball-options")
  const digitsSelect = document.getElementById("digits-select")
  const setNumberScreen = document.getElementById("set-number-screen")
  const setNumberInfo = document.getElementById("set-number-info")
  const secretInput = document.getElementById("secret-number-input")
  const setNumberButton = document.getElementById("set-number-button")

  let ws

  // 멀티플레이 UI 초기화 및 서버 연결 실행
  initializeUIForGame(gameType)
  connectToServer()

  // --- UI 초기화 ---
  function initializeUIForGame(type) {
    setupScreen.classList.remove("hidden") // 멀티플레이는 설정 화면부터 시작
    const gameNames = { baseball: "숫자야구", omok: "오목", chess: "체스" }
    setupTitle.textContent = `${gameNames[type]} 설정 (같이하기)`

    if (type === "baseball") {
      baseballOptions.classList.remove("hidden")
      // 숫자야구는 새로운 UI를 사용하므로 기존 UI 설정 제거
      // 숫자야구 채팅 이벤트 리스너 설정
      setupBaseballChatEvents()
    } else if (type === "omok") {
      gameTitle.textContent = gameNames[type]
      gameBoardArea.innerHTML = `
                <div id="omok-board-container" class="omok-container">
                    <canvas id="omok-board" width="640" height="640"></canvas>
                </div>`
      inputArea.innerHTML = `
                <div class="omok-input-area">
                    <div class="chat-section">
                        <input type="text" id="chat-input" class="game-input" placeholder="메시지 입력">
                        <button id="chat-send-button" class="btn btn-outline">전송</button>
                    </div>
                </div>`
      document.getElementById("chat-send-button").addEventListener("click", onChatSendButtonClick)
    }
  }

  function setupBaseballChatEvents() {
    // 채팅 전송 버튼
    baseballChatSend.addEventListener("click", sendBaseballChat)

    // 채팅 입력 엔터키
    baseballChatInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        sendBaseballChat()
      }
    })

    // 추측 버튼
    baseballGuessButton.addEventListener("click", submitBaseballGuess)

    // 추측 입력 엔터키
    baseballGuessInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && !baseballGuessButton.disabled) {
        submitBaseballGuess()
      }
    })

    // 기권 버튼
    baseballSurrenderButton.addEventListener("click", () => {
      if (confirm("정말 게임을 포기하시겠습니까?")) {
        ws.send(JSON.stringify({ type: "surrender" }))
      }
    })

    // 다시하기 버튼
    baseballPlayAgain.addEventListener("click", () => {
      ws.send(JSON.stringify({ type: "play_again" }))
      baseballGameOverModal.classList.remove("show")
      body.classList.remove("win-effect", "lose-effect")
    })
  }

  function sendBaseballChat() {
    const message = baseballChatInput.value.trim()
    if (!message || !ws) return

    ws.send(
      JSON.stringify({
        type: "chat_message",
        text: message,
      }),
    )

    baseballChatInput.value = ""
  }

  function submitBaseballGuess() {
    const guess = baseballGuessInput.value.trim()

    if (!guess || guess.length !== clientGameDigits) {
      alert(`${clientGameDigits}자리 숫자를 입력해주세요.`)
      return
    }

    if (!/^\d+$/.test(guess)) {
      alert("숫자만 입력해주세요.")
      return
    }

    if (new Set(guess).size !== guess.length) {
      alert("중복되지 않는 숫자를 입력해주세요.")
      return
    }

    ws.send(
      JSON.stringify({
        type: "guess",
        guess: guess,
      }),
    )

    baseballGuessInput.value = ""
  }

  function addGuessToRecord(container, round, guess, result, isSuccess = false, isMyGuess = true) {
    const card = document.createElement("div")
    card.className = `guess-card ${isMyGuess ? "mine" : "theirs"}`

    if (isSuccess) {
      card.classList.add("success")
    }

    card.innerHTML = `
      <div class="round">${round}회차</div>
      <div class="details">입력: ${guess} → 결과: ${result}</div>
    `

    container.appendChild(card)
    container.scrollTop = container.scrollHeight
  }

  function addChatMessage(sender, message, isSystem = false) {
    const chatMsg = document.createElement("div")

    if (isSystem) {
      chatMsg.className = "chat-msg system-chat"
      chatMsg.textContent = message
    } else {
      const isMyMessage = sender === nickname
      chatMsg.className = `chat-msg ${isMyMessage ? "mine-chat" : "their-chat"}`
      chatMsg.textContent = isMyMessage ? message : `${sender}: ${message}`
    }

    baseballChatBox.appendChild(chatMsg)
    baseballChatBox.scrollTop = baseballChatBox.scrollHeight
  }

  function createConfettiEffect() {
    // 간단한 confetti 효과
    for (let i = 0; i < 50; i++) {
      setTimeout(() => {
        const confetti = document.createElement("div")
        confetti.style.cssText = `
          position: fixed;
          top: -10px;
          left: ${Math.random() * 100}%;
          width: 10px;
          height: 10px;
          background: ${["#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#feca57"][Math.floor(Math.random() * 5)]};
          z-index: 10000;
          animation: confetti-fall 3s linear forwards;
          pointer-events: none;
        `
        document.body.appendChild(confetti)

        setTimeout(() => {
          document.body.removeChild(confetti)
        }, 3000)
      }, i * 100)
    }
  }

  // --- 웹소켓 로직 ---
  function connectToServer() {
    if (ws && ws.readyState === WebSocket.OPEN) return
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    ws = new WebSocket(`${wsProtocol}//${window.location.host}`)
    ws.onopen = () => (statusText.textContent = "서버에 연결되었습니다.")
    ws.onmessage = handleServerMessage
    ws.onclose = () => (statusText.textContent = "서버와 연결이 끊겼습니다.")
  }

  function handleServerMessage(event) {
    const data = JSON.parse(event.data)
    console.log("서버 메시지:", data)
    body.classList.remove("win-effect", "lose-effect")

    switch (data.type) {
      case "game_created":
        roomInfo.classList.remove("hidden")
        roomCodeDisplay.textContent = data.roomCode
        statusText.textContent = `방 생성 완료! 친구를 기다리세요...`
        createRoomButton.disabled = true
        joinRoomButton.disabled = true
        roomCodeInput.disabled = true
        break

      case "prompt_secret":
        setupScreen.classList.add("hidden")
        gamePlayScreen.classList.add("hidden")
        baseballGameScreen.classList.add("hidden")
        gameOverActions.classList.add("hidden")
        setNumberScreen.classList.remove("hidden")
        setNumberButton.disabled = false
        clientGameDigits = data.digits
        setNumberInfo.textContent = `${data.digits}자리 비밀 숫자를 정하세요 (중복 없이)`
        secretInput.placeholder = `${data.digits}자리 숫자 입력`
        secretInput.maxLength = data.digits
        break

      case "game_ready":
        setNumberScreen.classList.add("hidden")

        if (gameType === "baseball") {
          baseballGameScreen.classList.remove("hidden")

          // 플레이어 정보 업데이트
          myNicknameBaseballDisplay.textContent = data.myNickname
          opponentNicknameBaseballDisplay.textContent = data.opponentNickname
          myScoreBaseballDisplay.textContent = data.myScore
          opponentScoreBaseballDisplay.textContent = data.opponentScore
          mySecretBaseballDisplay.textContent = mySecretNumber

          // 추측 기록 초기화
          myGuessesBaseball.innerHTML = ""
          opponentGuessesBaseball.innerHTML = ""
          myGuessCount = 0
          opponentGuessCount = 0

          // 채팅 초기화
          baseballChatBox.innerHTML = ""

          // 턴 상태 업데이트
          isMyTurn = data.isMyTurn
          baseballGuessInput.disabled = !isMyTurn
          baseballGuessButton.disabled = !isMyTurn

          addChatMessage("", data.message, true)
        } else {
          gamePlayScreen.classList.remove("hidden")
          myNicknameDisplay.textContent = data.myNickname
          opponentNicknameDisplay.textContent = data.opponentNickname
          myScoreDisplay.textContent = data.myScore
          opponentScoreDisplay.textContent = data.opponentScore
          infoText.textContent = data.message

          if (gameType === "omok") {
            initializeOmokBoard(data.playerColor)
          }
        }
        break

      case "update":
        if (gameType === "baseball") {
          const isMyGuess = data.by === "me"
          const container = isMyGuess ? myGuessesBaseball : opponentGuessesBaseball
          const round = isMyGuess ? ++myGuessCount : ++opponentGuessCount
          const isSuccess = data.result.includes(`${clientGameDigits}S`)

          addGuessToRecord(container, round, data.guess, data.result, isSuccess, isMyGuess)
        }
        break

      case "info":
        if (gameType === "baseball") {
          isMyTurn = data.isMyTurn
          baseballGuessInput.disabled = !isMyTurn
          baseballGuessButton.disabled = !isMyTurn
          addChatMessage("", data.message, true)
        } else {
          infoText.textContent = data.message
        }
        break

      case "chat_message":
        if (gameType === "baseball") {
          addChatMessage(data.senderNickname, data.text)
        } else {
          const messageDiv = document.createElement("div")
          messageDiv.innerHTML = `<strong>${data.senderNickname}:</strong> ${data.text}`
          chatMessages.appendChild(messageDiv)
          chatMessages.scrollTop = chatMessages.scrollHeight
        }
        break

      case "game_over":
        if (gameType === "baseball") {
          // 점수 업데이트
          myScoreBaseballDisplay.textContent = data.myScore || myScoreBaseballDisplay.textContent
          opponentScoreBaseballDisplay.textContent = data.opponentScore || opponentScoreBaseballDisplay.textContent

          // 게임 종료 모달 표시
          baseballResultTitle.textContent = data.result === "win" ? "🎉 승리!" : "😢 패배"
          baseballResultMessage.textContent = data.message
          baseballAnswerDisplay.textContent = data.opponentSecret || "***"
          baseballGameOverModal.classList.add("show")

          // 입력 비활성화
          baseballGuessInput.disabled = true
          baseballGuessButton.disabled = true

          // 효과 적용
          if (data.result === "win") {
            body.classList.add("win-effect")
            createConfettiEffect()
          } else {
            body.classList.add("lose-effect")
          }
        } else {
          infoText.textContent = data.message
          gameOverActions.classList.remove("hidden")

          if (data.result === "win") {
            body.classList.add("win-effect")
          } else {
            body.classList.add("lose-effect")
          }
        }
        break

      case "update_board":
        if (gameType === "omok") {
          updateOmokBoard(data.x, data.y, data.player)
        }
        break

      case "error":
        alert(data.message)
        break
    }
  }

  // 방 생성 및 참가 이벤트
  createRoomButton.addEventListener("click", () => {
    const options = gameType === "baseball" ? { digits: Number.parseInt(digitsSelect.value, 10) } : {}
    ws.send(
      JSON.stringify({
        type: "create_game",
        gameType: gameType,
        nickname: nickname,
        options: options,
      }),
    )
  })

  joinRoomButton.addEventListener("click", () => {
    const roomCode = roomCodeInput.value.trim()
    if (!roomCode) {
      alert("방 코드를 입력해주세요.")
      return
    }
    ws.send(
      JSON.stringify({
        type: "join_game",
        roomCode: roomCode,
        nickname: nickname,
      }),
    )
  })

  // 비밀 숫자 설정
  setNumberButton.addEventListener("click", () => {
    const number = secretInput.value.trim()
    if (number.length !== clientGameDigits) {
      alert(`${clientGameDigits}자리 숫자를 입력해주세요.`)
      return
    }
    if (!/^\d+$/.test(number)) {
      alert("숫자만 입력해주세요.")
      return
    }
    if (new Set(number).size !== number.length) {
      alert("중복되지 않는 숫자를 입력해주세요.")
      return
    }

    mySecretNumber = number
    ws.send(
      JSON.stringify({
        type: "set_secret",
        number: number,
      }),
    )
    setNumberButton.disabled = true
  })

  // 오목 관련 함수들 (기존 유지)
  function initializeOmokBoard(playerColor) {
    // 오목 보드 초기화 로직
  }

  function updateOmokBoard(x, y, player) {
    // 오목 보드 업데이트 로직
  }

  function onChatSendButtonClick() {
    // 오목 채팅 로직
  }

  // CSS 애니메이션 추가
  const style = document.createElement("style")
  style.textContent = `
    @keyframes confetti-fall {
      to {
        transform: translateY(100vh) rotate(360deg);
        opacity: 0;
      }
    }
  `
  document.head.appendChild(style)
})
