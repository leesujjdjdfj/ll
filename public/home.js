document.addEventListener("DOMContentLoaded", () => {
  // DOM 요소들
  // const nicknameInput = document.getElementById("nickname-input"); // Removed
  // const nicknameStatus = document.getElementById("nickname-status"); // Removed
  const modeSelectionModal = document.getElementById("mode-selection-modal")
  const singlePlayerBtn = document.getElementById("single-player-btn")
  const multiPlayerBtn = document.getElementById("multi-player-btn")
  const modalCloseBtn = document.getElementById("modal-close-btn")

  // 네비게이션 관련
  const navItems = document.querySelectorAll(".nav-item")
  const screens = document.querySelectorAll(".screen")

  // 모달 관련
  const loginModal = document.getElementById("login-modal")
  const registerModal = document.getElementById("register-modal")
  const profileModal = document.getElementById("profile-modal")
  const nicknameModal = document.getElementById("nickname-modal")
  const loginBtn = document.getElementById("login-btn")
  const registerBtn = document.getElementById("register-btn")
  const profileBtn = document.getElementById("profile-btn")
  const logoutBtn = document.getElementById("logout-btn")
  const guestLoginBtn = document.getElementById("guest-login-btn") // This is now inside login-modal

  // 프로필 관련
  const editNicknameBtn = document.getElementById("edit-nickname-btn")
  const saveNicknameBtn = document.getElementById("save-nickname-btn")
  const cancelNicknameBtn = document.getElementById("cancel-nickname-btn")
  const newNicknameInput = document.getElementById("new-nickname-input")
  const nicknameEditSection = document.getElementById("nickname-edit-section")
  const nicknameDisplaySection = document.querySelector(".nickname-display")

  // 게스트 닉네임 관련
  const guestNicknameInput = document.getElementById("guest-nickname-input")
  const guestNicknameValidation = document.getElementById("guest-nickname-validation")
  const confirmNicknameBtn = document.getElementById("confirm-nickname-btn")

  // 통계 탭 관련
  const statsTabs = document.querySelectorAll(".stats-tab")
  const statsContents = document.querySelectorAll(".stats-content")

  // 사용자 상태 관리
  let currentUser = null
  let isGuest = false
  let gameStats = {
    overall: { totalGames: 0, totalWins: 0, totalPlaytime: 0 },
    baseball: { games: 0, wins: 0, losses: 0, avgAttempts: 0, bestScore: null, recentGames: [] },
    omok: { games: 0, wins: 0, losses: 0, draws: 0, avgMoves: 0, recentGames: [] },
    chess: { games: 0, wins: 0, losses: 0, draws: 0, recentGames: [] },
  }

  // 초기화
  init()

  function init() {
    // 저장된 사용자 정보 확인
    const savedUser = localStorage.getItem("currentUser")
    const savedStats = localStorage.getItem("gameStats")

    if (savedUser) {
      currentUser = JSON.parse(savedUser)
      updateUserInterface()
    }

    if (savedStats) {
      gameStats = { ...gameStats, ...JSON.parse(savedStats) }
    }

    // 이벤트 리스너 등록
    setupEventListeners()

    // 닉네임 입력 검증
    setupNicknameValidation()

    // 통계 업데이트
    updateGameStats()
  }

  function setupEventListeners() {
    // 네비게이션
    navItems.forEach((item) => {
      item.addEventListener("click", (e) => {
        e.preventDefault()
        const targetScreen = e.target.getAttribute("data-menu")
        showScreen(targetScreen)
        updateActiveNav(e.target)
      })
    })

    // 게임 선택 버튼
    document.querySelectorAll(".game-choice-btn").forEach((button) => {
      button.addEventListener("click", handleGameSelection)
    })

    // 모달 관련
    loginBtn.addEventListener("click", () => showModal(loginModal))
    registerBtn.addEventListener("click", () => showModal(registerModal))
    profileBtn.addEventListener("click", () => {
      updateGameStats()
      showModal(profileModal)
    })
    logoutBtn.addEventListener("click", handleLogout)
    guestLoginBtn.addEventListener("click", handleGuestLogin) // Guest login button inside login modal

    // 모달 닫기
    document.querySelectorAll(".modal-close").forEach((btn) => {
      btn.addEventListener("click", closeAllModals)
    })

    // 모달 배경 클릭으로 닫기
    document.querySelectorAll(".modal-overlay").forEach((modal) => {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          closeAllModals()
        }
      })
    })

    // 게임 모드 선택
    singlePlayerBtn.addEventListener("click", () => {
      window.location.href = `/game.html?type=baseball&mode=single`
    })

    multiPlayerBtn.addEventListener("click", () => {
      window.location.href = `/game.html?type=baseball`
    })

    modalCloseBtn.addEventListener("click", closeAllModals)

    // 폼 제출
    document.getElementById("login-form").addEventListener("submit", handleLogin)
    document.getElementById("register-form").addEventListener("submit", handleRegister)

    // 프로필 닉네임 변경
    editNicknameBtn.addEventListener("click", showNicknameEdit)
    saveNicknameBtn.addEventListener("click", saveNickname)
    cancelNicknameBtn.addEventListener("click", hideNicknameEdit)

    // 게스트 닉네임 확인
    confirmNicknameBtn.addEventListener("click", confirmGuestNickname)

    // 통계 탭 전환
    statsTabs.forEach((tab) => {
      tab.addEventListener("click", (e) => {
        const gameType = e.target.getAttribute("data-game")
        switchStatsTab(gameType)
      })
    })

    // DOM 요소들 업데이트 (이전 코드에서 제거된 부분)
    // const memberLoginBtn = document.getElementById("member-login-btn"); // Removed
    // const guestStartBtn = document.getElementById("guest-start-btn"); // Removed

    // 로그인 선택 버튼 이벤트 추가 (이전 코드에서 제거된 부분)
    // memberLoginBtn.addEventListener("click", () => showModal(loginModal)); // Removed
    // guestStartBtn.addEventListener("click", handleGuestStart); // Removed

    // 게임 선택 버튼 로직 수정 (기존 로직 유지)
    document.querySelectorAll(".game-choice-btn").forEach((button) => {
      button.addEventListener("click", handleGameSelection)
    })
  }

  function setupNicknameValidation() {
    // 게스트 닉네임 입력
    guestNicknameInput.addEventListener("input", (e) => {
      const nickname = e.target.value.trim()
      const isValid = validateNickname(nickname, guestNicknameValidation)
      confirmNicknameBtn.disabled = !isValid
    })

    // 프로필 닉네임 변경
    newNicknameInput.addEventListener("input", (e) => {
      const nickname = e.target.value.trim()
      validateNickname(nickname)
    })
  }

  function validateNickname(nickname, statusElement = null) {
    if (!statusElement) return true

    if (!nickname) {
      statusElement.textContent = ""
      statusElement.className = "nickname-validation"
      return false
    }

    if (nickname.length < 2) {
      statusElement.textContent = "닉네임은 2글자 이상이어야 합니다."
      statusElement.className = "nickname-validation error"
      return false
    }

    if (nickname.length > 10) {
      statusElement.textContent = "닉네임은 10글자 이하여야 합니다."
      statusElement.className = "nickname-validation error"
      return false
    }

    if (!/^[가-힣a-zA-Z0-9_]+$/.test(nickname)) {
      statusElement.textContent = "한글, 영문, 숫자, 언더스코어만 사용 가능합니다."
      statusElement.className = "nickname-validation error"
      return false
    }

    statusElement.textContent = "사용 가능한 닉네임입니다! ✓"
    statusElement.className = "nickname-validation success"
    return true
  }

  function handleGameSelection(e) {
    const gameType = e.target.getAttribute("data-game")

    // 로그인 상태 확인
    if (!currentUser) {
      showNotification("먼저 로그인해주세요!", "error")
      // 로그인 모달을 띄우고, 로그인/게스트 로그인 후 게임을 시작하도록 유도
      showModal(loginModal)
      return
    }

    // 숫자야구는 전용 설정 화면으로 이동
    if (gameType === "baseball") {
      window.location.href = `/baseball-setup.html`
      return
    }

    proceedToGame(gameType)
  }

  // handleGuestStart 함수는 더 이상 필요 없음 (제거)

  function showGuestNicknameModal() {
    showModal(nicknameModal)
    guestNicknameInput.focus()
  }

  function confirmGuestNickname() {
    const nickname = guestNicknameInput.value.trim()
    if (!validateNickname(nickname, guestNicknameValidation)) {
      return
    }

    // 게스트 닉네임 저장 (고유 ID와 함께)
    const guestId = generateGuestId()
    sessionStorage.setItem("guestNickname", nickname)
    sessionStorage.setItem("guestId", guestId)
    sessionStorage.setItem("playerNickname", nickname)

    // currentUser 설정
    isGuest = true
    currentUser = {
      id: guestId,
      username: "guest",
      nickname: nickname,
      joinDate: new Date().toISOString().split("T")[0],
      level: 1,
      profileImage: "/placeholder.svg?height=80&width=80",
    }

    updateUserInterface() // currentUser 설정 후 UI 업데이트
    closeAllModals()
    showNotification("게스트로 시작합니다!", "info")
  }

  function proceedToGame(gameType) {
    if (gameType === "baseball") {
      showModal(modeSelectionModal)
    } else if (gameType === "chess") {
      alert("체스는 현재 개발 중입니다!")
    } else {
      window.location.href = `/game.html?type=${gameType}`
    }
  }

  function generateGuestId() {
    return "guest_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
  }

  function showScreen(screenName) {
    screens.forEach((screen) => {
      screen.classList.remove("active")
    })

    const targetScreen = document.getElementById(`${screenName}-screen`)
    if (targetScreen) {
      targetScreen.classList.add("active")
    }
  }

  function updateActiveNav(activeItem) {
    navItems.forEach((item) => {
      item.classList.remove("active")
    })
    activeItem.classList.add("active")
  }

  function showModal(modal) {
    closeAllModals()
    modal.classList.remove("hidden")
    document.body.style.overflow = "hidden"
  }

  function closeAllModals() {
    document.querySelectorAll(".modal-overlay").forEach((modal) => {
      modal.classList.add("hidden")
    })
    document.body.style.overflow = "auto"
  }

  function handleLogin(e) {
    e.preventDefault()
    const username = document.getElementById("login-username").value
    const password = document.getElementById("login-password").value

    // 실제 구현에서는 서버 API 호출
    if (username && password) {
      currentUser = {
        id: generateUserId(),
        username: username,
        nickname: username,
        joinDate: new Date().toISOString().split("T")[0],
        level: calculateUserLevel(),
        profileImage: "/placeholder.svg?height=80&width=80",
      }

      isGuest = false
      localStorage.setItem("currentUser", JSON.stringify(currentUser))
      sessionStorage.setItem("playerNickname", currentUser.nickname)

      updateUserInterface()
      closeAllModals()
      showNotification("로그인되었습니다!", "success")
    }
  }

  function handleRegister(e) {
    e.preventDefault()
    const username = document.getElementById("register-username").value
    const password = document.getElementById("register-password").value
    const passwordConfirm = document.getElementById("register-password-confirm").value
    const nickname = document.getElementById("register-nickname").value

    if (password !== passwordConfirm) {
      alert("비밀번호가 일치하지 않습니다.")
      return
    }

    // 실제 구현에서는 서버 API 호출
    currentUser = {
      id: generateUserId(),
      username: username,
      nickname: nickname,
      joinDate: new Date().toISOString().split("T")[0],
      level: 1,
      profileImage: "/placeholder.svg?height=80&width=80",
    }

    isGuest = false
    localStorage.setItem("currentUser", JSON.stringify(currentUser))
    sessionStorage.setItem("playerNickname", currentUser.nickname)

    updateUserInterface()
    closeAllModals()
    showNotification("회원가입이 완료되었습니다!", "success")
  }

  function handleGuestLogin() {
    const existingGuestNickname = sessionStorage.getItem("guestNickname")
    if (existingGuestNickname) {
      // If guest nickname already exists, log in as guest directly
      isGuest = true
      currentUser = {
        id: sessionStorage.getItem("guestId") || generateGuestId(), // Reuse existing guest ID
        username: "guest",
        nickname: existingGuestNickname,
        joinDate: new Date().toISOString().split("T")[0],
        level: 1,
        profileImage: "/placeholder.svg?height=80&width=80",
      }
      sessionStorage.setItem("playerNickname", currentUser.nickname) // Ensure playerNickname is set
      updateUserInterface()
      closeAllModals()
      showNotification("게스트로 로그인되었습니다!", "info")
    } else {
      // If no guest nickname, prompt for one
      showGuestNicknameModal()
    }
  }

  function handleLogout() {
    currentUser = null
    isGuest = false
    localStorage.removeItem("currentUser")
    sessionStorage.removeItem("playerNickname")
    sessionStorage.removeItem("guestNickname")
    sessionStorage.removeItem("guestId")
    updateUserInterface()
    showNotification("로그아웃되었습니다!", "info")
  }

  function generateUserId() {
    return "user_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
  }

  function calculateUserLevel() {
    const totalGames = gameStats.overall.totalGames
    return Math.floor(totalGames / 10) + 1
  }

  function showNicknameEdit() {
    nicknameDisplaySection.classList.add("hidden")
    nicknameEditSection.classList.remove("hidden")
    newNicknameInput.value = currentUser.nickname
    newNicknameInput.focus()
  }

  function hideNicknameEdit() {
    nicknameDisplaySection.classList.remove("hidden")
    nicknameEditSection.classList.add("hidden")
  }

  function saveNickname() {
    const newNickname = newNicknameInput.value.trim()
    if (!validateNickname(newNickname)) {
      alert("올바른 닉네임을 입력해주세요!")
      return
    }

    currentUser.nickname = newNickname
    localStorage.setItem("currentUser", JSON.stringify(currentUser))
    sessionStorage.setItem("playerNickname", newNickname)

    updateUserInterface()
    hideNicknameEdit()
    showNotification("닉네임이 변경되었습니다!", "success")
  }

  function switchStatsTab(gameType) {
    statsTabs.forEach((tab) => {
      tab.classList.remove("active")
    })
    statsContents.forEach((content) => {
      content.classList.remove("active")
    })

    document.querySelector(`[data-game="${gameType}"]`).classList.add("active")
    document.getElementById(`${gameType}-stats`).classList.add("active")
  }

  function updateUserInterface() {
    const guestSection = document.getElementById("guest-section")
    const userSection = document.getElementById("user-section")
    const recentGamesSection = document.getElementById("recent-games-section")

    if (currentUser) {
      guestSection.classList.add("hidden")
      userSection.classList.remove("hidden")
      recentGamesSection.classList.remove("hidden")

      document.getElementById("user-nickname").textContent = currentUser.nickname

      // 프로필 모달 업데이트
      document.getElementById("profile-nickname-display").textContent = currentUser.nickname
      document.getElementById("profile-join-date").textContent = currentUser.joinDate
      document.getElementById("user-level").textContent = currentUser.level
      document.getElementById("profile-image").src = currentUser.profileImage

      // 사용자 타입 배지 업데이트
      const userTypeBadge = document.getElementById("user-type-badge")
      if (isGuest) {
        userTypeBadge.textContent = "게스트"
        userTypeBadge.className = "user-type guest"
        editNicknameBtn.style.display = "none" // 게스트는 닉네임 변경 불가
      } else {
        userTypeBadge.textContent = "회원"
        userTypeBadge.className = "user-type member"
        editNicknameBtn.style.display = "inline-block"
      }
    } else {
      guestSection.classList.remove("hidden")
      userSection.classList.add("hidden")
      recentGamesSection.classList.add("hidden")
    }
  }

  function updateGameStats() {
    // 전체 통계 업데이트
    const overall = gameStats.overall
    document.getElementById("total-games").textContent = overall.totalGames
    document.getElementById("total-wins").textContent = overall.totalWins
    document.getElementById("overall-winrate").textContent =
      overall.totalGames > 0 ? Math.round((overall.totalWins / overall.totalGames) * 100) + "%" : "0%"
    document.getElementById("total-playtime").textContent = Math.floor(overall.totalPlaytime / 60) + "h"

    // 숫자야구 통계 업데이트
    const baseball = gameStats.baseball
    document.getElementById("baseball-games").textContent = baseball.games
    document.getElementById("baseball-wins").textContent = baseball.wins
    document.getElementById("baseball-losses").textContent = baseball.losses
    document.getElementById("baseball-winrate").textContent =
      baseball.games > 0 ? Math.round((baseball.wins / baseball.games) * 100) + "%" : "0%"
    document.getElementById("baseball-avg-attempts").textContent =
      baseball.avgAttempts > 0 ? baseball.avgAttempts.toFixed(1) : "0"
    document.getElementById("baseball-best-score").textContent = baseball.bestScore ? baseball.bestScore + "회" : "-"

    // 오목 통계 업데이트
    const omok = gameStats.omok
    document.getElementById("omok-games").textContent = omok.games
    document.getElementById("omok-wins").textContent = omok.wins
    document.getElementById("omok-losses").textContent = omok.losses
    document.getElementById("omok-draws").textContent = omok.draws
    document.getElementById("omok-winrate").textContent =
      omok.games > 0 ? Math.round((omok.wins / omok.games) * 100) + "%" : "0%"
    document.getElementById("omok-avg-moves").textContent = omok.avgMoves > 0 ? omok.avgMoves.toFixed(1) : "0"

    // 최근 게임 기록 업데이트
    updateRecentGames("baseball", baseball.recentGames)
    updateRecentGames("omok", omok.recentGames)
  }

  function updateRecentGames(gameType, recentGames) {
    const container = document.getElementById(`${gameType}-recent-games`)
    container.innerHTML = ""

    if (recentGames.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: #666; padding: 1rem;">아직 게임 기록이 없습니다.</p>'
      return
    }

    recentGames.slice(0, 5).forEach((game) => {
      const gameItem = document.createElement("div")
      gameItem.className = "recent-game-item"
      gameItem.innerHTML = `
        <div class="recent-game-info">
          <div class="recent-game-result ${game.result}">${getResultText(game.result)}</div>
          <div class="recent-game-details">${game.details}</div>
        </div>
        <div class="recent-game-date">${game.date}</div>
      `
      container.appendChild(gameItem)
    })
  }

  function getResultText(result) {
    switch (result) {
      case "win":
        return "승리"
      case "lose":
        return "패배"
      case "draw":
        return "무승부"
      default:
        return result
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
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `
    notification.textContent = message

    document.body.appendChild(notification)

    setTimeout(() => {
      notification.style.animation = "slideOut 0.3s ease"
      setTimeout(() => {
        document.body.removeChild(notification)
      }, 300)
    }, 3000)
  }

  // 게임 통계 업데이트 함수 (게임 종료 시 호출)
  window.updateGameStatistics = (gameType, result, details) => {
    gameStats.overall.totalGames++
    if (result === "win") {
      gameStats.overall.totalWins++
    }

    if (gameStats[gameType]) {
      gameStats[gameType].games++
      if (result === "win") {
        gameStats[gameType].wins++
      } else if (result === "lose") {
        gameStats[gameType].losses++
      } else if (result === "draw") {
        gameStats[gameType].draws++
      }

      // 최근 게임 기록 추가
      gameStats[gameType].recentGames.unshift({
        result: result,
        details: details,
        date: new Date().toLocaleDateString(),
      })

      // 최대 10개까지만 저장
      if (gameStats[gameType].recentGames.length > 10) {
        gameStats[gameType].recentGames.pop()
      }
    }

    // 레벨 업데이트
    if (currentUser) {
      currentUser.level = calculateUserLevel()
      localStorage.setItem("currentUser", JSON.stringify(currentUser))
    }

    // 통계 저장
    localStorage.setItem("gameStats", JSON.stringify(gameStats))
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
