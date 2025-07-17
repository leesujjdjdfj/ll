document.addEventListener('DOMContentLoaded', () => {
    // 화면 요소
    const body = document.body;
    const setupScreen = document.getElementById('setup-screen');
    const setNumberScreen = document.getElementById('set-number-screen');
    const gameScreen = document.getElementById('game-screen');
    const statusText = document.getElementById('status-text');

    // 설정 화면 요소
    const digitsSelect = document.getElementById('digits-select');
    const createRoomButton = document.getElementById('create-room-button');
    const roomCodeInput = document.getElementById('room-code-input');
    const joinRoomButton = document.getElementById('join-room-button');
    const roomInfo = document.getElementById('room-info');
    const roomCodeDisplay = document.getElementById('room-code-display');
    
    // 비밀 숫자 설정 화면 요소
    const setNumberInfo = document.getElementById('set-number-info');
    const secretInput = document.getElementById('secret-number-input');
    const setNumberButton = document.getElementById('set-number-button');

    // 게임 진행 화면 요소
    const infoText = document.getElementById('info-text');
    const guessInput = document.getElementById('guess-input');
    const guessButton = document.getElementById('guess-button');
    const myGuessesList = document.querySelector('#my-guesses ul');
    const opponentGuessesList = document.querySelector('#opponent-guesses ul');
    const myScoreDisplay = document.getElementById('my-score');
    const opponentScoreDisplay = document.getElementById('opponent-score');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const chatSendButton = document.getElementById('chat-send-button');
    const gameOverActions = document.getElementById('game-over-actions');
    const playAgainButton = document.getElementById('play-again-button');
    const mySecretNumberDisplay = document.getElementById('my-secret-number-display');
    const mySecretNumberSpan = document.getElementById('my-secret-number');

    let ws;
    let gameDigits = 3;
    let mySecretNumber = '';

    function connectToServer() {
        if (ws && ws.readyState === WebSocket.OPEN) return;
        
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        ws = new WebSocket(`${wsProtocol}//${window.location.host}`);

        ws.onopen = () => statusText.textContent = '서버에 연결되었습니다. 방을 만들거나 참가하세요.';
        ws.onmessage = handleServerMessage;
        ws.onclose = () => statusText.textContent = '서버와의 연결이 끊겼습니다. 새로고침 해주세요.';
    }

    function handleServerMessage(event) {
        const data = JSON.parse(event.data);
        console.log('서버 메시지:', data);
        
        body.classList.remove('win-effect', 'lose-effect');

        switch (data.type) {
            case 'game_created':
                roomInfo.classList.remove('hidden');
                roomCodeDisplay.textContent = data.roomCode;
                statusText.textContent = `방 생성 완료! 친구를 기다리세요...`;
                createRoomButton.disabled = true;
                joinRoomButton.disabled = true;
                roomCodeInput.disabled = true;
                break;
            case 'prompt_secret':
                setupScreen.classList.add('hidden');
                gameScreen.classList.add('hidden');
                gameOverActions.classList.add('hidden');
                setNumberScreen.classList.remove('hidden');
                
                setNumberButton.disabled = false;
                secretInput.disabled = false;
                secretInput.value = '';
                if(myGuessesList) myGuessesList.innerHTML = '';
                if(opponentGuessesList) opponentGuessesList.innerHTML = '';

                mySecretNumberDisplay.classList.add('hidden');
                gameDigits = data.digits;
                setNumberInfo.textContent = `사용할 비밀 숫자를 정해주세요. (${gameDigits}자리, 중복 없음)`;
                statusText.textContent = '비밀 숫자를 정할 시간입니다.';
                break;
            case 'game_ready':
                setNumberScreen.classList.add('hidden');
                gameScreen.classList.remove('hidden');
                statusText.textContent = data.message;
                guessButton.disabled = !data.message.includes('당신의 턴');
                
                myScoreDisplay.textContent = `나: ${data.myScore}`;
                opponentScoreDisplay.textContent = `상대: ${data.opponentScore}`;
                
                mySecretNumberSpan.textContent = mySecretNumber;
                mySecretNumberDisplay.classList.remove('hidden');
                break;
            case 'info':
                infoText.textContent = data.message;
                guessButton.disabled = !data.message.includes('당신의 턴');
                break;
            case 'update':
                const logItem = document.createElement('li');
                logItem.textContent = `${data.guess} ➞ ${data.result}`;
                if (data.by === 'me') myGuessesList.appendChild(logItem);
                else opponentGuessesList.appendChild(logItem);
                break;
            case 'game_over':
                statusText.textContent = data.message;
                infoText.textContent = '게임 종료!';
                guessButton.disabled = true;
                gameOverActions.classList.remove('hidden');
                
                if (data.result === 'win') {
                    statusText.style.color = 'green';
                    body.classList.add('win-effect');
                } else {
                    statusText.style.color = 'red';
                    body.classList.add('lose-effect');
                }
                break;
            case 'chat_message':
                const msgEl = document.createElement('div');
                msgEl.textContent = `${data.sender}: ${data.text}`;
                chatMessages.appendChild(msgEl);
                chatMessages.scrollTop = chatMessages.scrollHeight;
                break;
            case 'error':
                alert(data.message);
                statusText.textContent = '오류 발생. 다시 시도하세요.';
                createRoomButton.disabled = false;
                joinRoomButton.disabled = false;
                roomCodeInput.disabled = false;
                break;
        }
    }

    function isValidClientNumber(number, digits) {
        return number.length === digits && !isNaN(number) && new Set(number).size === number.length;
    }

    createRoomButton.addEventListener('click', () => {
        const digits = parseInt(digitsSelect.value, 10);
        ws.send(JSON.stringify({ type: 'create_game', digits }));
    });

    joinRoomButton.addEventListener('click', () => {
        const roomCode = roomCodeInput.value.trim();
        if (!roomCode) {
            alert('방 코드를 입력해주세요.');
            return;
        }
        ws.send(JSON.stringify({ type: 'join_game', roomCode }));
    });

    setNumberButton.addEventListener('click', () => {
        const number = secretInput.value;
        if (!isValidClientNumber(number, gameDigits)) {
            alert(`유효하지 않은 숫자입니다. (${gameDigits}자리, 중복 없음)`);
            return;
        }
        mySecretNumber = number;

        ws.send(JSON.stringify({ type: 'set_secret', number }));
        setNumberButton.disabled = true;
        secretInput.disabled = true;
        statusText.textContent = '상대방이 비밀 숫자를 정하기를 기다리는 중...';
    });

    guessButton.addEventListener('click', () => {
        const guess = guessInput.value;
        if (!isValidClientNumber(guess, gameDigits)) {
            alert(`추측한 숫자가 유효하지 않습니다. (${gameDigits}자리)`);
            return;
        }
        ws.send(JSON.stringify({ type: 'guess', guess }));
        guessInput.value = '';
    });

    chatSendButton.addEventListener('click', () => {
        const text = chatInput.value.trim();
        if (text) {
            ws.send(JSON.stringify({ type: 'chat_message', text }));
            chatInput.value = '';
        }
    });

    chatInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            chatSendButton.click();
        }
    });

    playAgainButton.addEventListener('click', () => {
        ws.send(JSON.stringify({ type: 'play_again' }));
        statusText.textContent = "상대방이 다시하기를 누르기를 기다립니다...";
        gameOverActions.classList.add('hidden');
        body.classList.remove('win-effect', 'lose-effect');
    });

    connectToServer();
});