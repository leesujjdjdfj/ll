document.addEventListener("DOMContentLoaded", () => {
  // 사용자 정보 확인
  const nickname = sessionStorage.getItem("playerNickname")
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null")

  if (!nickname || !currentUser) {
    window.location.href = "/"
    return
  }

  // DOM 요소들
  const setupUserNickname = document.getElementById("setup-user-nickname")
  const digitOptions = document.querySelectorAll(".digit-option")
  const singleModeButton = document.getElementById("single-mode-button")
  const multiModeButton = document.getElementById("multi-mode-button")
  const multiOptionsCard = document.getElementById("multi-options-card")
  const createRoomBtn = document.getElementById("create-room-btn")
  const joinRoomBtn = document.getElementById("join-room-btn")
  const roomCodeInput = document.getElementById("room-code-input")
  const roomCreatedCard = document.getElementById("room-created-card")
  const generatedRoomCode = document.getElementById("generated-room-code")
  const copyRoomCode = document.getElementById("copy-room-code")

  // 상태 변수
  let selectedDigits = 3
  let ws = null

  // 초기화
  init()

  function init() {
    // 사용자 정보 표시
    setupUserNickname.textContent = currentUser.nickname

    // 이벤트 리스너 설정
    setupEventListeners()

    // 웹소켓 연결
    connectToServer()
  }

  function setupEventListeners() {
    // 자릿수 선택
    digitOptions.forEach((option) => {
      option.addEventListener("click", () => {
        // 기존 선택 해제
        digitOptions.forEach((opt) => opt.classList.remove("active"))
        // 새로운 선택 활성화
        option.classList.add("active")
        option.querySelector("input").checked = true
        selectedDigits = Number.parseInt(option.dataset.digits)
      })
    })

    // 싱글 모드 버튼
    singleModeButton.addEventListener("click", () => {
      window.location.href = `/game.html?type=baseball&mode=single&digits=${selectedDigits}`
    })

    // 멀티 모드 버튼
    multiModeButton.addEventListener("click", () => {
      multiOptionsCard.classList.remove("hidden")
      multiModeButton.textContent = "설정 완료"
      multiModeButton.disabled = true

      // 부드러운 스크롤
      setTimeout(() => {
        multiOptionsCard.scrollIntoView({ behavior: "smooth", block: "center" })
      }, 100)
    })

    // 방 만들기 버튼
    createRoomBtn.addEventListener("click", () => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        showNotification("서버 연결 중입니다. 잠시 후 다시 시도해주세요.", "error")
        return
      }

      createRoomBtn.disabled = true
      createRoomBtn.textContent = "방 생성 중..."

      ws.send(
        JSON.stringify({
          type: "create_game",
          gameType: "baseball",
          nickname: nickname,
          options: { digits: selectedDigits },
        }),
      )
    })

    // 방 참가하기 버튼
    joinRoomBtn.addEventListener("click", () => {
      const roomCode = roomCodeInput.value.trim()

      if (!roomCode) {
        showNotification("방 코드를 입력해주세요.", "error")
        roomCodeInput.focus()
        return
      }

      if (!/^\d{4}$/.test(roomCode)) {
        showNotification("방 코드는 4자리 숫자여야 합니다.", "error")
        roomCodeInput.focus()
        return
      }

      if (!ws || ws.readyState !== WebSocket.OPEN) {
        showNotification("서버 연결 중입니다. 잠시 후 다시 시도해주세요.", "error")
        return
      }

      joinRoomBtn.disabled = true
      joinRoomBtn.textContent = "참가 중..."

      ws.send(
        JSON.stringify({
          type: "join_game",
          roomCode: roomCode,
          nickname: nickname,
        }),
      )
    })

    // 방 코드 입력 엔터키
    roomCodeInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        joinRoomBtn.click()
      }
    })

    // 방 코드 복사 버튼
    copyRoomCode.addEventListener("click", async () => {
      const roomCode = generatedRoomCode.textContent

      try {
        await navigator.clipboard.writeText(roomCode)
        showNotification("방 코드가 복사되었습니다!", "success")
        copyRoomCode.textContent = "✅ 복사됨"

        setTimeout(() => {
          copyRoomCode.textContent = "📋 복사"
        }, 2000)
      } catch (err) {
        // 폴백: 텍스트 선택
        const textArea = document.createElement("textarea")
        textArea.value = roomCode
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand("copy")
        document.body.removeChild(textArea)

        showNotification("방 코드가 복사되었습니다!", "success")
      }
    })
  }

  function connectToServer() {
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    ws = new WebSocket(`${wsProtocol}//${window.location.host}`)

    ws.onopen = () => {
      console.log("서버에 연결되었습니다.")
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      handleServerMessage(data)
    }

    ws.onclose = () => {
      console.log("서버 연결이 끊어졌습니다.")
      // 재연결 시도
      setTimeout(connectToServer, 3000)
    }

    ws.onerror = (error) => {
      console.error("웹소켓 오류:", error)
    }
  }

  function handleServerMessage(data) {
    switch (data.type) {
      case "game_created":
        // 방 생성 성공
        multiOptionsCard.classList.add("hidden")
        roomCreatedCard.classList.remove("hidden")
        generatedRoomCode.textContent = data.roomCode

        // 부드러운 스크롤
        setTimeout(() => {
          roomCreatedCard.scrollIntoView({ behavior: "smooth", block: "center" })
        }, 100)

        showNotification("방이 생성되었습니다!", "success")
        break

      case "prompt_secret":
        // 게임 시작 - 비밀번호 설정 화면으로 이동
        window.location.href = `/game.html?type=baseball&digits=${selectedDigits}`
        break

      case "error":
        showNotification(data.message, "error")

        // 버튼 상태 복원
        createRoomBtn.disabled = false
        createRoomBtn.textContent = "방 만들기"
        joinRoomBtn.disabled = false
        joinRoomBtn.textContent = "참가하기"
        break
    }
  }

  function showNotification(message, type = "info") {
    const notification = document.createElement("div")
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 1rem 1.5rem;
      background: ${type === "success" ? "#27ae60" : type === "error" ? "#e74c3c" : "#3498db"};
      color: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      z-index: 10000;
      animation: slideIn 0.3s ease;
      font-weight: 500;
      max-width: 300px;
    `
    notification.textContent = message

    document.body.appendChild(notification)

    setTimeout(() => {
      notification.style.animation = "slideOut 0.3s ease"
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification)
        }
      }, 300)
    }, 3000)
  }

  // CSS 애니메이션 추가
  const style = document.createElement("style")
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
  `
  document.head.appendChild(style)
})
