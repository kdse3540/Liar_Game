/**
 * ====================================================================
 * [라이어 게임 백엔드 소켓 서버 (Socket.io)]
 * --------------------------------------------------------------------
 * 이 서버는 실시간 방 만들기, 인원 동기화, 실시간 채팅,
 * 그리고 라이어 선출 및 비밀 제시어 전달을 총괄하는 백엔드입니다.
 * ====================================================================
 */

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { getRandomWord, getTwoRandomWords, getCategories, wordCategories } from "./words.js";

const app = express();
app.use(cors());

// Render 등 클라우드 배포 서비스를 위한 헬스체크 기본 라우트
app.get("/", (req, res) => {
  res.send("🚀 [Liar Game Socket Backend Server Active]");
});

// [서버 예외 안전장치] 예측하지 못한 에러 발생 시 서버가 다운되지 않도록 예외 처리
process.on("uncaughtException", (err) => {
  console.error("🚨 [Uncaught Exception] 예상치 못한 에러 발생:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("🚨 [Unhandled Rejection] 거부된 프로미스 에러:", reason);
});


// HTTP 및 Socket.io 서버 객체 생성
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // 모든 클라이언트 접속 허용 (개발 및 로컬 테스트용)
    methods: ["GET", "POST"],
  },
});

/**
 * [서버 메모리 상태 관리 - In-Memory State]
 * 방 코드(roomCode)를 key로 하여 각 방의 정보를 저장합니다.
 * rooms[roomCode] = {
 *   roomCode: string,
 *   roomTitle: string,
 *   maxPlayers: number,
 *   liarCount: number,
 *   hintTime: number,
 *   defenseTime: number,
 *   players: Array<{ socketId, name, icon, isHost, ready, color, softColor }>,
 *   gameState: "waiting" | "playing",
 *   currentWordInfo: { category, word } | null,
 *   liarSocketIds: string[]
 * }
 */
const rooms = {};
const roomTimers = {}; // 순환 참조 방지를 위한 독립적인 방별 타이머 맵

// 무작위 유저 컬러 팔레트 (초보자분들이 쉽게 알아볼 수 있는 오렌지/블루/그린 등 12가지 파스텔 컬러)
const colorPalette = [
  { color: "#ff6f3c", softColor: "#ffe3d1" },
  { color: "#4a8eff", softColor: "#dbeaff" },
  { color: "#f5b300", softColor: "#fff2c4" },
  { color: "#9b51e0", softColor: "#eedfff" },
  { color: "#10b981", softColor: "#cbf7e6" },
  { color: "#ff4785", softColor: "#ffdbe8" },
  { color: "#635bff", softColor: "#e6e1ff" },
  { color: "#84cc16", softColor: "#e2f9d3" },
  { color: "#ec4899", softColor: "#ffe0f0" },
  { color: "#f97316", softColor: "#ffe9cc" },
  { color: "#06b6d4", softColor: "#d3f8ff" },
  { color: "#eab308", softColor: "#fffbe0" },
];

/**
 * Fisher-Yates 무작위 셔플 알고리즘
 * --------------------------------------------------------------------
 * Array.prototype.sort(() => Math.random() - 0.5) 방식은 0번 인덱스(방장)가
 * 셔플 후에도 항상 앞에 남아 라이어로 선택되는 극심한 편향 버그가 발생합니다.
 * Fisher-Yates 알고리즘을 사용하면 모든 인원의 라이어 당첨 확률이 정확히 1/N로 균등 보장됩니다.
 */
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 초스피드 테스트 모드 적용 시 모든 타이머를 1초로 변환해주는 보조 함수
 */
function getEffectiveSec(room, defaultSec) {
  if (room && room.fastTestMode) {
    return 1;
  }
  return defaultSec;
}

/**
 * Socket.io 클라이언트 연결 이벤트 처리
 */
io.on("connection", (socket) => {
  console.log(`🟢 새 클라이언트 접속: ${socket.id}`);

  // ------------------------------------------------------------------
  // 1. 방 만들기 (create-room)
  // ------------------------------------------------------------------
  socket.on("create-room", ({ roomCode, roomTitle, roomPassword, adminPassword, maxPlayers, liarCount, gameMode, hintTime, discussionTime, defenseTime, nickname, portrait }) => {
    // 🔒 테스트 버전 관리자 방 생성 비밀번호 검증 (0307)
    if (adminPassword !== "0307") {
      return socket.emit("room-error", { message: "🔒 테스트 버전이므로 관리자만 방을 생성할 수 있습니다. (비밀번호 오류)" });
    }

    const code = (roomCode || "MANGO7").toUpperCase().trim();
    
    // 방 생성
    const hostColor = colorPalette[0];
    const hostPlayer = {
      socketId: socket.id,
      name: nickname || "방장감자",
      icon: portrait || "/portraits/Portrait_01.png",
      isHost: true,
      ready: true, // 방장은 기본 ready
      isDisconnected: false,
      color: hostColor.color,
      softColor: hostColor.softColor,
      stats: { citizenWin: 0, liarWin: 0, citizenLoss: 0, liarLoss: 0 }, // 실시간 누적 전적 초기화
    };

    rooms[code] = {
      roomCode: code,
      roomTitle: roomTitle || "신나는 라이어 게임 방",
      roomPassword: roomPassword || "",
      maxPlayers: Number(maxPlayers) || 12,
      liarCount: Number(liarCount) || 1,
      gameMode: gameMode || "fool", // 🎮 게임 모드 기본값: 바보 라이어 모드
      hintTime: Number(hintTime) || 20,
      discussionTime: Number(discussionTime) || 40,
      defenseTime: Number(defenseTime) || 45,
      players: [hostPlayer],
      currentWordInfo: null,
      liarSocketIds: [],
    };

    socket.join(code);
    socket.data.roomCode = code;
    socket.data.nickname = hostPlayer.name;

    console.log(`🏠 [방 생성 완료] 코드: ${code}, 방장: ${hostPlayer.name}`);

    // 생성자에게 성공 응답 및 방 정보 전달
    socket.emit("room-joined", {
      success: true,
      room: rooms[code],
      myPlayer: hostPlayer,
    });
  });

  // ------------------------------------------------------------------
  // 2. 기존 방에 입장하기 (join-room)
  // ------------------------------------------------------------------
  socket.on("join-room", ({ roomCode, roomPassword, nickname, portrait }) => {
    const code = (roomCode || "").toUpperCase().trim();
    const room = rooms[code];

    if (!room) {
      return socket.emit("room-error", { message: "존재하지 않는 방 코드입니다." });
    }

    // 비밀번호 체크 (비밀번호가 설정되어 있고 빈 문자열이 아닐 때만 체크)
    if (room.roomPassword && room.roomPassword.trim() !== "" && room.roomPassword !== roomPassword) {
      return socket.emit("room-password-required", { roomCode: code, message: "방에 비밀번호가 설정되어 있습니다." });
    }

    if (room.players.length >= room.maxPlayers) {
      return socket.emit("room-error", { message: "방 정원이 가득 찼습니다." });
    }

    if (room.gameState === "playing") {
      return socket.emit("room-error", { message: "이미 게임이 진행 중인 방입니다." });
    }

    // 새 플레이어 객체 생성
    const colorIndex = room.players.length % colorPalette.length;
    const playerColor = colorPalette[colorIndex];
    const newPlayer = {
      socketId: socket.id,
      name: nickname || `참여자_${room.players.length + 1}`,
      icon: portrait || "/portraits/Portrait_01.png",
      isHost: false,
      ready: false,
      color: playerColor.color,
      softColor: playerColor.softColor,
      stats: { citizenWin: 0, liarWin: 0, citizenLoss: 0, liarLoss: 0 }, // 실시간 누적 전적 초기화
    };

    room.players.push(newPlayer);
    socket.join(code);
    socket.data.roomCode = code;
    socket.data.nickname = newPlayer.name;

    console.log(`👤 [방 입장] 코드: ${code}, 참가자: ${newPlayer.name}`);

    // 입장한 사용자에게 내 정보 송신
    socket.emit("room-joined", {
      success: true,
      room,
      myPlayer: newPlayer,
    });

    // 방원들에게 방 정보 업데이트 브로드캐스트
    io.to(code).emit("room-updated", { room });
  });

  socket.on("update-room-settings", ({ roomTitle, roomPassword, maxPlayers, liarCount, gameMode, hintTime, discussionTime, defenseTime, fastTestMode, selectedCategory }) => {
    const code = socket.data.roomCode;
    const room = rooms[code];
    if (!room) return;

    // 방장 권한 확인
    const hostPlayer = room.players.find((p) => p.isHost);
    if (!hostPlayer || hostPlayer.socketId !== socket.id) return;

    if (roomTitle !== undefined) room.roomTitle = roomTitle;
    if (roomPassword !== undefined) room.roomPassword = roomPassword;
    if (maxPlayers !== undefined) room.maxPlayers = Number(maxPlayers);
    if (liarCount !== undefined) room.liarCount = Number(liarCount);
    if (gameMode !== undefined) room.gameMode = gameMode;
    if (hintTime !== undefined) room.hintTime = Number(hintTime);
    if (discussionTime !== undefined) room.discussionTime = Number(discussionTime);
    if (defenseTime !== undefined) room.defenseTime = Number(defenseTime);
    if (fastTestMode !== undefined) room.fastTestMode = Boolean(fastTestMode);
    if (selectedCategory !== undefined) room.selectedCategory = selectedCategory;

    console.log(`⚙️ [방 설정 변경] 방: ${code}, 모드: ${room.gameMode}, 힌트시간: ${room.hintTime}초, 변론시간: ${room.defenseTime}초`);

    io.to(code).emit("room-updated", { room, categories: getCategories() });
  });

  // ------------------------------------------------------------------
  // 3. 준비 상태 전환 (toggle-ready)
  // ------------------------------------------------------------------
  socket.on("toggle-ready", () => {
    const code = socket.data.roomCode;
    const room = rooms[code];
    if (!room) return;

    const player = room.players.find((p) => p.socketId === socket.id);
    if (player && !player.isHost) {
      player.ready = !player.ready;
      io.to(code).emit("room-updated", { room });
    }
  });

  // ------------------------------------------------------------------
  // 4. 실시간 메시지 전송 및 말풍선 브로드캐스트 (send-chat)
  // ------------------------------------------------------------------
  socket.on("send-chat", ({ text, roomCode }) => {
    const code = (roomCode || socket.data.roomCode || "").toUpperCase().trim();
    let room = rooms[code];

    // 방 코드가 미매칭되면 소켓이 소속된 방을 역추적
    if (!room) {
      const foundCode = Object.keys(rooms).find((c) => rooms[c].players.some((p) => p.socketId === socket.id));
      if (foundCode) room = rooms[foundCode];
    }

    if (!room || !text.trim()) return;

    // 탈락자는 채팅권 박탈 (관전자)
    if (room.eliminatedSocketIds && room.eliminatedSocketIds.includes(socket.id)) {
      return socket.emit("room-error", { message: "탈락한 상태이므로 채팅을 작성할 수 없습니다." });
    }

    const sender = room.players.find((p) => p.socketId === socket.id);
    const chatPayload = {
      senderId: socket.id,
      senderName: sender ? sender.name : "익명",
      senderIcon: sender ? sender.icon : "💬",
      senderColor: sender ? sender.color : "#7652dd",
      text: text.trim(),
      time: "방금",
    };

    // 💡 [핵심 수정] 힌트 발언 단계(hint-turn)이고, 현재 발언 순서인 유저인 경우 힌트 기록(playerHints)에 등록!
    // 자유 토론(free-talk), 최후변론(final-defense/self-defense), 투표, 대기실 등에서의 일반 대화는 제외
    const isNonHintPhase = (
      room.phase === "free-talk" ||
      room.phase === "vote" ||
      room.phase === "vote-result" ||
      room.phase === "final-defense" ||
      room.phase === "self-defense" ||
      room.phase === "post-vote-free-talk" ||
      room.phase === "final-decision" ||
      room.phase === "re-vote" ||
      room.phase === "roulette" ||
      room.phase === "result" ||
      room.phase === "waiting"
    );
    const isHintSpeaker = room.activeSpeakerSocketId === socket.id;

    if (room.gameState === "playing" && !isNonHintPhase && isHintSpeaker) {
      if (!room.playerHints) room.playerHints = {};
      const hintKey = sender ? sender.socketId : socket.id;
      if (!room.playerHints[hintKey]) room.playerHints[hintKey] = [];
      if (sender && sender.name && !room.playerHints[sender.name]) {
        room.playerHints[sender.name] = room.playerHints[hintKey];
      }

      room.playerHints[hintKey].push({
        round: room.round || 1,
        text: text.trim(),
        time: "방금",
      });

      console.log(`💡 [힌트 등록 성공] 발언자: ${sender?.name || socket.id}, 내용: "${text.trim()}"`);

      // 방 안의 모든 플레이어에게 업데이트된 힌트 목록 브로드캐스트 전송
      io.to(room.roomCode).emit("player-hints-updated", { playerHints: room.playerHints });
    }

    // 방의 모든 클라이언트에게 실시간 수신 (일반 채팅 메시지는 단계에 상관없이 항상 전달)
    io.to(room.roomCode).emit("chat-received", chatPayload);
  });

  // ------------------------------------------------------------------
  // 5. 방장의 게임 시작 요청 (start-game)
  // ------------------------------------------------------------------
  socket.on("start-game", () => {
    const code = socket.data.roomCode;
    const room = rooms[code];
    if (!room) return;

    // 방장만 게임 시작 가능
    const host = room.players.find((p) => p.socketId === socket.id);
    if (!host || !host.isHost) {
      return socket.emit("room-error", { message: "방장만 게임을 시작할 수 있습니다." });
    }

    if (room.players.length < 2) {
      return socket.emit("room-error", { message: "최소 2명 이상이어야 게임을 시작할 수 있습니다." });
    }

    // 방장을 제외한 모든 참여자가 Ready 상태인지 검사
    const unreadyPlayers = room.players.filter((p) => !p.isHost && !p.ready);
    if (unreadyPlayers.length > 0) {
      return socket.emit("room-error", {
        message: `아직 준비(READY)를 하지 않은 참가자가 있습니다. (${unreadyPlayers.map((p) => p.name).join(", ")})`,
      });
    }

    // 제시어 및 카테고리 선출 (게임 모드 반영)
    const isFoolMode = (room.gameMode || "fool") === "fool";
    let wordInfo;
    if (isFoolMode) {
      // 🤪 바보 라이어 모드 (기본값): 시민용 제시어(word1)와 라이어용 다른 제시어(word2)를 추출
      const twoWords = getTwoRandomWords(room.selectedCategory);
      wordInfo = {
        category: twoWords.category,
        word: twoWords.word1, // 시민이 받는 진짜 제시어
        foolWord: twoWords.word2, // 라이어가 받는 다른 제시어
      };
    } else {
      // 😈 클래식 라이어 모드: 1개의 제시어 추출
      const singleWord = getRandomWord(room.selectedCategory);
      wordInfo = {
        category: singleWord.category,
        word: singleWord.word,
        foolWord: "🚨 라이어",
      };
    }

    room.currentWordInfo = wordInfo;
    room.gameState = "playing";
    room.phase = "countdown";
    room.round = 1;
    room.playerHints = {}; // 게임 시작 시 힌트 기록 초기화

    // 3) 라이어(Liar) 무작위 선출 (Fisher-Yates 셔플 알고리즘 적용)
    const allSocketIds = room.players.map((p) => p.socketId);
    const shuffledSocketIds = shuffleArray(allSocketIds);
    const actualLiarCount = Math.min(room.liarCount, room.players.length - 1);
    room.liarSocketIds = shuffledSocketIds.slice(0, actualLiarCount);

    const liarNames = room.liarSocketIds.map(id => room.players.find(p => p.socketId === id)?.name).join(", ");
    console.log(`🎮 [게임 시작] 방: ${code}, 모드: ${room.gameMode || "fool"}, 진짜제시어: ${wordInfo.word}, 라이어제시어: ${wordInfo.foolWord}, 라이어(${actualLiarCount}명): ${liarNames}`);

    // 4) 방 턴 및 투표 상태 초기화
    room.turnIndex = 0;
    room.turnCount = 0;
    room.activeSpeakerSocketId = room.players[0]?.socketId || "";
    room.votes = {};
    room.eliminatedSocketIds = [];

    // 매 판 시작 시 인당 아이템 4종 지급
    room.players.forEach((p) => {
      p.inventory = { tomato: 2, egg: 2, water: 2, banana: 2 };
      p.stains = [];
    });

    // 5) 각 플레이어에게 개별 역할 및 비밀 제시어 송신
    room.players.forEach((p) => {
      const isLiar = room.liarSocketIds.includes(p.socketId);
      const givenWord = isLiar
        ? (isFoolMode ? wordInfo.foolWord : "🚨 라이어")
        : wordInfo.word;

      io.to(p.socketId).emit("game-started", {
        room,
        category: wordInfo.category,
        word: givenWord,
        realWord: wordInfo.word,
        foolWord: wordInfo.foolWord,
        isLiar,
        gameMode: room.gameMode || "fool",
        activeSpeakerSocketId: room.activeSpeakerSocketId,
      });
    });

    // 6) 3, 2, 1 카운트다운 소켓 브로드캐스트
    io.to(code).emit("game-phase-changed", {
      phase: "countdown",
      activeSpeakerSocketId: room.activeSpeakerSocketId,
      message: "3, 2, 1 카운트다운 시작!",
    });

    // 7) 💡 [자동 동기화 타이머] 카운트다운(3초) + 제시어확인(5초) + 첫 발언자모달(1.8초) 후 hint-turn 자동 설정
    if (roomTimers[code]) clearTimeout(roomTimers[code]);
    roomTimers[code] = setTimeout(() => {
      if (!rooms[code] || rooms[code].gameState !== "playing") return;
      rooms[code].phase = "hint-turn";
      console.log(`🎙️ [1라운드 힌트 발언 진입] 방: ${code}, 발언자: ${rooms[code].players[0]?.name}`);
    }, 9800);
  });

  // ------------------------------------------------------------------
  // 5-1. 다음 턴으로 넘기기 (turn-pass)
  // ------------------------------------------------------------------
  socket.on("turn-pass", () => {
    const code = socket.data.roomCode;
    const room = rooms[code];
    if (!room || room.gameState !== "playing") return;

    // 연달아 소켓이 이중 전송되어 턴을 뛰어넘는 버그 방지 (최소 1초 쿨다운)
    const now = Date.now();
    if (room.lastTurnPassTime && now - room.lastTurnPassTime < 1000) {
      return;
    }

    // 방 참가자 누구나(발언자, 방장 등) 턴 넘기기 송신 시 유효하게 수용
    const isRoomMember = room.players.some((p) => p.socketId === socket.id);

    if (isRoomMember) {
      room.lastTurnPassTime = now;
      room.turnCount = (room.turnCount || 0) + 1;

      // 방 안의 모든 플레이어가 힌트를 1번씩 발표 완료한 경우!
      if (room.turnCount >= room.players.length) {
        room.phase = "free-talk";
        room.activeSpeakerSocketId = ""; // 전원 자유 대화 해금
        room.skipDiscussionVotes = []; // 💡 자유토론 조기종료 동의 목록 초기화

        const discSec = getEffectiveSec(room, room.discussionTime || 40);
        console.log(`💬 [자유 토론 시작] 방: ${code}, ${discSec}초간 자유 토론 진입 (테스트모드: ${Boolean(room.fastTestMode)})`);

        io.to(code).emit("game-phase-changed", {
          phase: "free-talk",
          activeSpeakerSocketId: "",
          discussionTime: discSec,
          message: `📢 [시스템] 모든 플레이어의 힌트 발언이 끝났습니다. ${discSec}초간 자유 토론 후 라이어 지목 투표를 진행합니다.`,
        });

        // 동적 설정된 자유 토론 시간 후 자동으로 1차 투표(vote) 단계로 이행
        if (roomTimers[code]) clearTimeout(roomTimers[code]);
        roomTimers[code] = setTimeout(() => {
          if (!rooms[code]) return; // [방어 코드] 방이 이미 삭제된 경우 실행 중단
          room.phase = "vote";
          io.to(code).emit("game-phase-changed", {
            phase: "vote",
            activeSpeakerSocketId: "",
            message: "🗳️ 1차 라이어 지목 투표를 시작합니다! (8초)",
          });
        }, discSec * 1000);

        return;
      }

      // 아직 남아있는 발언자가 있는 경우 다음 턴으로 이동
      room.turnIndex = (room.turnIndex + 1) % room.players.length;
      room.activeSpeakerSocketId = room.players[room.turnIndex]?.socketId || "";

      console.log(`🔄 [턴 전환] 방: ${code}, turnCount: ${room.turnCount}/${room.players.length}, 발언자: ${room.players[room.turnIndex]?.name}`);

      io.to(code).emit("turn-changed", {
        turnIndex: room.turnIndex,
        activeSpeakerSocketId: room.activeSpeakerSocketId,
        activeSpeakerName: room.players[room.turnIndex]?.name,
        hintTime: getEffectiveSec(room, room.hintTime || 20),
      });
    }
  });

  // ------------------------------------------------------------------
  // 5-1b. 최후변론 / 자기변호 조기 종료 (pass-defense)
  // ------------------------------------------------------------------
  socket.on("pass-defense", () => {
    let code = socket.data.roomCode;
    let room = rooms[code];
    if (!room) {
      const foundCode = Object.keys(rooms).find((c) =>
        rooms[c].players.some((p) => p.socketId === socket.id)
      );
      if (foundCode) {
        room = rooms[foundCode];
        code = foundCode;
      }
    }
    if (!room || room.gameState !== "playing") return;

    // 현재 발언자 본인만 변론을 조기 종료할 수 있음
    if (room.activeSpeakerSocketId !== socket.id) {
      console.log(`⚠️ [변론 조기종료 거부] 발언자 불일치: active=${room.activeSpeakerSocketId}, caller=${socket.id}`);
      return;
    }

    // 쿨다운 검사 (연타 방지)
    const now = Date.now();
    if (room.lastDefensePassTime && now - room.lastDefensePassTime < 1000) {
      return;
    }
    room.lastDefensePassTime = now;

    if (room.phase === "final-defense") {
      console.log(`⚖️ [최후변론 조기 종료] 발언자(${socket.id})가 변론을 완료했습니다.`);
      if (roomTimers[code]) clearTimeout(roomTimers[code]);
      startPostVoteFreeTalk(code, room.topVotedSocketIds || []);
    } else if (room.phase === "self-defense") {
      console.log(`🎤 [자기 변호 조기 종료] 발언자(${socket.id})가 변호를 완료했습니다.`);
      if (roomTimers[code]) clearTimeout(roomTimers[code]);
      room.selfDefenseIndex = (room.selfDefenseIndex || 0) + 1;
      startNextSelfDefense(code);
    }
  });

  // ------------------------------------------------------------------
  // 5-1c. 자유토론 100% 만장일치 조기 종료 투표 (toggle-skip-discussion)
  // ------------------------------------------------------------------
  socket.on("toggle-skip-discussion", () => {
    let code = socket.data.roomCode;
    let room = rooms[code];
    if (!room) {
      const foundCode = Object.keys(rooms).find((c) =>
        rooms[c].players.some((p) => p.socketId === socket.id)
      );
      if (foundCode) {
        room = rooms[foundCode];
        code = foundCode;
      }
    }
    if (!room || room.gameState !== "playing") return;

    const isFreeTalk = room.phase === "free-talk";
    const isPostVoteFreeTalk = room.phase === "post-vote-free-talk";
    if (!isFreeTalk && !isPostVoteFreeTalk) return;

    // 탈락자 제외 검사
    if (room.eliminatedSocketIds && room.eliminatedSocketIds.includes(socket.id)) return;

    // 투표 후 자유토론 시 최다 득표자(제외자)는 투표 불가
    if (isPostVoteFreeTalk && room.postVoteExcluded && room.postVoteExcluded.includes(socket.id)) return;

    if (!room.skipDiscussionVotes) room.skipDiscussionVotes = [];

    // 토글: 이미 눌렀으면 취소, 아니면 추가
    const existingIndex = room.skipDiscussionVotes.indexOf(socket.id);
    if (existingIndex > -1) {
      room.skipDiscussionVotes.splice(existingIndex, 1);
    } else {
      room.skipDiscussionVotes.push(socket.id);
    }

    // 유효 토론 참여자 총인원 계산
    const activePlayers = room.players.filter(p => !(room.eliminatedSocketIds || []).includes(p.socketId));
    let totalCount = activePlayers.length;
    if (isPostVoteFreeTalk && room.postVoteExcluded) {
      totalCount = activePlayers.filter(p => !room.postVoteExcluded.includes(p.socketId)).length;
    }
    totalCount = Math.max(1, totalCount);

    const skipCount = room.skipDiscussionVotes.length;
    const percent = Math.round((skipCount / totalCount) * 100);
    const isCompleted = skipCount >= totalCount; // 100% 전원 만장일치

    console.log(`⚡ [토론 조기종료 투표] 방: ${code}, phase: ${room.phase}, 동의: ${skipCount}/${totalCount} (${percent}%)`);

    io.to(code).emit("discussion-skip-updated", {
      skipCount,
      totalCount,
      percent,
      voterSocketIds: room.skipDiscussionVotes,
      isCompleted,
    });

    // 100% 만장일치 달성 시 즉시 다음 단계로 전환!
    if (isCompleted) {
      console.log(`🎉 [토론 조기종료 100% 만장일치 달성!] 즉시 다음 투표 단계로 전환합니다.`);
      if (roomTimers[code]) clearTimeout(roomTimers[code]);
      room.skipDiscussionVotes = [];

      if (isFreeTalk) {
        room.phase = "vote";
        io.to(code).emit("game-phase-changed", {
          phase: "vote",
          activeSpeakerSocketId: "",
          message: "🗳️ 전원 동의로 자유토론이 조기 종료되었습니다! 1차 라이어 지목 투표를 시작합니다! (8초)",
        });
      } else if (isPostVoteFreeTalk) {
        const excludedSocketIds = room.postVoteExcluded || [];
        if (excludedSocketIds.length === 1) {
          startFinalDecisionVote(code, excludedSocketIds[0]);
        } else {
          startReVote(code, excludedSocketIds);
        }
      }
    }
  });

  // ------------------------------------------------------------------
  // 5-2. 게임 진행 단계 전환 (set-phase)
  // ------------------------------------------------------------------
  socket.on("set-phase", ({ phase, payload }) => {
    const code = socket.data.roomCode;
    const room = rooms[code];
    if (!room || room.gameState !== "playing") return;

    room.phase = phase;
    if (phase === "hint-turn") {
      room.turnIndex = 0;
      room.activeSpeakerSocketId = room.players[0]?.socketId || "";
    } else if (phase === "free-talk") {
      room.activeSpeakerSocketId = ""; // 전원 채팅 해금
    }

    io.to(code).emit("game-phase-changed", {
      phase,
      turnIndex: room.turnIndex,
      activeSpeakerSocketId: room.activeSpeakerSocketId,
      payload,
    });
  });

  // ------------------------------------------------------------------
  // 5-3. 투표 수집 및 결과 집계 (submit-vote)
  // ------------------------------------------------------------------
  /**
   * 1차 투표 집계 및 다음 단계 진행 검사 헬퍼 함수
   */
  function checkAndProcessVoteResult(code) {
    const room = rooms[code];
    if (!room || room.phase !== "vote") return;

    const activePlayers = room.players.filter(p => !(room.eliminatedSocketIds || []).includes(p.socketId));
    const votedCount = Object.keys(room.votes || {}).length;

    // 실시간 투표 진행 현황 알림
    io.to(code).emit("vote-progress", {
      votedCount,
      totalCount: activePlayers.length,
    });

    // 전원 투표 완료 시 결과 집계 브로드캐스트
    if (votedCount >= activePlayers.length && activePlayers.length > 0) {
      const tally = {}; // targetSocketId -> count (득표 수 집계)
      const voteDetails = []; // [{ voterName, targetName }] (상세 표 목록)

      Object.entries(room.votes).forEach(([voterId, targetId]) => {
        const voter = room.players.find(p => p.socketId === voterId);
        const target = room.players.find(p => p.socketId === targetId);
        tally[targetId] = (tally[targetId] || 0) + 1;
        voteDetails.push({
          voterId,
          voterName: voter ? voter.name : "익명",
          voterIcon: voter ? voter.icon : "👤",
          targetId,
          targetName: target ? target.name : "익명",
          targetIcon: target ? target.icon : "🎯",
        });
      });

      // 투표 결과 소켓 전달 (누가 몇표, 누가 누구 찍었는지)
      io.to(code).emit("vote-result-tally", {
        tally,
        voteDetails,
        votes: room.votes,
      });

      // ─── 투표 결과 분석: 최다 득표자 / 동률 판별 ───
      const voteCounts = Object.values(tally);
      const maxVotes = voteCounts.length > 0 ? Math.max(...voteCounts) : 0;
      const topVotedIds = Object.keys(tally).filter(id => tally[id] === maxVotes);

      // 방에 투표 분석 결과 저장 (프론트에서 참조)
      room.topVotedSocketIds = topVotedIds;
      room.postVotePhase = topVotedIds.length === 1 ? "final-defense" : "self-defense";

      console.log(`📊 [투표 분석] 라운드: ${room.round || 1}, 최다: ${maxVotes}표, 대상: ${topVotedIds.length}명, 다음: ${room.postVotePhase}`);

      // 투표 데이터 초기화
      room.votes = {};

      // ── 2라운드(마지막 라운드)인 경우: 최후변론/재투표 없이 3초 후 즉시 결산 ──
      if (room.round === 2) {
        if (roomTimers[code]) clearTimeout(roomTimers[code]);
        roomTimers[code] = setTimeout(() => {
          if (!rooms[code]) return;
          if (topVotedIds.length === 1) {
            // 단일 최다 득표자 ➔ 5초간 '남길 말' 후 최종 정체 공개
            startRound2LastWordsAndReveal(code, topVotedIds[0]);
          } else {
            // 동률 발생 ➔ 재투표 없이 즉시 🎰 단죄 룰렛 ➔ 1명 선발 후 5초간 '남길 말' ➔ 최종 정체 공개
            triggerRound2Roulette(code, topVotedIds);
          }
        }, 3000);
        return;
      }

      // ── 1라운드인 경우: 3초 뒤 투표 결과 표를 본 후 최후변론/자기변호 플로우 시작 ──
      if (roomTimers[code]) clearTimeout(roomTimers[code]);
      roomTimers[code] = setTimeout(() => {
        if (!rooms[code]) return; // [방어 코드] 방이 이미 삭제된 경우 실행 중단
        startPostVoteFlow(code);
      }, 3000);
    }
  }

  socket.on("submit-vote", ({ targetSocketId }) => {
    const code = socket.data.roomCode;
    const room = rooms[code];
    if (!room) return;

    if (!room.votes) room.votes = {};
    room.votes[socket.id] = targetSocketId;

    checkAndProcessVoteResult(code);
  });

  // ------------------------------------------------------------------
  // 5-3a. [핵심 함수] 투표 후 자동 플로우 시작 (최후변론 or 자기변호)
  // ------------------------------------------------------------------
  /**
   * startPostVoteFlow(roomCode)
   * 투표 결과 분석 후 단일 최다 → 최후변론(7초), 동률 → 자기변호(7초씩) 플로우 시작
   */
  function startPostVoteFlow(code) {
    const room = rooms[code];
    if (!room) return;

    const topIds = room.topVotedSocketIds || [];
    if (topIds.length === 0) return;

    if (topIds.length === 1) {
      // ── CASE 1: 단일 최다 득표자 → 최후변론 (방장이 설정한 defenseTime 반영) ──
      const targetPlayer = room.players.find(p => p.socketId === topIds[0]);
      // 💡 [동적 변론시간 반영] 하드코딩 7초 대신 방 설정 defenseTime(기본 45초) 적용
      const defenseSec = getEffectiveSec(room, room.defenseTime || 45);
      console.log(`⚖️ [최후변론 시작] ${targetPlayer?.name || "참여자"}, ${defenseSec}초 (설정값: ${room.defenseTime}초)`);

      room.phase = "final-defense";
      room.activeSpeakerSocketId = topIds[0]; // 💡 현재 발언자 소켓 ID 명시 저장 (조기종료 판별용)
      io.to(code).emit("game-phase-changed", {
        phase: "final-defense",
        activeSpeakerSocketId: topIds[0],
        payload: {
          topVotedSocketIds: topIds,
          speakerName: targetPlayer?.name || "참여자",
          speakerIcon: targetPlayer?.icon || "🦊",
          timeSec: defenseSec,
        },
      });

      // 설정된 변론 시간(defenseSec) 후 → 자유토론(10초) 시작 (최다 득표자 제외)
      if (roomTimers[code]) clearTimeout(roomTimers[code]);
      roomTimers[code] = setTimeout(() => {
        if (!rooms[code]) return; // [방어 코드] 방이 이미 삭제된 경우 실행 중단
        startPostVoteFreeTalk(code, topIds);
      }, defenseSec * 1000);

    } else {
      // ── CASE 2: 공동 최다 득표자(동률) → 자기 변호 순서대로 진행 ──
      room.selfDefenseQueue = [...topIds]; // 자기변호 대기열
      room.selfDefenseIndex = 0;
      startNextSelfDefense(code);
    }
  }

  // ------------------------------------------------------------------
  // 5-3b. [핵심 함수] 자기 변호 순차 진행 (동률 시)
  // ------------------------------------------------------------------
  /**
   * startNextSelfDefense(roomCode)
   * 자기변호 대기열에서 다음 변호자를 꺼내 방 설정 defenseTime만큼 발언 부여
   */
  function startNextSelfDefense(code) {
    const room = rooms[code];
    if (!room) return;

    const queue = room.selfDefenseQueue || [];
    const idx = room.selfDefenseIndex || 0;

    if (idx >= queue.length) {
      // 모든 자기변호 완료 → 자유토론(10초) 시작 (동률자들 제외)
      startPostVoteFreeTalk(code, queue);
      return;
    }

    const speakerId = queue[idx];
    const speakerPlayer = room.players.find(p => p.socketId === speakerId);
    // 💡 [동적 변론시간 반영] 방 설정 defenseTime(기본 45초) 적용
    const defenseSec = getEffectiveSec(room, room.defenseTime || 45);
    console.log(`🎤 [자기 변호 ${idx + 1}/${queue.length}] ${speakerPlayer?.name || "참여자"}, ${defenseSec}초 (설정값: ${room.defenseTime}초)`);

    room.phase = "self-defense";
    room.activeSpeakerSocketId = speakerId; // 💡 현재 자기변호 발언자 소켓 ID 명시 저장
    io.to(code).emit("game-phase-changed", {
      phase: "self-defense",
      activeSpeakerSocketId: speakerId,
      payload: {
        topVotedSocketIds: queue,
        currentDefenseIndex: idx,
        totalDefenseCount: queue.length,
        speakerName: speakerPlayer?.name || "참여자",
        speakerIcon: speakerPlayer?.icon || "🦊",
        timeSec: defenseSec,
      },
    });

    // 설정된 변론 시간(defenseSec) 후 다음 자기변호 진행
    if (roomTimers[code]) clearTimeout(roomTimers[code]);
    roomTimers[code] = setTimeout(() => {
      if (!rooms[code]) return; // [방어 코드] 방이 이미 삭제된 경우 실행 중단
      room.selfDefenseIndex = idx + 1;
      startNextSelfDefense(code);
    }, defenseSec * 1000);
  }

  // ------------------------------------------------------------------
  // 5-3c. [핵심 함수] 투표 후 자유토론 (10초, 최다 득표자 제외)
  // ------------------------------------------------------------------
  /**
   * startPostVoteFreeTalk(roomCode, excludedSocketIds)
   * 최다 득표자(들)를 제외한 나머지에게 10초간 자유토론 부여
   */
  function startPostVoteFreeTalk(code, excludedSocketIds) {
    const room = rooms[code];
    if (!room) return;

    const excludedNames = excludedSocketIds.map(id => room.players.find(p => p.socketId === id)?.name || "참여자").join(", ");
    console.log(`💬 [투표 후 자유토론] 10초, 제외: ${excludedNames}`);

    room.phase = "post-vote-free-talk";
    room.activeSpeakerSocketId = ""; // 💡 발언자 초기화
    room.postVoteExcluded = excludedSocketIds; // 채팅 잠금 대상 저장
    room.skipDiscussionVotes = []; // 💡 투표 후 자유토론 조기종료 동의 목록 초기화
    io.to(code).emit("game-phase-changed", {
      phase: "post-vote-free-talk",
      activeSpeakerSocketId: "",
      discussionTime: 10,
      payload: {
        excludedSocketIds,
        excludedNames,
        timeSec: 10,
      },
    });

    // 10초 후 → 최종 결정 투표 or 재투표 시작
    if (roomTimers[code]) clearTimeout(roomTimers[code]);
    roomTimers[code] = setTimeout(() => {
      if (!rooms[code]) return; // [방어 코드] 방이 이미 삭제된 경우 실행 중단
      if (excludedSocketIds.length === 1) {
        // 단일 최다 득표자 → 유죄/무죄 최종 결정 투표
        startFinalDecisionVote(code, excludedSocketIds[0]);
      } else {
        // 공동 최다 득표자 → 재투표
        startReVote(code, excludedSocketIds);
      }
    }, 10000);
  }

  // ------------------------------------------------------------------
  // 5-3d. [핵심 함수] 최종 결정 투표 시작 (유죄/무죄, 80% 기준)
  // ------------------------------------------------------------------
  /**
   * startFinalDecisionVote(roomCode, targetSocketId)
   * 최다 득표자 1명에 대해 유죄/무죄 투표. 80% 이상 무죄 시에만 구제.
   */
  function startFinalDecisionVote(code, targetSocketId) {
    const room = rooms[code];
    if (!room) return;

    const targetPlayer = room.players.find(p => p.socketId === targetSocketId);
    console.log(`🗳️ [최종 결정 투표] 대상: ${targetPlayer?.name}, 80% 무죄 시 구제`);

    room.phase = "final-decision";
    room.finalDecisionTarget = targetSocketId;
    room.finalDecisionVotes = {}; // { socketId: "guilty" | "innocent" }

    io.to(code).emit("game-phase-changed", {
      phase: "final-decision",
      activeSpeakerSocketId: "",
      payload: {
        targetSocketId,
        targetName: targetPlayer?.name || "참여자",
        targetIcon: targetPlayer?.icon || "🦊",
      },
    });
  }

  // ------------------------------------------------------------------
  // 5-3e. 최종 결정 투표 제출 (submit-final-decision)
  // ------------------------------------------------------------------
  function checkAndProcessFinalDecisionResult(code) {
    const room = rooms[code];
    if (!room || room.phase !== "final-decision") return;

    // 투표 가능 인원 = 활성 플레이어 중 최다 득표자 제외
    const activePlayers = room.players.filter(p =>
      !(room.eliminatedSocketIds || []).includes(p.socketId) &&
      p.socketId !== room.finalDecisionTarget
    );
    const votedCount = Object.keys(room.finalDecisionVotes || {}).length;

    // 실시간 투표 진행 현황 알림
    io.to(code).emit("vote-progress", {
      votedCount,
      totalCount: activePlayers.length,
    });

    // 전원 투표 완료 시 80% 판정
    if (votedCount >= activePlayers.length && activePlayers.length > 0) {
      const totalVoters = activePlayers.length;
      const innocentCount = Object.values(room.finalDecisionVotes).filter(v => v === "innocent").length;
      const innocentPercent = totalVoters > 0 ? (innocentCount / totalVoters) * 100 : 0;
      const isInnocent = innocentPercent >= 80; // 80% 이상 무죄 시 구제

      const targetPlayer = room.players.find(p => p.socketId === room.finalDecisionTarget);
      console.log(`⚖️ [최종 결정 결과] ${targetPlayer?.name}: 무죄 ${innocentPercent.toFixed(0)}% (${innocentCount}/${totalVoters}), 판정: ${isInnocent ? "구제(2라운드)" : "유죄 확정"}`);

      // 결과에 따라 이벤트 분기
      if (isInnocent) {
        const displaySec = getEffectiveSec(room, 5);
        // ── 80% 이상 무죄: 무죄 구제 전면 블러 안내 팝업 단독 전송 ──
        io.to(code).emit("innocent-cleared-notice", {
          targetSocketId: room.finalDecisionTarget,
          targetName: targetPlayer?.name || "참여자",
          targetIcon: targetPlayer?.icon || "🦊",
          innocentPercent,
          displayTimeSec: displaySec,
        });

        if (roomTimers[code]) clearTimeout(roomTimers[code]);
        roomTimers[code] = setTimeout(() => {
          if (!rooms[code]) return; // [방어 코드] 방이 이미 삭제된 경우 실행 중단
          startRound2(code);
        }, displaySec * 1000);
      } else {
        // ── 유죄 확정: 일반 유죄 결산 모달 전송 후 4초 뒤 라이어 정체 공개 ──
        io.to(code).emit("final-decision-result", {
          targetSocketId: room.finalDecisionTarget,
          targetName: targetPlayer?.name || "참여자",
          targetIcon: targetPlayer?.icon || "🦊",
          innocentCount,
          guiltyCount: totalVoters - innocentCount,
          totalVoters,
          innocentPercent,
          isInnocent: false,
          isLiar: room.liarSocketIds.includes(room.finalDecisionTarget),
        });

        if (roomTimers[code]) clearTimeout(roomTimers[code]);
        roomTimers[code] = setTimeout(() => {
          if (!rooms[code]) return; // [방어 코드] 방이 이미 삭제된 경우 실행 중단
          revealLiarResult(code, room.finalDecisionTarget);
        }, 4000);
      }

      // 투표 데이터 초기화
      room.finalDecisionVotes = {};
    }
  }

  socket.on("submit-final-decision", ({ decision }) => {
    const code = socket.data.roomCode;
    const room = rooms[code];
    if (!room || room.phase !== "final-decision") return;

    if (!room.finalDecisionVotes) room.finalDecisionVotes = {};
    room.finalDecisionVotes[socket.id] = decision; // "guilty" 또는 "innocent"

    checkAndProcessFinalDecisionResult(code);
  });

  // ------------------------------------------------------------------
  // 5-3e-1. [핵심 함수] 2라운드 단일 최다 득표자 '남길 말(5초)' 후 정체 공개
  // ------------------------------------------------------------------
  function startRound2LastWordsAndReveal(code, targetSocketId) {
    const room = rooms[code];
    if (!room) return;

    const targetPlayer = room.players.find(p => p.socketId === targetSocketId);
    console.log(`💬 [2라운드 남길 말] 대상: ${targetPlayer?.name}, 5초 후 최종 정체 공개`);

    room.phase = "last-words";
    io.to(code).emit("game-phase-changed", {
      phase: "last-words",
      activeSpeakerSocketId: targetSocketId,
      payload: {
        speakerSocketId: targetSocketId,
        speakerName: targetPlayer?.name || "참여자",
        speakerIcon: targetPlayer?.icon || "🦊",
        timeSec: 5,
      },
    });

    // 5초간 남길 말 발표 후 최종 라이어 공개 & 승패 결산!
    if (roomTimers[code]) clearTimeout(roomTimers[code]);
    roomTimers[code] = setTimeout(() => {
      if (!rooms[code]) return;
      revealLiarResult(code, targetSocketId);
    }, 5000);
  }

  // ------------------------------------------------------------------
  // 5-3e-2. [핵심 함수] 2라운드 동률 시 🎰 단죄 룰렛 ➔ '남길 말(5초)' ➔ 정체 공개
  // ------------------------------------------------------------------
  function triggerRound2Roulette(code, tiedSocketIds) {
    const room = rooms[code];
    if (!room) return;

    const chosenIndex = Math.floor(Math.random() * tiedSocketIds.length);
    const chosenSocketId = tiedSocketIds[chosenIndex];
    const chosenPlayer = room.players.find(p => p.socketId === chosenSocketId);

    console.log(`🎰 [2라운드 동률 단죄 룰렛] 추첨 대상: ${chosenPlayer?.name}`);

    room.phase = "roulette";
    io.to(code).emit("roulette-result", {
      candidateSocketIds: tiedSocketIds,
      chosenSocketId,
      chosenPlayer,
      rouletteType: "condemn",
    });

    // 4초간 룰렛 회전 연출 후 ➔ 5초간 '남길 말' ➔ 정체 공개!
    if (roomTimers[code]) clearTimeout(roomTimers[code]);
    roomTimers[code] = setTimeout(() => {
      if (!rooms[code]) return;
      startRound2LastWordsAndReveal(code, chosenSocketId);
    }, 4000);
  }

  // ------------------------------------------------------------------
  // 5-3f. [핵심 함수] 재투표 시작 (동률 해소용)
  // ------------------------------------------------------------------
  /**
   * startReVote(roomCode, candidateSocketIds)
   * 공동 최다 득표자들 중 1명을 재투표로 선택
   */
  function startReVote(code, candidateSocketIds) {
    const room = rooms[code];
    if (!room) return;

    const candidateNames = candidateSocketIds.map(id => room.players.find(p => p.socketId === id)?.name || "참여자").join(", ");
    console.log(`🗳️ [재투표 시작] 후보: ${candidateNames}`);

    room.phase = "re-vote";
    room.reVoteCandidates = candidateSocketIds;
    room.reVotes = {};

    io.to(code).emit("game-phase-changed", {
      phase: "re-vote",
      activeSpeakerSocketId: "",
      payload: {
        candidateSocketIds,
        candidateNames,
      },
    });
  }

  // ------------------------------------------------------------------
  // 5-3g. 재투표 제출 (submit-re-vote)
  // ------------------------------------------------------------------
  function checkAndProcessReVoteResult(code) {
    const room = rooms[code];
    if (!room || room.phase !== "re-vote") return;

    // 투표 가능 인원 = 활성 플레이어 중 공동 최다 득표자들 제외
    const candidates = room.reVoteCandidates || [];
    const activePlayers = room.players.filter(p =>
      !(room.eliminatedSocketIds || []).includes(p.socketId) &&
      !candidates.includes(p.socketId)
    );
    const votedCount = Object.keys(room.reVotes || {}).length;

    // 실시간 투표 진행 현황 알림
    io.to(code).emit("vote-progress", {
      votedCount,
      totalCount: activePlayers.length,
    });

    // 전원 투표 완료 시 결과 분석
    if (votedCount >= activePlayers.length && activePlayers.length > 0) {
      const tally = {};
      Object.values(room.reVotes).forEach(targetId => {
        tally[targetId] = (tally[targetId] || 0) + 1;
      });

      const maxVotes = Math.max(...Object.values(tally));
      const topIds = Object.keys(tally).filter(id => tally[id] === maxVotes);

      // 재투표 결과 전달
      const voteDetails = Object.entries(room.reVotes).map(([voterId, targetId]) => {
        const voter = room.players.find(p => p.socketId === voterId);
        const target = room.players.find(p => p.socketId === targetId);
        return {
          voterId,
          voterName: voter?.name || "익명",
          targetId,
          targetName: target?.name || "익명",
        };
      });

      io.to(code).emit("re-vote-result", {
        tally,
        voteDetails,
        topVotedSocketIds: topIds,
        isTied: topIds.length > 1,
      });

      console.log(`📊 [재투표 결과] 최다: ${maxVotes}표, 대상: ${topIds.length}명, 동률: ${topIds.length > 1}`);

      // 투표 데이터 초기화
      room.reVotes = {};

      if (topIds.length === 1) {
        // ── 재투표에서 단일 최다 → 최후변론 플로우로 진입 ──
        room.topVotedSocketIds = topIds;
        if (roomTimers[code]) clearTimeout(roomTimers[code]);
        roomTimers[code] = setTimeout(() => {
          if (!rooms[code]) return; // [방어 코드] 방이 이미 삭제된 경우 실행 중단
          startPostVoteFlow(code);
        }, 3000);
      } else {
        // ── 재투표에서도 동률 → 단죄 룰렛 가동 ──
        if (roomTimers[code]) clearTimeout(roomTimers[code]);
        roomTimers[code] = setTimeout(() => {
          if (!rooms[code]) return; // [방어 코드] 방이 이미 삭제된 경우 실행 중단
          triggerReVoteRoulette(code, topIds);
        }, 3000);
      }
    }
  }

  socket.on("submit-re-vote", ({ targetSocketId }) => {
    const code = socket.data.roomCode;
    const room = rooms[code];
    if (!room || room.phase !== "re-vote") return;

    if (!room.reVotes) room.reVotes = {};
    room.reVotes[socket.id] = targetSocketId;

    checkAndProcessReVoteResult(code);
  });

  // ------------------------------------------------------------------
  // 5-3h. [핵심 함수] 재투표 동률 시 단죄 룰렛
  // ------------------------------------------------------------------
  /**
   * triggerReVoteRoulette(roomCode, tiedSocketIds)
   * 동률자 중 1명을 룰렛으로 무작위 선정 → 최후변론 플로우로 이행
   */
  function triggerReVoteRoulette(code, tiedSocketIds) {
    const room = rooms[code];
    if (!room) return;

    const chosenIndex = Math.floor(Math.random() * tiedSocketIds.length);
    const chosenSocketId = tiedSocketIds[chosenIndex];
    const chosenPlayer = room.players.find(p => p.socketId === chosenSocketId);

    console.log(`🎰 [재투표 단죄 룰렛] 선정: ${chosenPlayer?.name}`);

    room.phase = "roulette";
    io.to(code).emit("roulette-result", {
      candidateSocketIds: tiedSocketIds,
      chosenSocketId,
      chosenPlayer,
      rouletteType: "condemn",
    });

    // 4초간 룰렛 연출 후 → 최후변론 플로우 시작
    room.topVotedSocketIds = [chosenSocketId];
    if (roomTimers[code]) clearTimeout(roomTimers[code]);
    roomTimers[code] = setTimeout(() => {
      if (!rooms[code]) return; // [방어 코드] 방이 이미 삭제된 경우 실행 중단
      startPostVoteFlow(code);
    }, 4000);
  }

  // ------------------------------------------------------------------
  // 5-3i. [핵심 함수] 2라운드 시작 (기존 v6 룰: 힌트 각 6초, 기권 가능)
  // ------------------------------------------------------------------
  /**
   * startRound2(roomCode)
   * 80% 무죄 판정 시 2라운드 진입. 힌트 각 6초, 기권 가능.
   */
  function startRound2(code) {
    const room = rooms[code];
    if (!room) return;

    room.round = 2;
    room.turnIndex = 0;
    room.turnCount = 0;
    room.activeSpeakerSocketId = room.players[0]?.socketId || "";
    room.phase = "hint-turn";

    console.log(`🔄 [2라운드 시작] 방: ${code}, 힌트 각 6초, 기권 가능`);

    io.to(code).emit("game-phase-changed", {
      phase: "hint-turn",
      activeSpeakerSocketId: room.activeSpeakerSocketId,
      payload: {
        round: 2,
        hintTime: 6,
        message: "🔄 2라운드가 시작됩니다! 힌트를 각 6초간 발표해 주세요.",
      },
    });
  }

  // ------------------------------------------------------------------
  // 5-3j. [핵심 함수] 라이어 정체 공개 및 결과 (유죄 확정 시)
  // ------------------------------------------------------------------
  /**
   * revealLiarResult(roomCode, targetSocketId)
   * 유죄 확정된 플레이어가 실제 라이어인지 공개
   */
  function revealLiarResult(code, targetSocketId) {
    const room = rooms[code];
    if (!room) return;

    const targetPlayer = room.players.find((p) => p.socketId === targetSocketId);
    const isActualLiar = room.liarSocketIds.includes(targetSocketId);
    const gameMode = room.gameMode || "fool";
    const realWord = room.currentWordInfo?.word || "";
    const liarWord = room.currentWordInfo?.foolWord || "🚨 라이어";

    // 참가자별 실제 승패 누적 카운트업
    room.players.forEach(p => {
      if (!p.stats) {
        p.stats = { citizenWin: 0, liarWin: 0, citizenLoss: 0, liarLoss: 0 };
      }
      const isLiarPlayer = room.liarSocketIds.includes(p.socketId);
      
      if (isActualLiar) {
        // 시민 팀 승리!
        if (isLiarPlayer) {
          p.stats.liarLoss += 1;
        } else {
          p.stats.citizenWin += 1;
        }
      } else {
        // 라이어 팀 승리!
        if (isLiarPlayer) {
          p.stats.liarWin += 1;
        } else {
          p.stats.citizenLoss += 1;
        }
      }
    });

    console.log(`🎭 [결과 공개 & 전적 누적 완료] ${targetPlayer?.name}: ${isActualLiar ? "라이어 맞음! 시민 승리!" : "라이어 아님! 라이어 승리!"}`);

    room.phase = "result";
    room.gameState = "waiting"; // 게임 종료

    io.to(code).emit("game-phase-changed", {
      phase: "result",
      activeSpeakerSocketId: "",
      payload: {
        targetSocketId,
        targetName: targetPlayer?.name || "참여자",
        targetIcon: targetPlayer?.icon || "🦊",
        isActualLiar,
        liarSocketIds: room.liarSocketIds,
        liarNames: room.liarSocketIds.map(id => room.players.find(p => p.socketId === id)?.name || "참여자"),
        citizenWin: isActualLiar,
        gameMode,
        realWord,
        liarWord,
        resultMessage: isActualLiar
          ? `🏆 시민 팀 승리! [${targetPlayer?.name}]은(는) 라이어였습니다!`
          : `😈 라이어 승리! [${targetPlayer?.name}]은(는) 라이어가 아니었습니다!`,
      },
    });

    // 갱신된 전적 포함 방 상태 실시간 브로드캐스트
    io.to(code).emit("room-updated", {
      room: {
        roomCode: room.roomCode,
        roomTitle: room.roomTitle,
        maxPlayers: room.maxPlayers,
        liarCount: room.liarCount,
        hintTime: room.hintTime,
        discussionTime: room.discussionTime,
        fastTestMode: room.fastTestMode,
        selectedCategory: room.selectedCategory,
        playerHints: room.playerHints,
        players: room.players,
      },
      categories: getCategories(),
    });
  }

  // ------------------------------------------------------------------
  // 5-3k. 실시간 과일/아이템 투척 처리 (throw-item)
  // ------------------------------------------------------------------
  socket.on("throw-item", ({ targetId, itemType, roomCode }) => {
    const code = (roomCode || socket.data.roomCode || "").toUpperCase().trim();
    let room = rooms[code];

    if (!room) {
      const foundCode = Object.keys(rooms).find((c) => rooms[c].players.some((p) => p.socketId === socket.id));
      if (foundCode) room = rooms[foundCode];
    }

    if (!room) return;

    const sender = room.players.find((p) => p.socketId === socket.id || p.name === socket.data.nickname);
    const target = room.players.find((p) => p.socketId === targetId || p.name === targetId);

    if (!sender || !target) {
      console.log(`⚠️ [아이템 투척 대상 미발견] sender: ${sender?.name}, targetId: ${targetId}`);
      return;
    }

    // 인당 아이템 재고 수량 확인
    if (!sender.inventory) {
      sender.inventory = { tomato: 2, egg: 2, water: 2, banana: 2 };
    }

    if ((sender.inventory[itemType] || 0) <= 0) {
      return socket.emit("room-error", { message: "해당 아이템을 모두 소진하였습니다! (매 판당 각 2개 제공)" });
    }

    // 아이템 수량 1 차감
    sender.inventory[itemType] -= 1;

    // 대상 유저에게 지속 오염 자국(Stain) 추가
    if (!target.stains) target.stains = [];
    target.stains.push({ type: itemType, timestamp: Date.now() });

    console.log(`🍎 [아이템 투척] 방: ${code}, ${sender.name} ➔ ${target.name}에게 ${itemType} 투척 (남은수량: ${sender.inventory[itemType]})`);

    // 방 참가자 전원에게 3D 궤적 날아감 & 충돌 스플래시 브로드캐스트
    io.to(code).emit("item-thrown", {
      senderId: socket.id || sender.socketId,
      senderName: sender.name,
      senderIcon: sender.icon,
      targetId: target.socketId || target.name,
      targetName: target.name,
      itemType,
      senderInventory: sender.inventory,
      targetStains: target.stains,
    });
  });

  // ------------------------------------------------------------------
  // 5-4. 룰렛 랜덤 추첨 (trigger-roulette)
  // ------------------------------------------------------------------
  socket.on("trigger-roulette", ({ candidateSocketIds, rouletteType }) => {
    const code = socket.data.roomCode;
    const room = rooms[code];
    if (!room || !candidateSocketIds || candidateSocketIds.length === 0) return;

    // 무작위 선택
    const chosenIndex = Math.floor(Math.random() * candidateSocketIds.length);
    const chosenSocketId = candidateSocketIds[chosenIndex];
    const chosenPlayer = room.players.find(p => p.socketId === chosenSocketId);

    console.log(`🎰 [룰렛 실행] 타입: ${rouletteType}, 지목/사면자: ${chosenPlayer?.name}`);

    io.to(code).emit("roulette-result", {
      candidateSocketIds,
      chosenSocketId,
      chosenPlayer,
      rouletteType, // "survival" | "amnesty" | "condemn"
    });
  });

  // ------------------------------------------------------------------
  // 5-5. 플레이어 흑백 탈락 처리 (eliminate-player)
  // ------------------------------------------------------------------
  socket.on("eliminate-player", ({ socketId }) => {
    const code = socket.data.roomCode;
    const room = rooms[code];
    if (!room) return;

    if (!room.eliminatedSocketIds.includes(socketId)) {
      room.eliminatedSocketIds.push(socketId);
    }

    io.to(code).emit("player-eliminated", {
      eliminatedSocketId: socketId,
      eliminatedSocketIds: room.eliminatedSocketIds,
    });
  });

  // ------------------------------------------------------------------
  // 6. 접속 종료 처리 (disconnect)
  // ------------------------------------------------------------------
  socket.on("disconnect", () => {
    const code = socket.data.roomCode;
    if (!code || !rooms[code]) return;

    const room = rooms[code];
    const leavingPlayer = room.players.find((p) => p.socketId === socket.id);
    if (!leavingPlayer) return;

    console.log(`🔴 [접속 종료 감지] 방: ${code}, 퇴장자: ${leavingPlayer.name} (${leavingPlayer.isHost ? "👑 방장" : "참여자"}), 상태: ${room.gameState}`);

    // ─────────────────────────────────────────────────────────────
    // 1) 방장이 이탈한 경우 ➔ 방 폭파 및 게임 종료 (캐릭터 선택창 이동)
    // ─────────────────────────────────────────────────────────────
    if (leavingPlayer.isHost) {
      console.log(`🚨 [방장 이탈] 방 ${code} 폭파 및 전체 게임 종료`);

      // 진행 중인 모든 타이머 해제
      if (roomTimers[code]) {
        clearTimeout(roomTimers[code]);
        delete roomTimers[code];
      }

      // 남은 모든 방원에게 방장 이탈 알림 브로드캐스트
      io.to(code).emit("host-left-game", {
        message: "방장이 이탈하여 게임이 종료됩니다.",
      });

      // 방 메모리 데이터 완전 삭제
      delete rooms[code];
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // 2) 일반 플레이어가 이탈한 경우 ➔ 즉시 방에서 영구 제거
    // ─────────────────────────────────────────────────────────────
    room.players = room.players.filter((p) => p.socketId !== socket.id);

    // 방에 아무도 없으면 방 삭제
    if (room.players.length === 0) {
      if (roomTimers[code]) {
        clearTimeout(roomTimers[code]);
        delete roomTimers[code];
      }
      delete rooms[code];
      console.log(`🗑️ [방 삭제 - 인원 0명] 코드: ${code}`);
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // 3) 게임 진행 중(playing) 이탈 처리
    // ─────────────────────────────────────────────────────────────
    if (room.gameState === "playing") {
      // [CASE 3-A] 남은 인원이 '2명 이하'로 줄어든 경우 ➔ 게임 중단 및 대기실 복귀
      if (room.players.length <= 2) {
        console.log(`⚠️ [인원 부족 (2명 이하)] 방: ${code}, 남은 인원: ${room.players.length}명 ➔ 대기실 복귀`);

        // 모든 진행 타이머 클리어
        if (roomTimers[code]) {
          clearTimeout(roomTimers[code]);
          delete roomTimers[code];
        }

        // 방 상태를 대기실 모드로 리셋
        room.gameState = "waiting";
        room.phase = "waiting";
        room.votes = {};
        room.finalDecisionVotes = {};
        room.reVotes = {};

        // 모든 방원에게 인원 부족 안내 브로드캐스트
        io.to(code).emit("not-enough-players", {
          message: "인원이 2명 이하로 줄어들어 게임이 종료되어 대기실로 이동합니다.",
          remainingCount: room.players.length,
        });

        // 갱신된 방 정보 전송
        io.to(code).emit("room-updated", { room, categories: getCategories() });
        return;
      }

      // [CASE 3-B] 남은 인원이 3명 이상인 경우 ➔ 알림 전송 후 지체 없이 계속 진행
      console.log(`👤 [게임 중 일반 플레이어 퇴장] 방: ${code}, ${leavingPlayer.name} 퇴장, 남은 인원: ${room.players.length}명`);

      // 전원에게 이탈 알림 브로드캐스트
      io.to(code).emit("player-left", {
        leftPlayerName: leavingPlayer.name,
        leftPlayerIcon: leavingPlayer.icon,
        remainingCount: room.players.length,
      });

      // 진행 중인 페이즈별 즉시 보정 처리
      if (room.phase === "hint-turn") {
        // 발언 중이던 유저가 나간 경우 다음 사람으로 즉각 턴 전환
        if (room.activeSpeakerSocketId === socket.id) {
          room.turnIndex = room.turnIndex % room.players.length;
          room.activeSpeakerSocketId = room.players[room.turnIndex]?.socketId || "";

          console.log(`🔄 [발언자 퇴장으로 턴 전환] 다음 발언자: ${room.players[room.turnIndex]?.name}`);

          io.to(code).emit("turn-changed", {
            turnIndex: room.turnIndex,
            activeSpeakerSocketId: room.activeSpeakerSocketId,
            activeSpeakerName: room.players[room.turnIndex]?.name,
            hintTime: getEffectiveSec(room, room.hintTime || 20),
          });
        }
      } else if (room.phase === "vote") {
        // 투표 단계에서 이탈 시 기투표 제거 및 남은 인원 기준 즉시 재계산/마감
        if (room.votes) {
          delete room.votes[socket.id];
        }
        checkAndProcessVoteResult(code);
      } else if (room.phase === "final-decision") {
        // 최종 결정 투표 단계에서 이탈 시
        if (room.finalDecisionTarget === socket.id) {
          // 최다 득표 대상자가 나간 경우 ➔ 즉시 2라운드로 넘김
          console.log(`⚖️ [최종결정 대상자 이탈] 2라운드로 즉시 전환`);
          if (roomTimers[code]) clearTimeout(roomTimers[code]);
          startRound2(code);
        } else {
          if (room.finalDecisionVotes) {
            delete room.finalDecisionVotes[socket.id];
          }
          checkAndProcessFinalDecisionResult(code);
        }
      } else if (room.phase === "re-vote") {
        // 재투표 단계에서 이탈 시
        if (room.reVotes) {
          delete room.reVotes[socket.id];
        }
        checkAndProcessReVoteResult(code);
      } else if (room.phase === "final-defense" || room.phase === "self-defense") {
        // 최후변론 또는 자기변호 중이던 유저가 나간 경우 다음 변호/자유토론으로 진행
        if (room.phase === "final-defense") {
          if (roomTimers[code]) clearTimeout(roomTimers[code]);
          startPostVoteFreeTalk(code, room.topVotedSocketIds || []);
        } else if (room.phase === "self-defense") {
          if (room.selfDefenseQueue) {
            room.selfDefenseQueue = room.selfDefenseQueue.filter(id => id !== socket.id);
          }
          if (roomTimers[code]) clearTimeout(roomTimers[code]);
          startNextSelfDefense(code);
        }
      } else if (room.phase === "free-talk" || room.phase === "post-vote-free-talk") {
        // 💡 자유토론 중 플레이어 이탈 시 조기종료 투표 목록 재계산
        if (room.skipDiscussionVotes) {
          room.skipDiscussionVotes = room.skipDiscussionVotes.filter(id => id !== socket.id);
          const isPostVote = room.phase === "post-vote-free-talk";
          const activePlayers = room.players.filter(p => !(room.eliminatedSocketIds || []).includes(p.socketId));
          let totalCount = activePlayers.length;
          if (isPostVote && room.postVoteExcluded) {
            totalCount = activePlayers.filter(p => !room.postVoteExcluded.includes(p.socketId)).length;
          }
          totalCount = Math.max(1, totalCount);
          const skipCount = room.skipDiscussionVotes.length;
          const percent = Math.round((skipCount / totalCount) * 100);
          const isCompleted = skipCount >= totalCount; // 100% 만장일치

          io.to(code).emit("discussion-skip-updated", {
            skipCount,
            totalCount,
            percent,
            voterSocketIds: room.skipDiscussionVotes,
            isCompleted,
          });

          if (isCompleted) {
            console.log(`🎉 [이탈 후 100% 만장일치 충족] 즉시 다음 투표 단계로 전환`);
            if (roomTimers[code]) clearTimeout(roomTimers[code]);
            room.skipDiscussionVotes = [];

            if (!isPostVote) {
              room.phase = "vote";
              io.to(code).emit("game-phase-changed", {
                phase: "vote",
                activeSpeakerSocketId: "",
                message: "🗳️ 전원 동의로 자유토론이 조기 종료되었습니다! 1차 라이어 지목 투표를 시작합니다! (8초)",
              });
            } else {
              const excludedSocketIds = room.postVoteExcluded || [];
              if (excludedSocketIds.length === 1) {
                startFinalDecisionVote(code, excludedSocketIds[0]);
              } else {
                startReVote(code, excludedSocketIds);
              }
            }
          }
        }
      }

      io.to(code).emit("room-updated", { room, categories: getCategories() });
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // 4) 대기실(waiting) 상태에서 이탈 처리
    // ─────────────────────────────────────────────────────────────
    console.log(`👤 [대기실 플레이어 퇴장] 방: ${code}, ${leavingPlayer.name}, 남은 인원: ${room.players.length}명`);

    io.to(code).emit("player-left", {
      leftPlayerName: leavingPlayer.name,
      leftPlayerIcon: leavingPlayer.icon,
      remainingCount: room.players.length,
    });

    io.to(code).emit("room-updated", { room, categories: getCategories() });
  });
});

// 백엔드 포트 4000번 오픈
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`🚀 [라이어 게임 소켓 백엔드 서버] http://localhost:${PORT} 에서 실행 중!`);
});
