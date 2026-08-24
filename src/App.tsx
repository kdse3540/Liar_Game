import { useState, useRef, useEffect, type CSSProperties } from "react";
import { Avatar, Button, ChatBubbles } from "./components/AstraUI";
import { VisualInspector } from "./components/VisualInspector";
import { socket } from "./services/socket";
import { generateRandomNickname } from "./utils/nickname";

/**
 * ====================================================================
 * [라이어 게임 (Liar Game) 메인 앱 컴포넌트]
 * --------------------------------------------------------------------
 * 이 파일은 피그마에서 설계한 UI를 바탕으로 구성된 메인 화면입니다.
 * 백엔드 소켓(Socket.io)과 실시간 연동되어 여러 명의 플레이어가
 * 동시 접속하여 방 만들기, 채팅, 제시어 전달 및 라이어 게임을 함께 플레이할 수 있습니다.
 * ====================================================================
 */

// --------------------------------------------------------------------
// 1. 타입 정의 (Type Definitions)
// --------------------------------------------------------------------
type Screen = "home" | "character" | "room" | "play";

// --------------------------------------------------------------------
// 2. 초기 데이터 (Mock Data)
// --------------------------------------------------------------------
// [캐릭터 포트레이트 목록]
// 'Portrait' 폴더에 저장된 14개의 고유 캐릭터 일러스트 이미지 경로 목록입니다.
const portraits = [
  "/portraits/Portrait_01.png",
  "/portraits/Portrait_02.png",
  "/portraits/Portrait_03.png",
  "/portraits/Portrait_04.png",
  "/portraits/Portrait_05.png",
  "/portraits/Portrait_06.png",
  "/portraits/Portrait_07.png",
  "/portraits/Portrait_08.png",
  "/portraits/Portrait_09.png",
  "/portraits/Portrait_10.png",
  "/portraits/Portrait_11.png",
  "/portraits/Portrait_12.png",
  "/portraits/Portrait_13.png",
  "/portraits/Portrait_14.png",
];

// 기본 6명 디폴트 플레이어 (초기 로딩 및 싱글 테스트용 데이터)
const defaultPlayers = [
  { name: "모카", icon: "/portraits/Portrait_01.png", ready: true, color: "#ff6f3c", softColor: "#ffe3d1" },
  { name: "밤비", icon: "/portraits/Portrait_02.png", ready: true, color: "#4a8eff", softColor: "#dbeaff" },
  { name: "구름", icon: "/portraits/Portrait_03.png", ready: false, color: "#f5b300", softColor: "#fff2c4" },
  { name: "해나", icon: "/portraits/Portrait_04.png", ready: true, color: "#9b51e0", softColor: "#eedfff" },
  { name: "나", icon: "/portraits/Portrait_05.png", ready: true, color: "#10b981", softColor: "#cbf7e6" },
  { name: "단추", icon: "/portraits/Portrait_06.png", ready: true, color: "#ff4785", softColor: "#ffdbe8" },
];

/**
 * [플레이어 아이콘/포트레이트 렌더링 헬퍼 컴포넌트]
 * - 이미지 경로(예: /portraits/Portrait_01.png)인 경우 <img> 태그로 깔끔하게 렌더링합니다.
 * - 이모지 또는 문자열인 경우 기존처럼 텍스트 형태로 안전하게 표시합니다.
 */
function PlayerIcon({
  icon,
  size = "1em",
  alt = "캐릭터 포트레이트",
  className = "",
  style,
}: {
  icon?: string;
  size?: number | string;
  alt?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const isImage =
    typeof icon === "string" &&
    (icon.startsWith("/") || icon.startsWith("http") || icon.startsWith("data:"));

  const sizeVal = typeof size === "number" ? `${size}px` : size;

  if (isImage) {
    return (
      <img
        src={icon}
        alt={alt}
        className={`player-icon-img ${className}`}
        style={{
          width: sizeVal,
          height: sizeVal,
          objectFit: "cover",
          borderRadius: "inherit",
          display: "inline-block",
          verticalAlign: "middle",
          ...style,
        }}
      />
    );
  }

  return (
    <span
      className={className}
      style={{
        fontSize: sizeVal,
        display: "inline-block",
        verticalAlign: "middle",
        ...style,
      }}
    >
      {icon || "🦊"}
    </span>
  );
}

// 플레이어 시민/라이어 실시간 전적(승패) 및 대표 업적 칭호 산출 헬퍼 함수
function getPlayerRecord(player: any) {
  const citizenWin = player?.stats?.citizenWin ?? 0;
  const liarWin = player?.stats?.liarWin ?? 0;
  const citizenLoss = player?.stats?.citizenLoss ?? 0;
  const liarLoss = player?.stats?.liarLoss ?? 0;
  
  const totalGames = citizenWin + liarWin + citizenLoss + liarLoss;
  const totalWins = citizenWin + liarWin;
  const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;
  
  // 전적 기반 업적 칭호 배정
  let title = "🐣 풋풋한 입문 플레이어";
  if (totalGames === 0) title = "🌱 첫 승리 도전 중!";
  else if (winRate >= 75) title = "👑 연기파 최고 존엄";
  else if (liarWin >= 5) title = "🦊 전설의 뻔뻔 라이어";
  else if (citizenWin >= 8) title = "🔍 Sharpshooter 명탐정";
  else if (winRate >= 50) title = "⚖️ 냉철한 승부사";
  else title = "🐣 풋풋한 탐정 지망생";

  return {
    citizenWin,
    liarWin,
    citizenLoss,
    liarLoss,
    totalGames,
    totalWins,
    winRate,
    title,
  };
}

// 6자리 무작위 방 코드 생성 헬퍼 함수 (예: R8K3MX)
function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function Logo() {
  return <div className="logo" aria-label="라이어 게임"><span>LIAR</span><b>GAME</b><i>!</i></div>;
}

function PlayerChip({
  player,
  compact = false,
  displayName,
  displayIcon,
  speech,
  isActiveSpeaker,
  onEdit,
  onClick,
}: {
  player: { socketId?: string; name: string; icon: string; ready?: boolean; isHost?: boolean; isDisconnected?: boolean; color: string; softColor: string };
  compact?: boolean;
  displayName?: string;
  displayIcon?: string;
  speech?: string;
  isActiveSpeaker?: boolean;
  onEdit?: () => void;
  onClick?: () => void;
}) {
  const icon = displayIcon ?? player.icon;
  const isDisconnected = Boolean(player.isDisconnected);
  return (
    <div
      className={`player-chip ${compact ? "compact" : ""}`}
      onClick={onClick}
      style={{
        ...(compact ? {} : { backgroundColor: player.softColor, borderColor: player.color }),
        cursor: onClick ? "pointer" : "default",
        filter: isDisconnected ? "grayscale(80%) opacity(0.55)" : "none",
        position: "relative",
      }}
      title={onClick ? "클릭 시 이 유저의 프로필 전적 보기" : undefined}
    >
      {isDisconnected && (
        <span style={{
          position: "absolute",
          top: "-8px",
          right: "-8px",
          background: "#ff4785",
          color: "#fff",
          fontSize: "10px",
          fontWeight: "bold",
          padding: "2px 6px",
          borderRadius: "8px",
          zIndex: 10,
          boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
        }}>
          🔴 이탈됨
        </span>
      )}
      {speech && (
        <div
          className={`player-speech ${isActiveSpeaker ? "active-speaker" : ""}`}
          style={{ backgroundColor: player.softColor, borderColor: player.color, "--speech-bg": player.softColor } as CSSProperties}
        >
          {speech}
        </div>
      )}
      {/* 플레이어 아바타 (포트레이트 이미지 또는 이모지) */}
      <div className="avatar" style={{ background: player.color }}>
        <PlayerIcon icon={icon} size="100%" />
      </div>
      <span>{displayName ?? player.name}</span>
      {!compact && (
        <em className={isDisconnected ? "waiting" : player.isHost ? "host" : player.ready ? "ready" : "waiting"}>
          {isDisconnected ? "🔴 이탈" : player.isHost ? "👑 HOST" : player.ready ? "READY" : "..."}
        </em>
      )}
      {onEdit && <button className="nickname-edit" onClick={(e) => { e.stopPropagation(); onEdit(); }}>닉네임 편집</button>}
    </div>
  );
}

// --------------------------------------------------------------------
// 4. 메인 App 컴포넌트
// --------------------------------------------------------------------
export default function App() {
  // [상태 관리 - State]
  const [screen, setScreen] = useState<Screen>("home");
  const [nickname, setNickname] = useState("");
  // 기본 무작위 조합 닉네임 (미입력 시 사용되는 귀여운 조합 닉네임: 예 - "배고픈 감자")
  const [defaultNickname, setDefaultNickname] = useState(() => generateRandomNickname());
  const [selectedPortrait, setSelectedPortrait] = useState(0);
  const [editingNickname, setEditingNickname] = useState(false);
  
  // 실시간 방 및 서버 플레이어 상태
  const [onlinePlayers, setOnlinePlayers] = useState<any[]>(defaultPlayers);
  const [isHost, setIsHost] = useState(true);
  const [myPlayerInfo, setMyPlayerInfo] = useState<any>(null);
  const [joinInputCode, setJoinInputCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // 실시간 라이어 비밀 제시어 정보
  const [secretCategory, setSecretCategory] = useState("장소 / 놀거리");
  const [secretWord, setSecretWord] = useState("놀이공원");
  const [isLiar, setIsLiar] = useState(false);

  // 채팅 및 메시지 상태
  const [chatMessage, setChatMessage] = useState("");
  const [chatLog, setChatLog] = useState<{ text: string; time: string }[]>([]);
  
  // 캐릭터 머리 위 말풍선 개별 3초 표시 제어용 State 맵 & 발신자 소켓 ID & Timers Ref
  const [userSpeechMap, setUserSpeechMap] = useState<Record<string, string>>({});
  const userSpeechTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
  const [activeSpeakerSocketId, setActiveSpeakerSocketId] = useState<string | null>(null);

  // 채팅창 자동 스크롤 제어용 Ref (대기실 및 게임 화면)
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const roomChatLogRef = useRef<HTMLDivElement | null>(null);
  
  // 방 설정 정보
  const [roomCode, setRoomCode] = useState("MANGO7");
  const [roomTitle, setRoomTitle] = useState("모카의 비밀 아지트");
  const [roomPassword, setRoomPassword] = useState(""); // 기본값 빈 문자열 (비밀번호 없음)
  const [maxPlayers, setMaxPlayers] = useState(14);
  const [hintTime, setHintTime] = useState("60");
  const [defenseTime, setDefenseTime] = useState("45");
  const [liarCount, setLiarCount] = useState("1");
  const [gameMode, setGameMode] = useState<"fool" | "classic">("fool"); // 🎮 게임 모드 (fool: 바보 라이어(기본값), classic: 클래식 라이어)
  const [adminPassModalOpen, setAdminPassModalOpen] = useState(false); // 🔒 관리자 방 생성 비밀번호 확인 모달
  const [adminPassInput, setAdminPassInput] = useState("");
  const [adminPassError, setAdminPassError] = useState("");
  const [disconnectNoticeModal, setDisconnectNoticeModal] = useState<{ type: "host" | "liar" | "not-enough"; message: string } | null>(null); // 이탈 전면 알림 모달
  const [playerLeftToast, setPlayerLeftToast] = useState<{ name: string; icon: string; count: number } | null>(null); // 게임 중 일반 플레이어 이탈 상단 토스트 알림
  const [selectedCategory, setSelectedCategory] = useState("ALL"); // 주제 카테고리 (ALL: 전체 무작위)
  const [categories, setCategories] = useState<string[]>(["ALL", "장소 / 놀거리", "음식 / 디저트", "직업", "동식물", "전자제품"]);
  const [fastTestMode, setFastTestMode] = useState<boolean>(false); // 테스트용 초스피드 모드 (모든 타이머 1초)
  const [playerHints, setPlayerHints] = useState<Record<string, Array<{ round: number; text: string; time: string }>>>({}); // 각 유저별 힌트 기록
  const [selectedHintPlayer, setSelectedHintPlayer] = useState<any>(null); // 힌트 모달에 띄울 유저
  const [selectedProfilePlayer, setSelectedProfilePlayer] = useState<any>(null); // 프로필/업적/전적 모달에 띄울 유저
  // 🍎 과일/아이템 투척 및 포트레이트 지속 오염 State
  const [myInventory, setMyInventory] = useState<Record<string, number>>({ tomato: 2, egg: 2, water: 2, banana: 2 });
  const [playerStainsMap, setPlayerStainsMap] = useState<Record<string, Array<{ type: string; id: string; x: number; y: number; rotate: number }>>>({});
  const [hitBadgeMap, setHitBadgeMap] = useState<Record<string, { senderIcon: string; senderName: string } | null>>({});
  const [itemTargetPlayer, setItemTargetPlayer] = useState<any>(null); // 과일 투척 메뉴 휠 모달에 띄울 유저
  const [flyingProjectiles, setFlyingProjectiles] = useState<Array<{ id: string; itemType: string; startX: number; startY: number; endX: number; endY: number }>>([]);
  const [copied, setCopied] = useState(false);
  const [selectedVote, setSelectedVote] = useState("밤비");
  const [timer, setTimer] = useState(78);

  // 사용자가 닉네임을 작성하지 않으면 무작위 조합 닉네임(defaultNickname)을 자동 사용함
  const currentNickname = nickname.trim() || defaultNickname;
  const myIcon = portraits[selectedPortrait] || portraits[0];

  // 새 채팅 메시지 추가 시 대기실 및 플레이 화면 채팅창을 최하단(최신 메시지)으로 자동 스크롤
  useEffect(() => {
    if (roomChatLogRef.current) {
      roomChatLogRef.current.scrollTop = roomChatLogRef.current.scrollHeight;
    }
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [chatLog]);

  // 최대 인원 변경 시 라이어 인원 자동 보정
  useEffect(() => {
    const maxLiar = Math.max(1, Math.floor(maxPlayers / 2));
    if (Number(liarCount) > maxLiar) {
      setLiarCount(String(maxLiar));
    }
  }, [maxPlayers, liarCount]);

  // 비밀번호 입력 모달 및 대기 방 코드
  const [passModalOpen, setPassModalOpen] = useState(false);
  const [passInput, setPassInput] = useState("");
  const [pendingRoomCode, setPendingRoomCode] = useState("");

  // URL에서 전달받은 초대 목표 방 코드 (초대 링크 접속자용)
  const [targetRoomCode, setTargetRoomCode] = useState("");

  // v6 기획 게임 진행 Phase & 상태 (투표 후 최후변론/자기변호/최종결정 플로우 Phase 포함)
  const [gamePhase, setGamePhase] = useState<"waiting" | "countdown" | "notice" | "hint-turn" | "free-talk" | "vote" | "vote-result" | "last-words" | "guilty-vote" | "roulette" | "result" | "final-defense" | "self-defense" | "post-vote-free-talk" | "final-decision" | "re-vote">("waiting");
  const [countdownNum, setCountdownNum] = useState(3);
  const [turnSpeakerSocketId, setTurnSpeakerSocketId] = useState<string>("");
  const [turnTimeLeft, setTurnTimeLeft] = useState(20);
  const [eliminatedSocketIds, setEliminatedSocketIds] = useState<string[]>([]);
  const [voteTallyData, setVoteTallyData] = useState<{ tally: Record<string, number>; voteDetails: any[] } | null>(null);
  const [rouletteData, setRouletteData] = useState<{ candidateSocketIds: string[]; chosenSocketId: string; chosenPlayer: any; rouletteType: string } | null>(null);
  const [isRouletteSpinning, setIsRouletteSpinning] = useState(false);
  const [lastWordsSpeaker, setLastWordsSpeaker] = useState<any>(null);
  const [guiltyVotes, setGuiltyVotes] = useState<{ innocent: number; total: number } | null>(null);
  const [currentRound, setCurrentRound] = useState<number>(1);

  const [discussionTime, setDiscussionTime] = useState("40");
  const [turnNoticeText, setTurnNoticeText] = useState("");
  const [selectedVoteTarget, setSelectedVoteTarget] = useState<string>("");
  const [hasVoted, setHasVoted] = useState<boolean>(false);
  const [isSystemTyping, setIsSystemTyping] = useState<boolean>(false);
  const [showFreeTalkNotice, setShowFreeTalkNotice] = useState<boolean>(false);
  const [speakerTurnNotice, setSpeakerTurnNotice] = useState<{ name: string; icon: string; timeSec: number } | null>(null);

  // ── 투표 후 최후변론/자기변호/최종결정 플로우 State ──
  const [topVotedSocketIds, setTopVotedSocketIds] = useState<string[]>([]);          // 최다 득표자 소켓 ID 배열
  const [postVoteExcludedIds, setPostVoteExcludedIds] = useState<string[]>([]);      // 투표 후 자유토론 시 채팅 잠금 대상
  const [finalDecisionTarget, setFinalDecisionTarget] = useState<{ socketId: string; name: string; icon: string } | null>(null); // 최종 결정 투표 대상
  const [selectedFinalDecision, setSelectedFinalDecision] = useState<"guilty" | "innocent" | "">(""   ); // 유죄/무죄 선택
  const [hasFinalVoted, setHasFinalVoted] = useState(false);                          // 최종 결정 투표 완료 여부
  const [finalDecisionResult, setFinalDecisionResult] = useState<any>(null);          // 최종 결정 결과
  const [reVoteCandidates, setReVoteCandidates] = useState<string[]>([]);             // 재투표 후보 소켓 ID 배열
  const [selectedReVoteTarget, setSelectedReVoteTarget] = useState<string>("");       // 재투표 선택 대상
  const [hasReVoted, setHasReVoted] = useState(false);                                // 재투표 완료 여부
  const [showPostVoteNotice, setShowPostVoteNotice] = useState(false);                // 투표 후 모달 표시 제어
  const [gameResultData, setGameResultData] = useState<any>(null);                    // 게임 최종 결과 데이터
  const [innocentClearedNotice, setInnocentClearedNotice] = useState<{ targetName: string; targetIcon: string; innocentPercent: number } | null>(null); // 80% 무죄 구제 안내 모달

  // ── 💡 자유토론 100% 조기종료 투표 상태 ──
  const [discussionSkipData, setDiscussionSkipData] = useState<{
    skipCount: number;
    totalCount: number;
    percent: number;
    voterSocketIds: string[];
    isCompleted: boolean;
  } | null>(null);

  // 시스템 발언/공지 진행 중에만 주변 UI 회색빛 디밍 적용 (발언 시작 시 자동 풀림)
  // 투표 후 플로우 모달(최후변론/자기변호/자유토론/최종결정/재투표/80%무죄구제) 표시 시에도 디밍 적용
  const isNoticeDimmed = gamePhase === "notice" || gamePhase === "countdown" || isSystemTyping || showFreeTalkNotice || Boolean(speakerTurnNotice) || showPostVoteNotice || Boolean(innocentClearedNotice);

  const isPassingRef = useRef(false);

  // [힌트 발언 완료 핸들러]
  const handleTurnPass = () => {
    if (isPassingRef.current) return;
    isPassingRef.current = true;
    socket.emit("turn-pass");
    setTimeout(() => {
      isPassingRef.current = false;
    }, 1200);
  };

  // [최후변론 / 자기변호 발언 완료 핸들러]
  const handlePassDefense = () => {
    if (isPassingRef.current) return;
    isPassingRef.current = true;
    socket.emit("pass-defense");
    setTimeout(() => {
      isPassingRef.current = false;
    }, 1200);
  };

  // [자유토론 100% 조기종료 투표 토글 핸들러]
  const handleToggleSkipDiscussion = () => {
    socket.emit("toggle-skip-discussion");
  };

  // 대기실 방 설정(게임모드, 힌트시간, 토론시간 등) 변경 시 백엔드로 즉시 실시간 소켓 송신
  const handleUpdateRoomSettings = (overrides?: any) => {
    if (!isHost) return;
    socket.emit("update-room-settings", {
      roomTitle: overrides?.roomTitle ?? roomTitle,
      roomPassword: overrides?.roomPassword ?? roomPassword,
      maxPlayers: overrides?.maxPlayers ?? maxPlayers,
      liarCount: overrides?.liarCount ?? liarCount,
      gameMode: overrides?.gameMode ?? gameMode,
      hintTime: overrides?.hintTime ?? hintTime,
      discussionTime: overrides?.discussionTime ?? discussionTime,
      defenseTime: overrides?.defenseTime ?? defenseTime,
      fastTestMode: overrides?.fastTestMode ?? fastTestMode,
      selectedCategory: overrides?.selectedCategory ?? selectedCategory,
    });
  };

  // --------------------------------------------------------------------
  // 턴 남은 시간 실시간 1초 카운트다운 타이머 인터벌 (시스템 설명 중에는 일시 정지)
  // --------------------------------------------------------------------
  useEffect(() => {
    // 오직 실제 플레이어 힌트 발언(hint-turn), 자유 토론(free-talk),
    // 최후변론(final-defense), 자기변호(self-defense), 투표후 자유토론(post-vote-free-talk) 일 때에만 카운트가 흐름
    // 시스템 안내(notice), 카운트다운(countdown), 룰렛(roulette), 투표결과(vote-result) 동안은 카운트 일시 정지!
    const timerPhases = ["hint-turn", "free-talk", "final-defense", "self-defense", "post-vote-free-talk"];
    if (screen !== "play" || !timerPhases.includes(gamePhase)) return;

    const myId = socket.id || myPlayerInfo?.socketId;

    const timerInterval = setInterval(() => {
      setTurnTimeLeft((prev) => {
        if (prev <= 1) {
          // 0초에 도달하고 내가 현재 발언권자이면 백엔드로 turn-pass 소켓 안전 송신
          if (gamePhase === "hint-turn" && turnSpeakerSocketId === myId) {
            handleTurnPass();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [screen, gamePhase, turnSpeakerSocketId, myPlayerInfo]);

  const [typedText, setTypedText] = useState("");

  // --------------------------------------------------------------------
  // Socket.io 실시간 통신 리스너 등록
  // --------------------------------------------------------------------
  useEffect(() => {
    socket.connect();

    // 1) 방 생성/입장 성공 수신
    socket.on("room-joined", ({ room, myPlayer }) => {
      setRoomCode(room.roomCode);
      setRoomTitle(room.roomTitle);
      setMaxPlayers(room.maxPlayers);
      setLiarCount(String(room.liarCount));
      if (room.gameMode) setGameMode(room.gameMode);
      setOnlinePlayers(room.players);
      setMyPlayerInfo(myPlayer);
      setIsHost(myPlayer.isHost);
      setScreen("room");
      setErrorMessage("");
      setPassModalOpen(false);
    });

    // 2) 비밀번호 입력 요구 수신
    socket.on("room-password-required", ({ roomCode, message }) => {
      setPendingRoomCode(roomCode);
      setPassModalOpen(true);
      setErrorMessage(message);
    });

    // 3) 방 플레이어 목록/설정 실시간 갱신 수신 (내 ready 상태 및 힌트/토론시간 100% 동기화!)
    socket.on("room-updated", ({ room, categories: catList }) => {
      setOnlinePlayers(room.players);
      setRoomTitle(room.roomTitle);
      setMaxPlayers(room.maxPlayers);
      if (room.hintTime) setHintTime(String(room.hintTime));
      if (room.discussionTime) setDiscussionTime(String(room.discussionTime));
      if (room.defenseTime) setDefenseTime(String(room.defenseTime));
      if (room.liarCount) setLiarCount(String(room.liarCount));
      if (room.gameMode) setGameMode(room.gameMode);
      if (room.fastTestMode !== undefined) setFastTestMode(room.fastTestMode);
      if (room.selectedCategory) setSelectedCategory(room.selectedCategory);
      if (room.playerHints) setPlayerHints(room.playerHints);
      if (catList && Array.isArray(catList)) setCategories(["ALL", ...catList]);

      const me = room.players.find((p: any) => p.socketId === socket.id);
      if (me) setMyPlayerInfo(me);
    });

    // 3-1) 실시간 힌트 히스토리 업데이트 수신 (player-hints-updated)
    socket.on("player-hints-updated", ({ playerHints: hints }) => {
      setPlayerHints(hints || {});
    });

    // 3-2) 이탈 이벤트 리스너 (방장 이탈, 인원 부족 2명 이하, 일반 플레이어 이탈)
    // 👑 방장이 이탈한 경우 ➔ 방 폭파 및 시스템 알림 모달 후 캐릭터 선택창으로 강제 이동
    socket.on("host-left-game", ({ message }) => {
      setDisconnectNoticeModal({
        type: "host",
        message: message || "방장이 이탈하여 게임이 종료됩니다.",
      });

      // 방 세션 및 데이터 즉시 초기화 (방이 폭파되었으므로 대기실 복귀 불가)
      setTimeout(() => {
        setDisconnectNoticeModal(null);
        setRoomCode("");
        setOnlinePlayers(defaultPlayers);
        setMyPlayerInfo(null);
        setGamePhase("waiting");
        setScreen("character"); // 캐릭터 선택창으로 강제 이동
      }, 3000);
    });

    // ⚠️ 인원이 2명 이하로 줄어든 경우 ➔ 대기실로 복귀
    socket.on("not-enough-players", ({ message }) => {
      setDisconnectNoticeModal({
        type: "not-enough",
        message: message || "인원이 2명 이하로 줄어들어 게임이 종료되어 대기실로 이동합니다.",
      });
      setTimeout(() => {
        setDisconnectNoticeModal(null);
        setGamePhase("waiting");
        setScreen("room"); // 대기실로 복귀
        setChatLog([]);
        setUserSpeechMap({});
      }, 2800);
    });

    // 👤 게임 중 또는 대기실에서 일반 플레이어가 이탈한 경우 ➔ 화면 상단 토스트 알림
    socket.on("player-left", ({ leftPlayerName, leftPlayerIcon, remainingCount }) => {
      setPlayerLeftToast({
        name: leftPlayerName || "참여자",
        icon: leftPlayerIcon || "👤",
        count: remainingCount,
      });

      // 3초 후 토스트 자동 소멸
      setTimeout(() => {
        setPlayerLeftToast((prev) => (prev?.name === leftPlayerName ? null : prev));
      }, 3000);

      // 채팅창에 시스템 알림 메시지 기록
      setChatLog((logs) => [
        ...logs,
        { text: `📢 [시스템] [${leftPlayerName || "참여자"}] 님이 퇴장하였습니다. (남은 인원: ${remainingCount}명)`, time: "방금" },
      ]);
    });

    // 4) 실시간 채팅 수신 (각 유저별 독립 3초 말풍선 타이머 제어 - 다른 유저 말풍선 지워짐 100% 방지!)
    socket.on("chat-received", (payload) => {
      setChatLog((logs) => [...logs, { text: `${payload.senderName}: ${payload.text}`, time: payload.time }]);
      setActiveSpeakerSocketId(payload.senderId);

      const senderId = payload.senderId;
      if (senderId) {
        // 해당 발신 유저의 말풍선 텍스트 개별 갱신
        setUserSpeechMap((prev) => ({ ...prev, [senderId]: payload.text }));

        // 해당 발신 유저의 기존 3초 타이머만 개별 리셋 (다른 유저의 말풍선 타이머는 절대 건드리지 않음!)
        if (userSpeechTimersRef.current[senderId]) {
          clearTimeout(userSpeechTimersRef.current[senderId]);
        }

        // 3초 후 "해당 유저의 말풍선만" 깔끔하게 소멸
        userSpeechTimersRef.current[senderId] = setTimeout(() => {
          setUserSpeechMap((prev) => {
            const next = { ...prev };
            delete next[senderId];
            return next;
          });
        }, 3000);
      }
    });

    // 4-1) 과일/아이템 실시간 투척 수신 및 3D 궤적 애니메이션 / 충돌 스플래시 / 지속 오염 처리
    socket.on("item-thrown", ({ senderId, senderName, senderIcon, targetId, targetName, itemType, senderInventory }) => {
      const myId = socket.id || myPlayerInfo?.socketId;
      const isMe = senderId === myId || senderName === myPlayerInfo?.name;

      // 내가 던진 경우 내 인벤토리 재고 수량 1차감 실시간 갱신!
      if (isMe && senderInventory) {
        setMyInventory(senderInventory);
      }

      // 화면에서 발신자 칩과 수신자 칩의 DOM Rect 위치 구하기
      const senderEl =
        document.querySelector(`[data-socket-id="${senderId}"]`) ||
        document.querySelector(`[data-player-name="${senderName}"]`) ||
        document.querySelector(`.astra-player-card`);

      const targetEl =
        document.querySelector(`[data-socket-id="${targetId}"]`) ||
        document.querySelector(`[data-player-name="${targetName}"]`);

      let startX = window.innerWidth / 2;
      let startY = window.innerHeight / 2;
      let endX = window.innerWidth / 2;
      let endY = window.innerHeight / 2;

      if (senderEl) {
        const rect = senderEl.getBoundingClientRect();
        startX = rect.left + rect.width / 2;
        startY = rect.top + rect.height / 2;
      }
      if (targetEl) {
        const rect = targetEl.getBoundingClientRect();
        endX = rect.left + rect.width / 2;
        endY = rect.top + rect.height / 2;
      }

      const projId = `${Date.now()}-${Math.random()}`;
      const projectileObj = { id: projId, itemType, startX, startY, endX, endY };

      // 1) 0.7초간 화면에서 과일이 붕 날아가는 모션 활성화
      setFlyingProjectiles((prev) => [...prev, projectileObj]);

      // 2) 0.7초 후 충돌 지점에서 팡 터지며 "🎯 던진 사람: 🦊 닉네임" 표식 팝업 & 지속 오염 자국 추가
      setTimeout(() => {
        setFlyingProjectiles((prev) => prev.filter((p) => p.id !== projId));

        setHitBadgeMap((prev) => ({ ...prev, [targetId]: { senderIcon, senderName } }));
        setTimeout(() => {
          setHitBadgeMap((prev) => ({ ...prev, [targetId]: null }));
        }, 1400);

        setPlayerStainsMap((prev) => {
          const currentList = prev[targetId] || [];
          const qIndex = currentList.length % 4; // 4 사분면 (Top-Left, Top-Right, Bottom-Left, Bottom-Right) 순환 배치

          let baseX = 15;
          let baseY = 15;
          if (qIndex === 1) { baseX = 55; baseY = 15; }
          else if (qIndex === 2) { baseX = 15; baseY = 55; }
          else if (qIndex === 3) { baseX = 55; baseY = 55; }

          const randomX = baseX + Math.floor(Math.random() * 16) - 8;
          const randomY = baseY + Math.floor(Math.random() * 16) - 8;
          const randomRotate = Math.floor(Math.random() * 60) - 30;

          const stainItem = {
            type: itemType,
            id: `${Date.now()}-${Math.random()}`,
            x: Math.max(5, Math.min(70, randomX)),
            y: Math.max(5, Math.min(70, randomY)),
            rotate: randomRotate,
          };

          return {
            ...prev,
            [targetId]: [...currentList, stainItem],
          };
        });
      }, 700);
    });

    // 4-2) 💡 서버에서 브로드캐스트되는 힌트 기록을 실시간 수신하여 playerHints state에 즉시 동기화!
    // ⚠️ 이 리스너가 없으면 힌트 팝업에 힌트가 절대 표시되지 않음 — 핵심 리스너!
    socket.on("player-hints-updated", ({ playerHints: updatedHints }) => {
      setPlayerHints(updatedHints || {});
    });

    // 5) 게임 시작 수신 (비밀 제시어 및 라이어 수신)
    socket.on("game-started", ({ room, category, word, isLiar, activeSpeakerSocketId }) => {
      setOnlinePlayers(room.players);
      setSecretCategory(category);
      setSecretWord(word);
      setIsLiar(isLiar);
      setScreen("play");
      setGamePhase("countdown");
      setHintTime(String(room.hintTime || 20)); // 방장이 설정한 힌트 시간 100% 반영
      setDiscussionTime(String(room.discussionTime || 40)); // 방장이 설정한 자유 토론 시간 100% 반영
      setDefenseTime(String(room.defenseTime || 45)); // 방장이 설정한 최후변론 시간 100% 반영
      setTurnSpeakerSocketId(activeSpeakerSocketId || room.players[0]?.socketId || "");
      setEliminatedSocketIds([]);

      // 매 새 게임 시작 시 과일 아이템 재고(인당 각 2개) 및 포트레이트 지속 오염 자국 청소!
      setMyInventory({ tomato: 2, egg: 2, water: 2, banana: 2 });
      setPlayerStainsMap({});
      setHitBadgeMap({});

      // 💡 [대기실 ➔ 인게임 전환 시 채팅창 초기화]
      // 대기실에서 나눈 대화가 인게임 플레이 채팅창으로 넘어가지 않도록 초기화하고 게임 시작 안내 메시지 등록
      setChatLog([
        { text: "📢 [시스템]: 🎮 매치가 시작되었습니다! 비밀 제시어를 확인하고 순서대로 힌트를 발표해주세요.", time: "방금" },
      ]);
      setUserSpeechMap({});
      setChatMessage("");

      // 이전 게임이나 라운드의 투표 결과 state들을 깨끗이 초기화
      setFinalDecisionResult(null);
      setFinalDecisionTarget(null);
      setSelectedFinalDecision("");
      setHasFinalVoted(false);
      setVoteTallyData(null);
      setRouletteData(null);
      setDiscussionSkipData(null); // 💡 조기종료 투표 초기화

      // 3, 2, 1 카운트다운 타이머 연출
      setCountdownNum(3);
      const cd1 = setTimeout(() => setCountdownNum(2), 1000);
      const cd2 = setTimeout(() => setCountdownNum(1), 2000);
      const cd3 = setTimeout(() => {
        setGamePhase("notice");
        setTurnTimeLeft(5);
        setTypedText("");

        // 한 글자씩 쳐지는 감성 타이핑 애니메이션
        const fullMessage = "📢 선명하게 뚫려 보이는 [나의 비밀 제시어]를 확인해 주세요!";
        let charIdx = 0;
        const typingInterval = setInterval(() => {
          if (charIdx < fullMessage.length) {
            setTypedText(fullMessage.slice(0, charIdx + 1));
            charIdx++;
          } else {
            clearInterval(typingInterval);
          }
        }, 45);

        // 제시어 안내 블러 상태로 5초간 정독 머무름 ➔ 블러 해제 없이 바로 1번째 플레이어 턴 팝업 연결!
        setTimeout(() => {
          clearInterval(typingInterval);
          const firstPlayer = room.players[0] || onlinePlayers[0];
          const hTime = Number(room.hintTime) || 20;

          if (firstPlayer) {
            setSpeakerTurnNotice({
              name: firstPlayer.name || "1번째 플레이어",
              icon: firstPlayer.icon || "🦊",
              timeSec: hTime,
            });

            // 1.8초 팝업 모달 후 닫히면서 비로소 배경 블러 해제 및 1번째 플레이어 발언 시작!
            setTimeout(() => {
              setSpeakerTurnNotice(null);
              setGamePhase("hint-turn");
              setTurnTimeLeft(hTime);
              setTurnNoticeText("");
              setIsSystemTyping(false);
            }, 1800);
          } else {
            setGamePhase("hint-turn");
            setTurnTimeLeft(hTime);
            setTurnNoticeText("");
            setIsSystemTyping(false);
          }
        }, 5000);
      }, 3000);

      return () => {
        clearTimeout(cd1);
        clearTimeout(cd2);
        clearTimeout(cd3);
      };
    });

    // 6) 턴 변경 수신 (turn-changed)
    socket.on("turn-changed", ({ turnIndex, activeSpeakerSocketId, activeSpeakerName, hintTime: serverHintTime }) => {
      setTurnSpeakerSocketId(activeSpeakerSocketId);
      const sec = currentRound === 1 ? (Number(serverHintTime) || Number(hintTime) || 20) : 6;
      setTurnTimeLeft(sec);

      // 전면 블러 매 플레이어 턴 알림 팝업 1.8초간 노출!
      const speakerPlayer = onlinePlayers.find((p) => p.socketId === activeSpeakerSocketId);
      const speakerName = activeSpeakerName || speakerPlayer?.name || "참여자";
      const speakerIcon = speakerPlayer?.icon || "🦊";

      setSpeakerTurnNotice({
        name: speakerName,
        icon: speakerIcon,
        timeSec: sec,
      });

      // 1.8초 후 전면 블러 알림 팝업 자동 닫힘
      setTimeout(() => {
        setSpeakerTurnNotice(null);
      }, 1800);

      if (activeSpeakerName) {
        const fullStr = `📢 [진행자] [${activeSpeakerName}] 님의 힌트 발언 차례입니다!`;
        let charIdx = 0;
        setIsSystemTyping(true);
        setTurnNoticeText("");

        const tInterval = setInterval(() => {
          if (charIdx < fullStr.length) {
            setTurnNoticeText(fullStr.slice(0, charIdx + 1));
            charIdx++;
          } else {
            clearInterval(tInterval);
            setTimeout(() => {
              setIsSystemTyping(false); // 진행자 멘트 완독을 위해 1.5초 간 회색 유지 후 해제
            }, 1500);
          }
        }, 65);

        setChatLog((logs) => [
          ...logs,
          { text: `📢 [시스템] [${activeSpeakerName}] 님의 힌트 발언 차례입니다.`, time: "방금" },
        ]);
      }
    });

    // 7) 페이즈 변경 수신 (game-phase-changed)
    socket.on("game-phase-changed", ({ phase, activeSpeakerSocketId, discussionTime: dSec, message, payload }) => {
      setGamePhase(phase as any);
      setDiscussionSkipData(null); // 💡 페이즈 전환 시 조기종료 투표 상태 리셋

      if (phase === "free-talk") {
        const effectiveSec = dSec || Number(discussionTime) || 40;
        setDiscussionTime(String(effectiveSec));
        setShowFreeTalkNotice(true);
        setTurnTimeLeft(effectiveSec);

        const freeTalkMsg = `📢 [시스템] ${effectiveSec}초간 자유 토론이 시작되었습니다! 자유롭게 추리하세요.`;
        let fIdx = 0;
        setIsSystemTyping(true);
        setTurnNoticeText("");

        const fInterval = setInterval(() => {
          if (fIdx < freeTalkMsg.length) {
            setTurnNoticeText(freeTalkMsg.slice(0, fIdx + 1));
            fIdx++;
          } else {
            clearInterval(fInterval);
            setTimeout(() => {
              setIsSystemTyping(false);
            }, 300);
          }
        }, 35);

        setChatLog((logs) => [
          ...logs,
          { text: freeTalkMsg, time: "방금" },
        ]);

        // 2.5초 후 전면 블러 안내 팝업 자동 닫힘
        setTimeout(() => {
          setShowFreeTalkNotice(false);
        }, 2500);
      }

      // ── 최후변론 (final-defense) 수신: 차례 안내 모달 표시 후 타이머 시작 ──
      if (phase === "final-defense" && payload) {
        const effectiveDefenseSec = payload.timeSec || Number(defenseTime) || 45;
        setDefenseTime(String(effectiveDefenseSec));
        setTopVotedSocketIds(payload.topVotedSocketIds || []);
        setShowPostVoteNotice(true);
        setTurnTimeLeft(effectiveDefenseSec);

        // 차례 안내 모달을 2초간 보여준 후 닫고 발언 시작
        setTimeout(() => {
          setShowPostVoteNotice(false);
        }, 2000);

        setChatLog((logs) => [
          ...logs,
          { text: `📢 [시스템] ⚖️ [${payload.speakerName}] 님의 최후변론이 시작됩니다! (${effectiveDefenseSec}초)`, time: "방금" },
        ]);
      }

      // ── 자기 변호 (self-defense) 수신: 차례 안내 모달 표시 후 타이머 시작 ──
      if (phase === "self-defense" && payload) {
        const effectiveDefenseSec = payload.timeSec || Number(defenseTime) || 45;
        setDefenseTime(String(effectiveDefenseSec));
        setTopVotedSocketIds(payload.topVotedSocketIds || []);
        setShowPostVoteNotice(true);
        setTurnTimeLeft(effectiveDefenseSec);

        // 차례 안내 모달을 2초간 보여준 후 닫고 발언 시작
        setTimeout(() => {
          setShowPostVoteNotice(false);
        }, 2000);

        setChatLog((logs) => [
          ...logs,
          { text: `📢 [시스템] 🎤 [${payload.speakerName}] 님의 자기 변호가 시작됩니다! (${payload.currentDefenseIndex + 1}/${payload.totalDefenseCount}, ${effectiveDefenseSec}초)`, time: "방금" },
        ]);
      }

      // ── 투표 후 자유토론 (post-vote-free-talk) 수신: 모달 표시 + 타이머 ──
      if (phase === "post-vote-free-talk" && payload) {
        setPostVoteExcludedIds(payload.excludedSocketIds || []);
        setShowPostVoteNotice(true);
        setTurnTimeLeft(payload.timeSec || 10);

        // 2초 후 모달 닫기
        setTimeout(() => {
          setShowPostVoteNotice(false);
        }, 2000);

        setChatLog((logs) => [
          ...logs,
          { text: `📢 [시스템] 💬 자유토론 시작! (10초) [${payload.excludedNames}] 제외`, time: "방금" },
        ]);
      }

      // ── 2라운드 남길 말 (last-words) 수신 ──
      if (phase === "last-words" && payload) {
        setShowPostVoteNotice(true);
        setTurnTimeLeft(payload.timeSec || 5);

        setTimeout(() => {
          setShowPostVoteNotice(false);
        }, 2000);

        setChatLog((logs) => [
          ...logs,
          { text: `📢 [시스템] 💬 [${payload.speakerName}] 님이 5초간 '남길 말'을 남깁니다!`, time: "방금" },
        ]);
      }

      // ── 최종 결정 투표 (final-decision) 수신: 투표 모달 표시 ──
      if (phase === "final-decision" && payload) {
        setFinalDecisionTarget({
          socketId: payload.targetSocketId,
          name: payload.targetName,
          icon: payload.targetIcon,
        });
        setSelectedFinalDecision("");
        setHasFinalVoted(false);

        setChatLog((logs) => [
          ...logs,
          { text: `📢 [시스템] 🗳️ 최종 결정! [${payload.targetName}]은(는) 라이어인가요? (80% 이상 무죄 시 구제)`, time: "방금" },
        ]);
      }

      // ── 재투표 (re-vote) 수신: 재투표 모달 표시 ──
      if (phase === "re-vote" && payload) {
        setReVoteCandidates(payload.candidateSocketIds || []);
        setSelectedReVoteTarget("");
        setHasReVoted(false);

        setChatLog((logs) => [
          ...logs,
          { text: `📢 [시스템] 🗳️ 재투표! 공동 최다 득표자 중 1명을 선택해 주세요. (${payload.candidateNames})`, time: "방금" },
        ]);
      }

      // ── 게임 결과 (result) 수신: 결과 화면 표시 ──
      if (phase === "result" && payload) {
        setGameResultData(payload);

        setChatLog((logs) => [
          ...logs,
          { text: `📢 [시스템] ${payload.resultMessage}`, time: "방금" },
        ]);
      }
      
      if (activeSpeakerSocketId !== undefined) {
        setTurnSpeakerSocketId(activeSpeakerSocketId);
      }
      if (payload?.round) {
        setCurrentRound(payload.round);
      }

      // 투표 상태 초기화 (1차 투표 또는 힌트 턴 등 새 단계 진입 시 이전 투표 결과 팝업 제거)
      if (phase === "vote" || phase === "hint-turn" || phase === "free-talk") {
        setSelectedVoteTarget("");
        setHasVoted(false);
        if (phase === "vote" || phase === "hint-turn") {
          setFinalDecisionResult(null);
          setFinalDecisionTarget(null);
          setSelectedFinalDecision("");
          setHasFinalVoted(false);
        }
      }
    });

    // 8) 투표 상세 표 수신 (vote-result-tally)
    socket.on("vote-result-tally", ({ tally, voteDetails }) => {
      setVoteTallyData({ tally, voteDetails });
      setGamePhase("vote-result");
    });

    // 9) 룰렛 실행 결과 수신 (roulette-result)
    socket.on("roulette-result", ({ candidateSocketIds, chosenSocketId, chosenPlayer, rouletteType }) => {
      setRouletteData({ candidateSocketIds, chosenSocketId, chosenPlayer, rouletteType });
      setIsRouletteSpinning(true);
      setGamePhase("roulette");
      
      // 2.5초간 회전 후 당첨자 하이라이트 정지
      setTimeout(() => {
        setIsRouletteSpinning(false);
      }, 2500);
    });

    // 10) 흑백 탈락 수신 (player-eliminated)
    socket.on("player-eliminated", ({ eliminatedSocketIds }) => {
      setEliminatedSocketIds(eliminatedSocketIds || []);
    });

    // 11) 방 에러 수신
    socket.on("room-error", ({ message }) => {
      setErrorMessage(message);
    });

    // 12) 최종 결정 결과 수신 (final-decision-result)
    socket.on("final-decision-result", (data) => {
      setFinalDecisionResult(data);
      // 결과 화면으로는 서버가 이후 game-phase-changed로 전환해줌
    });

    // 13) 재투표 결과 수신 (re-vote-result)
    socket.on("re-vote-result", (data) => {
      // 재투표 결과는 서버가 자동으로 다음 플로우로 전환해줌 (단일 최다 → 최후변론, 동률 → 룰렛)
      if (data.isTied) {
        setChatLog((logs) => [
          ...logs,
          { text: "📢 [시스템] 재투표에서도 동률! 🎰 단죄 룰렛을 가동합니다!", time: "방금" },
        ]);
      }
    });

    // 14) 80% 무죄 판정 구제 알림 수신 (innocent-cleared-notice)
    socket.on("innocent-cleared-notice", (data) => {
      console.log("✨ [80% 무죄 모달 수신]", data);
      setInnocentClearedNotice({
        targetName: data.targetName,
        targetIcon: data.targetIcon,
        innocentPercent: data.innocentPercent,
      });

      // 5초간 전면 블러 무죄 구제 가독 모달을 노출한 후 닫음
      setTimeout(() => {
        setInnocentClearedNotice(null);
      }, 5000);

      setChatLog((logs) => [
        ...logs,
        { text: `📢 [시스템] ✨ 80% 이상이 [${data.targetName}] 님의 무죄를 인정하여 2라운드가 진행됩니다!`, time: "방금" },
      ]);
    });

    // 15) 자유토론 100% 조기종료 동의 현황 수신 (discussion-skip-updated)
    socket.on("discussion-skip-updated", (data) => {
      setDiscussionSkipData(data);
    });

    return () => {
      socket.off("room-joined");
      socket.off("room-password-required");
      socket.off("room-updated");
      socket.off("chat-received");
      socket.off("item-thrown");
      socket.off("game-started");
      socket.off("turn-changed");
      socket.off("game-phase-changed");
      socket.off("vote-result-tally");
      socket.off("roulette-result");
      socket.off("player-eliminated");
      socket.off("room-error");
      socket.off("final-decision-result");
      socket.off("re-vote-result");
      socket.off("innocent-cleared-notice");
      socket.off("discussion-skip-updated");
    };
  }, [currentRound]);

  // --------------------------------------------------------------------
  // [초대 URL 자동 감지] 웹앱 처음 접속 시 최초 1회만 실행되는 useEffect
  // --------------------------------------------------------------------
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomFromUrl = params.get("room") || params.get("roomCode");
    if (roomFromUrl) {
      const code = roomFromUrl.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().trim();
      if (code) {
        setTargetRoomCode(code);
        setJoinInputCode(code);
        setScreen("character"); // 최초 1회 접속 시에만 캐릭터 선택 화면으로 이동
        
        // 초대 주소 접속 시 소켓 연결 즉시 수립 보장
        if (!socket.connected) {
          socket.connect();
        }
      }
    }
  }, []); // 의존성 배열 []: 최초 마운트 시 1회만 동작!

  // [캐릭터 생성 후 대기실 이동 / 생성 / 참여 소켓 제출 함수]
  const handleProceedToRoom = () => {
    const currentNickname = nickname.trim() || defaultNickname;
    const myIcon = portraits[selectedPortrait] || portraits[0];

    // 소켓 연결 끊김 방지 자동 재연결 처리
    if (!socket.connected) {
      socket.connect();
    }

    const roomToJoin = (targetRoomCode || joinInputCode).trim().toUpperCase();

    if (roomToJoin) {
      // 초대 링크 또는 방 코드로 입장하는 사용자
      socket.emit("join-room", {
        roomCode: roomToJoin,
        roomPassword: passInput,
        nickname: currentNickname,
        portrait: myIcon,
      });
    } else {
      // 새 방을 만드는 방장 -> 0307 인증 완료 상태에서 create-room 발송
      const finalCode = roomCode || generateRoomCode();
      setRoomCode(finalCode);
      socket.emit("create-room", {
        roomCode: finalCode,
        roomTitle,
        roomPassword,
        adminPassword: "0307",
        maxPlayers,
        liarCount,
        gameMode,
        hintTime,
        discussionTime,
        defenseTime,
        nickname: currentNickname,
        portrait: myIcon,
      });
    }
  };

  // [관리자 비밀번호 0307 확인 후 캐릭터 생성 창 이동 함수]
  const handleVerifyAdminPassword = () => {
    if (adminPassInput.trim() !== "0307") {
      setAdminPassError("⚠️ 관리자 비밀번호가 올바르지 않습니다.");
      return;
    }

    const newCode = generateRoomCode();
    setRoomCode(newCode); // 방장이 생성할 6자리 무작위 방 코드 할당

    setAdminPassModalOpen(false);
    setAdminPassError("");
    setAdminPassInput("");
    setTargetRoomCode("");
    setJoinInputCode("");
    setScreen("character"); // 0307 성공 시 캐릭터 선택 화면으로 이동
  };

  // [방 참여 소켓 전송 함수]
  const handleJoinRoom = () => {
    if (!joinInputCode.trim()) return;
    const currentNickname = nickname.trim() || defaultNickname;
    const myIcon = portraits[selectedPortrait] || portraits[0];

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit("join-room", {
      roomCode: joinInputCode.trim().toUpperCase(),
      roomPassword: passInput,
      nickname: currentNickname,
      portrait: myIcon,
    });
  };

  // [비밀번호 제출 처리 함수]
  const handlePassSubmit = () => {
    const currentNickname = nickname.trim() || defaultNickname;
    const myIcon = portraits[selectedPortrait] || portraits[0];

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit("join-room", {
      roomCode: (pendingRoomCode || joinInputCode || targetRoomCode).trim().toUpperCase(),
      roomPassword: passInput,
      nickname: currentNickname,
      portrait: myIcon,
    });
  };

  // [준비 완료 / 취소 소켓 전송 함수]
  const handleToggleReady = () => {
    socket.emit("toggle-ready");
  };

  // [게임 시작 소켓 전송 함수]
  const handleStartGame = () => {
    socket.emit("start-game");
  };


  // [채팅 전송 소켓 함수]
  const sendChat = () => {
    const text = chatMessage.trim();
    if (!text) return;
    socket.emit("send-chat", { text, roomCode });
    setChatMessage("");
  };

  // [초대 URL 링크 복사 함수 - 배포 및 로컬 도메인 동적 자동 적용]
  const copyCode = () => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    navigator.clipboard?.writeText(inviteUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <main className="app-shell">
      {/* AI 수정 지시용 시각적 픽(Visual Inspector) 도구 부착 */}
      <VisualInspector currentScreen={screen} />

      {/* 백그라운드 디자인 요소 */}
      <div className="orb orb-one" /><div className="orb orb-two" /><div className="grid-sparkles" />
      
      {/* 상단 헤더 바 */}
      <header className="topbar">
        <button className="brand-button" onClick={() => setScreen("home")}><Logo /></button>
        {screen !== "home" && <div className="top-status"><span className="pulse" /> 실시간 연결됨 <span className="status-divider" /> {onlinePlayers.length}명 참여 중</div>}
        <button className="sound-button" aria-label="소리 설정">♪</button>
      </header>

      {/* 에러 메시지 팝업 (선명한 상단 플로팅 모달) */}
      {errorMessage && (
        <div style={{
          position: "fixed",
          top: "24px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 99999,
          background: "#ff4785",
          color: "#fff",
          padding: "14px 24px",
          borderRadius: "14px",
          boxShadow: "0 8px 30px rgba(255, 71, 133, 0.4)",
          fontWeight: "bold",
          fontSize: "15px",
          display: "flex",
          alignItems: "center",
          gap: "14px",
          border: "2px solid #ffffff",
        }}>
          <span>⚠️ {errorMessage}</span>
          <button
            style={{
              background: "rgba(255, 255, 255, 0.25)",
              border: 0,
              color: "#fff",
              padding: "6px 12px",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "13px",
              transition: "all 0.2s",
            }}
            onClick={() => setErrorMessage("")}
          >
            확인
          </button>
        </div>
      )}

      {/* 1. 홈 화면 */}
      {screen === "home" && <section className="home-screen">
        <div className="hero-copy">
          <p className="eyebrow">SAY IT. HIDE IT. FIND THE LIAR.</p>
          <h1>누가 진짜<br /><strong>거짓말장인</strong>일까?</h1>
          <p className="hero-description">모두가 같은 단어를 아는 척해요.<br />단 한 명, <b>라이어</b>만 빼고요.</p>
          <div className="home-actions" style={{ flexDirection: "column", gap: "10px", alignItems: "flex-start" }}>
            <button
              className="primary-button"
              onClick={() => {
                setAdminPassInput("");
                setAdminPassError("");
                setAdminPassModalOpen(true);
              }}
            >
              방 만들기 <span>→</span>
            </button>
            <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
              <input
                style={{ padding: "10px 14px", borderRadius: "10px", border: "2px solid #20212b", fontWeight: "bold", textTransform: "uppercase" }}
                placeholder="방 코드 (예: MANGO7)"
                value={joinInputCode}
                onChange={(e) => setJoinInputCode(e.target.value.toUpperCase())}
              />
              <button className="outline-button" onClick={handleJoinRoom}>방 참여 <span>→</span></button>
            </div>
          </div>
          <p className="tiny-note">© dunggle</p>
        </div>
        <div className="hero-game" aria-label="게임 미리보기">
          <div className="sticker sticker-top">BE SUSPICIOUS <span>✦</span></div>
          <div className="game-card preview-card quote-card">
            <span className="quote-mark">“</span>
            <p>상대를 속이려면<br /><strong>나 자신마저 속여라</strong></p>
            <b>정신 바짝차리그라!</b>
          </div>
          <div className="suspect-card"><span>?</span><b>누가 라이어일까요?</b><small>투표로 밝혀내세요</small></div>
          <div className="sticker sticker-bottom">TRUST NO ONE</div>
        </div>
      </section>}

      {/* 2. 캐릭터 설정 화면 */}
      {screen === "character" && <section className="character-screen">
        <div className="character-heading">
          <p className="eyebrow">PLAYER PROFILE</p>
          <h1>{targetRoomCode ? `[${targetRoomCode}] 방 입장하기` : "캐릭터 생성"}</h1>
          <p>{targetRoomCode ? "게임에서 사용할 나만의 프로필을 설정해 주세요." : "나를 닮은 포트레이트와 이름을 골라주세요."}</p>
        </div>
        <article className="character-card">
          <div className="character-card-head">
            <div>
              <span className="card-label">STEP 01 / 01</span>
              <h2>오늘의 나는 누구?</h2>
            </div>
            <span className="portrait-count">{selectedPortrait + 1} / {portraits.length}</span>
          </div>

          {/* 14개의 캐릭터 포트레이트 선택 그리드 */}
          <div className="portrait-grid">
            {portraits.map((portrait, index) => (
              <button
                key={`${portrait}-${index}`}
                type="button"
                aria-label={`${index + 1}번 캐릭터 포트레이트`}
                onClick={() => setSelectedPortrait(index)}
                className={selectedPortrait === index ? "portrait-choice selected" : "portrait-choice"}
              >
                <img
                  src={portrait}
                  alt={`${index + 1}번 캐릭터`}
                  className="portrait-img"
                  loading="lazy"
                />
                {selectedPortrait === index && <b>선택됨</b>}
              </button>
            ))}
          </div>
          <div className="profile-divider" />
          <div className="nickname-entry" style={{ flexDirection: "column", gap: "14px", alignItems: "stretch" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <label htmlFor="nickname">닉네임 입력 <small>선택</small></label>
                <p>입력하지 않으면 <b>"{defaultNickname}"</b>(으)로 참여해요.</p>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input id="nickname" value={nickname} onChange={(event) => setNickname(event.target.value.slice(0, 12))} placeholder={defaultNickname} maxLength={12} />
                {/* 무작위 조합 닉네임을 새로 뽑는 주사위 버튼 */}
                <button
                  type="button"
                  onClick={() => setNickname(generateRandomNickname())}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "10px",
                    border: "2px solid #635bff",
                    background: "#e0e0ff",
                    color: "#4338ca",
                    fontWeight: "bold",
                    fontSize: "13px",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.2s ease",
                  }}
                  title="랜덤 닉네임 추천받기"
                >
                  🎲 주사위
                </button>
              </div>
            </div>
            
            {/* 방을 만들 때 비밀번호를 설정할 수 있는 필드 제공 */}
            {!targetRoomCode && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "10px", borderTop: "1px dashed #e8e2d6" }}>
                <div><label htmlFor="roomPassword">방 비밀번호 설정 <small>선택</small></label><p>비워두면 <b>비밀번호 없이</b> 누구나 입장할 수 있습니다.</p></div>
                <input id="roomPassword" type="password" value={roomPassword} onChange={(event) => setRoomPassword(event.target.value)} placeholder="비밀번호 없음 (공개방)" maxLength={20} />
              </div>
            )}
          </div>
          <div className="character-actions">
            <button className="back-button" onClick={() => setScreen("home")}>← 처음으로</button>
            <button className="primary-button" onClick={handleProceedToRoom}>
              {targetRoomCode ? "대기실로 입장 →" : "대기실 만들기 →"}
            </button>
          </div>
        </article>
      </section>}

      {/* 3. 대기실 화면 */}
      {screen === "room" && <section className="room-screen">
        <div className="screen-intro"><p className="eyebrow">WAITING ROOM</p><h2>친구들을 <mark>불러모으는 중!</mark></h2></div>
        <div className="room-layout">
          <article className="room-card invite-card">
            <div className="settings-heading">
              <span className="card-label">{isHost ? "HOST CONTROLS" : "GAME INFO"}</span>
              <span className="host-badge">{isHost ? "👑 방장" : "참여자"}</span>
            </div>

            {/* 방장일 때만 방 제목/인원수/라운드 설정 조절 가능 */}
            {isHost ? (
              <>
                <label className="field-label">방 제목<input value={roomTitle} onChange={(event) => setRoomTitle(event.target.value)} /></label>
                <label className="field-label">방 비밀번호 <span className="optional">선택</span><input type="password" value={roomPassword} onChange={(event) => setRoomPassword(event.target.value)} /></label>
                
                {/* 📌 제시어 주제 선택 드롭다운 */}
                <label className="field-label">📌 제시어 주제
                  <select
                    value={selectedCategory}
                    onChange={(event) => {
                      const val = event.target.value;
                      setSelectedCategory(val);
                      handleUpdateRoomSettings({ selectedCategory: val });
                    }}
                  >
                    <option value="ALL">🎲 전체 무작위</option>
                    <option value="장소 / 놀거리">🏖️ 장소 / 놀거리</option>
                    <option value="음식 / 디저트">🍔 음식 / 디저트</option>
                    <option value="직업">💼 직업</option>
                    <option value="동식물">🦁 동식물</option>
                    <option value="전자제품">🔌 전자제품</option>
                  </select>
                </label>

                <label className="field-label" style={{ fontWeight: "bold" }}>🎮 게임 모드
                  <select
                    value={gameMode}
                    onChange={(event) => {
                      const val = event.target.value as "fool" | "classic";
                      setGameMode(val);
                      handleUpdateRoomSettings({ gameMode: val });
                    }}
                  >
                    <option value="fool">🤪 바보 라이어 (다른 제시어 / 기본값)</option>
                    <option value="classic">😈 클래식 라이어 (🚨 라이어 표기)</option>
                  </select>
                </label>

                <label className="field-label">최대 인원<select value={maxPlayers} onChange={(event) => setMaxPlayers(Number(event.target.value))}>{[4, 6, 8, 10, 12, 14].map((count) => <option value={count} key={count}>{count}명</option>)}</select></label>
                <div className="rule-line" />
                <span className="card-label">ROUND SETTINGS</span>
                <div className="time-settings">
                  <label>1R 힌트시간
                    <select
                      value={hintTime}
                      onChange={(event) => {
                        const val = event.target.value;
                        setHintTime(val);
                        handleUpdateRoomSettings({ hintTime: val });
                      }}
                    >
                      <option value="10">10초</option>
                      <option value="15">15초</option>
                      <option value="20">20초</option>
                      <option value="30">30초</option>
                      <option value="45">45초</option>
                      <option value="60">60초</option>
                    </select>
                  </label>
                  <label>자유토론시간
                    <select
                      value={discussionTime}
                      onChange={(event) => {
                        const val = event.target.value;
                        setDiscussionTime(val);
                        handleUpdateRoomSettings({ discussionTime: val });
                      }}
                    >
                      <option value="10">10초</option>
                      <option value="15">15초</option>
                      <option value="20">20초</option>
                      <option value="30">30초</option>
                      <option value="40">40초</option>
                      <option value="60">60초</option>
                    </select>
                  </label>
                  <label>최후변론시간
                    <select
                      value={defenseTime}
                      onChange={(event) => {
                        const val = event.target.value;
                        setDefenseTime(val);
                        handleUpdateRoomSettings({ defenseTime: val });
                      }}
                    >
                      <option value="15">15초</option>
                      <option value="30">30초</option>
                      <option value="45">45초</option>
                      <option value="60">60초</option>
                    </select>
                  </label>
                  <label>라이어 수
                    <select
                      value={liarCount}
                      onChange={(event) => {
                        const val = event.target.value;
                        setLiarCount(val);
                        handleUpdateRoomSettings({ liarCount: val });
                      }}
                    >
                      {Array.from({ length: Math.max(1, Math.floor(maxPlayers / 2)) }, (_, i) => i + 1).map((num) => (
                        <option key={num} value={String(num)}>{num}명</option>
                      ))}
                    </select>
                  </label>
                </div>

                {/* ⚡ 테스트 전용 1초 초스피드 모드 체크박스 */}
                <div style={{ marginTop: "16px", padding: "12px", borderRadius: "12px", background: fastTestMode ? "#ffe5ee" : "#f5f0ff", border: `2px dashed ${fastTestMode ? "#ff4785" : "#635bff"}`, transition: "all 0.2s" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: isHost ? "pointer" : "default", fontWeight: "bold", fontSize: "13px", color: fastTestMode ? "#ff4785" : "#4338ca" }}>
                    <input
                      type="checkbox"
                      checked={fastTestMode}
                      disabled={!isHost}
                      onChange={(event) => {
                        const val = event.target.checked;
                        setFastTestMode(val);
                        handleUpdateRoomSettings({ fastTestMode: val });
                      }}
                      style={{ width: "18px", height: "18px", accentColor: "#ff4785", cursor: isHost ? "pointer" : "default" }}
                    />
                    ⚡ 초스피드 테스트 모드 (모든 타이머 1초)
                  </label>
                  <p style={{ margin: "4px 0 0 28px", fontSize: "11px", color: "#666" }}>
                    {fastTestMode ? "🔥 모든 발언, 자유토론, 모달 대기 시간이 1초로 진행됩니다!" : "체크 시 힌트/토론/변론/모달 시간이 1초로 고속 진행됩니다."}
                  </p>
                </div>
              </>
            ) : (
              /* 일반 참여자용 방 정보 요약 표시 */
              <div style={{ margin: "15px 0", fontSize: "13px", lineHeight: "1.8", color: "#5a5557" }}>
                <p><b>방 제목:</b> {roomTitle}</p>
                <p><b>게임 모드:</b> {gameMode === "fool" ? "🤪 바보 라이어 (다른 제시어 제공)" : "😈 클래식 라이어 (🚨 라이어 표기)"}</p>
                <p><b>최대 인원:</b> {maxPlayers}명 | <b>라이어 수:</b> {liarCount}명</p>
                <p><b>힌트 / 토론 / 변론시간:</b> {hintTime}초 / {discussionTime}초 / {defenseTime}초</p>
              </div>
            )}

            <div className="code-footer"><div><span className="card-label">ROOM CODE</span><strong>{roomCode}</strong></div><button onClick={copyCode}>{copied ? "복사됨!" : "코드 복사"}</button></div>
            <button className="link-button" onClick={copyCode}>↗ 초대 링크 공유하기</button>
          </article>

          <article className="room-card players-card">
            <div className="card-title"><span><i className="online-dot" /> 실시간 접속자 <b>{onlinePlayers.length}</b> / {maxPlayers}</span><small>방 코드: {roomCode} · {roomTitle}</small></div>
            
            {/* 대기실 실시간 접속 플레이어 칩 (포트레이트 클릭 시 전적 및 업적 팝업 모달 노출) */}
            <div className="players-grid">
              {onlinePlayers.map((player) => (
                <PlayerChip
                  player={player}
                  key={player.socketId || player.name}
                  displayName={player.name}
                  displayIcon={player.icon}
                  speech={player.socketId ? userSpeechMap[player.socketId] : undefined}
                  isActiveSpeaker={player.socketId === activeSpeakerSocketId}
                  onClick={() => setSelectedProfilePlayer(player)}
                />
              ))}
              {Array.from({ length: Math.max(0, maxPlayers - onlinePlayers.length) }, (_, index) => (
                <div className="empty-seat" key={`empty-${index}`}>+<span>빈 자리</span></div>
              ))}
            </div>
            
            <div className="room-chat">
              <div className="room-chat-head"><span>💬 실시간 대기실 채팅</span><small>모든 참여자가 볼 수 있어요</small></div>
              <div className="room-chat-log" ref={roomChatLogRef} aria-live="polite">
                {chatLog.length === 0 ? <p>아직 대화가 없어요. 먼저 인사해 보세요!</p> : chatLog.map((entry, index) => <div className="room-log-entry" key={`${entry.text}-${index}`}><b>{entry.text.split(':')[0]}</b><span>{entry.text.split(':')[1] || entry.text}</span><time>{entry.time}</time></div>)}
              </div>
              <div className="chat-compose">
                <input value={chatMessage} onChange={(event) => setChatMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") sendChat(); }} placeholder="대기실에 메시지 보내기" maxLength={60} />
                <button onClick={sendChat} disabled={!chatMessage.trim()}>전송</button>
              </div>
            </div>

            <div className="ready-footer">
              {isHost ? (
                (() => {
                  const isAllReady = onlinePlayers.length >= 2 && onlinePlayers.every((p) => p.isHost || p.ready);
                  return (
                    <>
                      <span>
                        {onlinePlayers.filter((p) => p.ready || p.isHost).length} / {onlinePlayers.length} 명 준비 완료!
                      </span>
                      <button
                        className="primary-button small"
                        onClick={handleStartGame}
                        disabled={!isAllReady}
                        style={!isAllReady ? { opacity: 0.5, cursor: "not-allowed", boxShadow: "none" } : undefined}
                      >
                        {onlinePlayers.length < 2
                          ? "2명 이상 필요"
                          : isAllReady
                          ? "게임 시작 →"
                          : "준비 대기 중..."}
                      </button>
                    </>
                  );
                })()
              ) : (
                <>
                  <span>방장의 게임 시작을 기다리는 중입니다...</span>
                  <button
                    className="primary-button"
                    onClick={handleToggleReady}
                    style={{
                      padding: "10px 24px",
                      fontSize: "15px",
                      backgroundColor: myPlayerInfo?.ready ? "#635bff" : "#e0e0ff",
                      color: myPlayerInfo?.ready ? "#ffffff" : "#4338ca",
                      borderColor: myPlayerInfo?.ready ? "#4f46e5" : "#c7d2fe",
                      boxShadow: myPlayerInfo?.ready ? "0 4px 14px rgba(99,91,255,0.4)" : "none",
                      fontWeight: "bold",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {myPlayerInfo?.ready ? "✓ 준비완료" : "준비"}
                  </button>
                </>
              )}
            </div>
          </article>
        </div>

        {/* 📌 대기실 포트레이트 클릭 시 플레이어 전적 & 대표 업적 팝업 모달 */}
        {selectedProfilePlayer && (
          <div className="modal-backdrop" style={{ backdropFilter: "blur(8px)", backgroundColor: "rgba(0,0,0,0.6)", zIndex: 9999 }}>
            <div className="nickname-modal" style={{ maxWidth: "460px", width: "90%", border: "3px solid #635bff", boxShadow: "0 0 35px rgba(99,91,255,0.5)", animation: "popIn 0.3s ease" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="card-label" style={{ color: "#635bff" }}>PLAYER RECORD & ACHIEVEMENTS</span>
                <button
                  type="button"
                  onClick={() => setSelectedProfilePlayer(null)}
                  style={{ border: 0, background: "none", fontSize: "20px", cursor: "pointer", fontWeight: "bold", color: "#888" }}
                >
                  ✕
                </button>
              </div>

              <div style={{ textAlign: "center", margin: "10px 0 15px" }}>
                {/* 포트레이트 큰 아바타 */}
                <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "80px", height: "80px", borderRadius: "50%", background: selectedProfilePlayer.softColor || "#f1edff", border: "2px solid #635bff", overflow: "hidden" }}>
                  <PlayerIcon icon={selectedProfilePlayer.icon} size={64} style={{ borderRadius: "50%" }} />
                </div>
                <h2 style={{ fontSize: "24px", margin: "10px 0 4px", color: "#2b2b2b" }}>
                  {selectedProfilePlayer.name}
                  {selectedProfilePlayer.isHost && <span style={{ fontSize: "12px", marginLeft: "8px", verticalAlign: "middle", background: "#ece5ff", color: "#7652dd", padding: "2px 8px", borderRadius: "6px" }}>👑 방장</span>}
                </h2>

                {/* 플레이어 전적 및 대표 업적 칭호 */}
                {(() => {
                  const stats = getPlayerRecord(selectedProfilePlayer);
                  return (
                    <>
                      {/* 대표 칭호 태그 */}
                      <div style={{ display: "inline-block", padding: "5px 14px", borderRadius: "99px", background: "#635bff", color: "#ffffff", fontWeight: "bold", fontSize: "13px", marginTop: "4px" }}>
                        {stats.title}
                      </div>

                      {/* 통계 승률 요약 바 */}
                      <div style={{ display: "flex", gap: "10px", margin: "18px 0 14px", background: "#f8f6f0", padding: "12px 16px", borderRadius: "14px", border: "1px solid #e8e2d6" }}>
                        <div style={{ flex: 1, textAlign: "center" }}>
                          <small style={{ color: "#777", fontSize: "11px", display: "block" }}>총 판수</small>
                          <strong style={{ fontSize: "18px", color: "#333" }}>{stats.totalGames}전</strong>
                        </div>
                        <div style={{ width: "1px", background: "#ddd" }} />
                        <div style={{ flex: 1, textAlign: "center" }}>
                          <small style={{ color: "#777", fontSize: "11px", display: "block" }}>전체 승률</small>
                          <strong style={{ fontSize: "18px", color: "#ff4785" }}>{stats.winRate}%</strong>
                        </div>
                      </div>

                      {/* 4가지 전적 세부 2x2 그리드 카드 (시민 승리/마피아 승리/시민 패배/마피아 패배) */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                        <div style={{ padding: "12px 10px", borderRadius: "14px", background: "#cbf7e6", border: "1.5px solid #a3f0d1", textAlign: "center" }}>
                          <span style={{ fontSize: "12px", color: "#059669", fontWeight: "bold", display: "block" }}>🛡️ 시민으로서 승리</span>
                          <b style={{ fontSize: "18px", color: "#047857" }}>{stats.citizenWin}승</b>
                        </div>

                        <div style={{ padding: "12px 10px", borderRadius: "14px", background: "#ffe5ee", border: "1.5px solid #ffb3cc", textAlign: "center" }}>
                          <span style={{ fontSize: "12px", color: "#e11d48", fontWeight: "bold", display: "block" }}>🦊 마피아(라이어) 승리</span>
                          <b style={{ fontSize: "18px", color: "#be123c" }}>{stats.liarWin}승</b>
                        </div>

                        <div style={{ padding: "12px 10px", borderRadius: "14px", background: "#f3f4f6", border: "1.5px solid #e5e7eb", textAlign: "center" }}>
                          <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: "bold", display: "block" }}>💀 시민으로서 패배</span>
                          <b style={{ fontSize: "18px", color: "#4b5563" }}>{stats.citizenLoss}패</b>
                        </div>

                        <div style={{ padding: "12px 10px", borderRadius: "14px", background: "#fef3c7", border: "1.5px solid #fde68a", textAlign: "center" }}>
                          <span style={{ fontSize: "12px", color: "#d97706", fontWeight: "bold", display: "block" }}>🎭 마피아(라이어) 패배</span>
                          <b style={{ fontSize: "18px", color: "#b45309" }}>{stats.liarLoss}패</b>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              <button
                type="button"
                className="primary-button"
                style={{ width: "100%", marginTop: "10px" }}
                onClick={() => setSelectedProfilePlayer(null)}
              >
                닫기 ➔
              </button>
            </div>
          </div>
        )}
      </section>}

      {/* 4. 게임 진행 화면 (Play Screen) */}
      {screen === "play" && <section className="astra-game-shell">
        {/* 전면 블러 카운트다운 & 타이핑 연출 안내 팝업 모달 */}
        {(gamePhase === "countdown" || gamePhase === "notice") && (
          <div className="modal-backdrop" style={{ backdropFilter: "blur(12px)", backgroundColor: "rgba(0,0,0,0.65)", zIndex: 9999 }}>
            {gamePhase === "countdown" ? (
              <div style={{ textAlign: "center", color: "#fff", animation: "popIn 0.3s ease" }}>
                <span className="eyebrow" style={{ color: "#ffb703", fontSize: "18px" }}>GAME STARTING</span>
                <h1 style={{ fontSize: "96px", margin: "10px 0", textShadow: "0 0 20px rgba(255,183,3,0.8)" }}>{countdownNum}</h1>
                <div style={{
                  background: "#fff2f6", border: "2.5px solid #ff4785", borderRadius: "16px", padding: "14px 24px", margin: "15px auto",
                  maxWidth: "420px", color: "#2b2b2b", boxShadow: "0 8px 25px rgba(255,71,133,0.4)"
                }}>
                  <div style={{ fontSize: "13px", fontWeight: "bold", color: "#ff4785", marginBottom: "4px" }}>📌 이번 판 제시어 카테고리 (주제)</div>
                  <div style={{ fontSize: "24px", fontWeight: "900", color: "#635bff" }}>[{secretCategory}]</div>
                </div>
                <p style={{ fontSize: "18px", color: "#eee" }}>곧 게임이 시작됩니다! 나의 소식과 역할을 정독하세요.</p>
              </div>
            ) : (
              <div className="nickname-modal" style={{ maxWidth: "480px", width: "90%", textAlign: "center", border: "3px solid #ffb703", boxShadow: "0 0 30px rgba(255,183,3,0.4)" }}>
                <span className="card-label" style={{ color: "#ffb703" }}>GAME NOTICE</span>
                <div style={{
                  background: "#fff9e6", border: "2px dashed #ffb703", borderRadius: "14px", padding: "12px", margin: "10px 0 16px 0",
                  textAlign: "center"
                }}>
                  <div style={{ fontSize: "12px", fontWeight: "bold", color: "#d97706", marginBottom: "3px" }}>📌 이번 판 제시어 카테고리 (주제)</div>
                  <div style={{ fontSize: "22px", fontWeight: "900", color: "#635bff" }}>[{secretCategory}]</div>
                </div>
                <h2 style={{ fontSize: "18px", margin: "10px 0 15px 0", whiteSpace: "pre-line", minHeight: "60px", lineHeight: "1.5", color: "#2b2b2b" }}>
                  {typedText}
                </h2>
                <div style={{ fontSize: "13px", color: "#666", marginTop: "10px" }}>
                  잠시 후 블러가 해제되고 1번째 플레이어부터 힌트 발언이 시작됩니다.
                </div>
              </div>
            )}
          </div>
        )}

        {/* 자유 토론 시작 전면 블러 안내 팝업 모달 */}
        {gamePhase === "free-talk" && showFreeTalkNotice && (
          <div className="modal-backdrop" style={{ backdropFilter: "blur(12px)", backgroundColor: "rgba(0,0,0,0.65)", zIndex: 9999 }}>
            <div className="nickname-modal" style={{ maxWidth: "480px", width: "90%", textAlign: "center", border: "3px solid #635bff", boxShadow: "0 0 30px rgba(99,91,255,0.4)" }}>
              <span className="card-label" style={{ color: "#635bff" }}>FREE TALK PHASE</span>
              <h2 style={{ fontSize: "26px", margin: "10px 0 15px 0", color: "#2b2b2b" }}>
                💬 자유 토론 시작!
              </h2>
              <p style={{ fontSize: "16px", color: "#555", lineHeight: "1.6" }}>
                모든 플레이어의 힌트 발표가 끝났습니다.<br />
                <b>{discussionTime}초간</b> 제한 없이 자유롭게 대화하며 라이어를 찾아내세요!
              </p>
            </div>
          </div>
        )}

        {/* 매 플레이어 힌트 턴 전환 전면 블러 안내 팝업 모달 */}
        {speakerTurnNotice && (
          <div className="modal-backdrop" style={{ backdropFilter: "blur(12px)", backgroundColor: "rgba(0,0,0,0.65)", zIndex: 9999 }}>
            <div className="nickname-modal" style={{ maxWidth: "460px", width: "90%", textAlign: "center", border: "3px solid #ff4785", boxShadow: "0 0 35px rgba(255,71,133,0.5)", animation: "popIn 0.3s ease" }}>
              <span className="card-label" style={{ color: "#ff4785" }}>HINT SPEAKER TURN</span>
              <div style={{ margin: "12px 0", display: "flex", justifyContent: "center" }}>
                <PlayerIcon icon={speakerTurnNotice.icon} size={64} style={{ borderRadius: "16px" }} />
              </div>
              <h2 style={{ fontSize: "24px", margin: "5px 0 12px 0", color: "#2b2b2b" }}>
                📢 <span style={{ color: "#ff4785" }}>[{speakerTurnNotice.name}]</span> 님의 발언 차례!
              </h2>
              <p style={{ fontSize: "15px", color: "#555", lineHeight: "1.5" }}>
                제한시간 <b>{speakerTurnNotice.timeSec}초</b> 동안 힌트를 발표해 주세요.
              </p>
            </div>
          </div>
        )}

        {/* 1차 라이어 지목 투표 제출 모달 */}
        {gamePhase === "vote" && (
          <div className="modal-backdrop" style={{ zIndex: 9980 }}>
            <div className="nickname-modal" style={{ maxWidth: "460px", width: "90%" }}>
              <span className="card-label">LIAR VOTE PHASE</span>
              <h2>🗳️ 라이어 지목 투표</h2>
              <p style={{ fontSize: "13px", color: "#666", marginBottom: "15px" }}>의심스러운 라이어 1명을 지목해 주세요!</p>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px", margin: "15px 0", maxHeight: "220px", overflowY: "auto" }}>
                {onlinePlayers.map((player) => (
                  <button
                    key={`vote-choice-${player.socketId}`}
                    onClick={() => setSelectedVoteTarget(player.socketId)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "12px 16px",
                      borderRadius: "14px",
                      border: selectedVoteTarget === player.socketId ? "2px solid #ff4785" : "1px solid #ddd",
                      background: selectedVoteTarget === player.socketId ? "#ffe5ee" : "#fff",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    <div style={{ width: "28px", height: "28px", display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "8px", overflow: "hidden" }}>
                      <PlayerIcon icon={player.icon} size={28} />
                    </div>
                    <span style={{ fontWeight: "bold", fontSize: "14px", flex: 1, textAlign: "left", color: "#2b2b2b" }}>{player.name}</span>
                    {selectedVoteTarget === player.socketId && <b style={{ color: "#ff4785" }}>선택됨</b>}
                  </button>
                ))}
              </div>

              <button
                className="primary-button"
                style={{ width: "100%", marginTop: "10px" }}
                disabled={!selectedVoteTarget || hasVoted}
                onClick={() => {
                  socket.emit("submit-vote", { targetSocketId: selectedVoteTarget });
                  setHasVoted(true);
                }}
              >
                {hasVoted ? "투표 완료! (다른 참가자 투표 대기 중...)" : "투표 제출하기 ➔"}
              </button>
            </div>
          </div>
        )}

        {/* 상세 투표 결과 표 모달 */}
        {gamePhase === "vote-result" && voteTallyData && (
          <div className="modal-backdrop" style={{ zIndex: 9900 }}>
            <div className="nickname-modal" style={{ maxWidth: "520px", width: "90%" }}>
              <span className="card-label">VOTE RESULT TALLY</span>
              <h2>🗳️ 상세 투표 결과 표</h2>
              <p style={{ fontSize: "13px", color: "#666", marginBottom: "15px" }}>누가 몇 표를 받았고, 누가 누구를 지목했는지 공개됩니다.</p>
              
              {/* 득표현황 바 그래프 */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", margin: "15px 0" }}>
                {Object.entries(voteTallyData.tally).map(([targetId, count]) => {
                  const targetPlayer = onlinePlayers.find(p => p.socketId === targetId);
                  return (
                    <div key={targetId} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ width: "80px", fontWeight: "bold", fontSize: "13px" }}>{targetPlayer?.name || "참여자"}</span>
                      <div style={{ flex: 1, height: "14px", background: "#eee", borderRadius: "7px", overflow: "hidden" }}>
                        <div style={{ width: `${(count / onlinePlayers.length) * 100}%`, height: "100%", background: "#ff4785" }} />
                      </div>
                      <span style={{ fontWeight: "bold", color: "#ff4785" }}>{count}표</span>
                    </div>
                  );
                })}
              </div>

              <div style={{ borderTop: "1px dashed #ddd", paddingTop: "10px", marginTop: "10px" }}>
                <small style={{ fontWeight: "bold" }}>📋 상세 지목 표:</small>
                <div style={{ maxHeight: "120px", overflowY: "auto", fontSize: "12px", color: "#444", marginTop: "5px" }}>
                  {voteTallyData.voteDetails.map((detail, idx) => (
                    <div key={idx} style={{ padding: "3px 0" }}>
                      <b>{detail.voterName}</b> ➔ 👉 <b>{detail.targetName}</b> 지목
                    </div>
                  ))}
                </div>
              </div>

              <p style={{ fontSize: "13px", color: "#999", marginTop: "15px" }}>⬇️ 3초 후 자동으로 다음 단계로 넘어갑니다...</p>
            </div>
          </div>
        )}

        {/* 룰렛 (생존 / 사면 / 단죄) 회전 애니메이션 모달 */}
        {gamePhase === "roulette" && rouletteData && (
          <div className="modal-backdrop" style={{ zIndex: 9950 }}>
            <div className="nickname-modal" style={{ textAlign: "center" }}>
              <span className="card-label">🎰 ROULETTE DECISION</span>
              <h2>{rouletteData.rouletteType === "survival" ? "🎰 生存 룰렛" : rouletteData.rouletteType === "amnesty" ? "🎰 사면 룰렛" : "🎰 단죄 룰렛"}</h2>
              <p>{isRouletteSpinning ? "동률/부족 상황 해결을 위해 룰렛 회전 중..." : "룰렛 추첨 결과가 발표되었습니다!"}</p>

              {/* 룰렛 회전 연출 박스 */}
              <div style={{ margin: "25px 0", padding: "20px", background: "#f8f6f0", borderRadius: "16px", border: "2px solid #e8e2d6" }}>
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60px", transform: isRouletteSpinning ? "scale(1.2)" : "scale(1)", transition: "all 0.2s" }}>
                  {isRouletteSpinning ? (
                    <span style={{ fontSize: "54px" }}>🌀</span>
                  ) : (
                    <div style={{ width: "60px", height: "60px", borderRadius: "14px", overflow: "hidden", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                      <PlayerIcon icon={rouletteData.chosenPlayer?.icon || "🎯"} size={60} />
                    </div>
                  )}
                </div>
                <h3 style={{ fontSize: "22px", margin: "10px 0", color: isRouletteSpinning ? "#999" : "#ff4785" }}>
                  {isRouletteSpinning ? "두구두구..." : rouletteData.chosenPlayer?.name}
                </h3>
                <span style={{ fontSize: "13px", fontWeight: "bold", color: "#666" }}>
                  {!isRouletteSpinning && (rouletteData.rouletteType === "condemn" ? "🚨 라이어로 결정되었습니다!" : "✨ 사면되었습니다 (살아남음)!")}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── 최후변론 / 자기 변호 / 남길말 차례 안내 모달 (showPostVoteNotice 제어) ── */}
        {showPostVoteNotice && (gamePhase === "final-defense" || gamePhase === "self-defense" || gamePhase === "post-vote-free-talk" || gamePhase === "last-words") && (
          <div className="modal-backdrop" style={{ backdropFilter: "blur(12px)", backgroundColor: "rgba(0,0,0,0.65)", zIndex: 9999 }}>
            <div className="nickname-modal" style={{
              maxWidth: "460px", width: "90%", textAlign: "center",
              border: `3px solid ${gamePhase === "final-defense" || gamePhase === "last-words" ? "#ff4785" : gamePhase === "self-defense" ? "#f5b300" : "#635bff"}`,
              boxShadow: `0 0 35px ${gamePhase === "final-defense" || gamePhase === "last-words" ? "rgba(255,71,133,0.5)" : gamePhase === "self-defense" ? "rgba(245,179,0,0.5)" : "rgba(99,91,255,0.4)"}`,
              animation: "popIn 0.3s ease",
            }}>
              <span className="card-label" style={{ color: gamePhase === "final-defense" || gamePhase === "last-words" ? "#ff4785" : gamePhase === "self-defense" ? "#f5b300" : "#635bff" }}>
                {gamePhase === "final-defense" ? "FINAL DEFENSE" : gamePhase === "self-defense" ? "SELF DEFENSE" : gamePhase === "last-words" ? "LAST WORDS" : "FREE TALK PHASE"}
              </span>
              {/* 발언자 아이콘 (최후변론/자기변호/남길말 시) */}
              {(gamePhase === "final-defense" || gamePhase === "self-defense" || gamePhase === "last-words") && (
                <div style={{ margin: "12px 0", display: "flex", justifyContent: "center" }}>
                  <div style={{ width: "64px", height: "64px", borderRadius: "16px", overflow: "hidden", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                    <PlayerIcon icon={onlinePlayers.find(p => p.socketId === turnSpeakerSocketId)?.icon || portraits[0]} size={64} />
                  </div>
                </div>
              )}
              <h2 style={{ fontSize: "24px", margin: "5px 0 12px 0", color: "#2b2b2b" }}>
                {gamePhase === "final-defense" && (
                  <>⚖️ <span style={{ color: "#ff4785" }}>[{onlinePlayers.find(p => p.socketId === turnSpeakerSocketId)?.name || "참여자"}]</span> 님의 최후변론!</>
                )}
                {gamePhase === "self-defense" && (
                  <>🎤 <span style={{ color: "#f5b300" }}>[{onlinePlayers.find(p => p.socketId === turnSpeakerSocketId)?.name || "참여자"}]</span> 님의 자기 변호!</>
                )}
                {gamePhase === "last-words" && (
                  <>💬 <span style={{ color: "#ff4785" }}>[{onlinePlayers.find(p => p.socketId === turnSpeakerSocketId)?.name || "참여자"}]</span> 님의 남길 말!</>
                )}
                {gamePhase === "post-vote-free-talk" && "💬 자유토론 시작!"}
              </h2>
              <p style={{ fontSize: "15px", color: "#555", lineHeight: "1.5" }}>
                {gamePhase === "post-vote-free-talk"
                  ? <>최다 득표자를 제외한 전원이 <b>10초간</b> 자유롭게 대화할 수 있습니다.</>
                  : gamePhase === "last-words"
                  ? <>제한시간 <b>5초</b> 동안 마지막으로 한 마디 남겨주세요!</>
                  : <>제한시간 <b>7초</b> 동안 변론해 주세요.</>
                }
              </p>
            </div>
          </div>
        )}

        {/* ── 80% 무죄 구제 전면 블러 안내 모달 (5초 명확 노출 및 높은 최상단 zIndex 99999) ── */}
        {innocentClearedNotice && (
          <div className="modal-backdrop" style={{ backdropFilter: "blur(16px)", backgroundColor: "rgba(0,0,0,0.8)", zIndex: 99999 }}>
            <div className="nickname-modal" style={{
              maxWidth: "500px", width: "90%", textAlign: "center",
              border: "3px solid #10b981", boxShadow: "0 0 50px rgba(16,185,129,0.7)",
              animation: "popIn 0.3s ease",
            }}>
              <span className="card-label" style={{ color: "#10b981" }}>✨ INNOCENT CLEARED</span>
              <div style={{ margin: "14px 0", display: "flex", justifyContent: "center" }}>
                <div style={{ width: "64px", height: "64px", borderRadius: "16px", overflow: "hidden", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  <PlayerIcon icon={innocentClearedNotice.targetIcon} size={64} />
                </div>
              </div>
              <h2 style={{ fontSize: "22px", margin: "8px 0 14px 0", color: "#10b981", lineHeight: "1.4" }}>
                80퍼센트 이상이 <span style={{ color: "#ff4785" }}>[{innocentClearedNotice.targetName}]</span> 님의 무죄를 인정하여 2라운드가 진행됩니다!
              </h2>
              <p style={{ fontSize: "14px", color: "#666" }}>
                무죄 찬성률: <b>{innocentClearedNotice.innocentPercent?.toFixed(0)}%</b> (구제 성공)
              </p>
              <div style={{ marginTop: "18px", padding: "12px", borderRadius: "12px", background: "#cbf7e6", color: "#059669", fontWeight: "bold", fontSize: "14px" }}>
                🔄 5초 후 2라운드 힌트 발표(각 6초)가 시작됩니다.
              </div>
            </div>
          </div>
        )}

        {/* ── 최종 결정 (유죄/무죄) 투표 모달 ── */}
        {gamePhase === "final-decision" && finalDecisionTarget && (
          <div className="modal-backdrop" style={{ zIndex: 9980 }}>
            <div className="nickname-modal" style={{ maxWidth: "460px", width: "90%", border: "3px solid #10b981", boxShadow: "0 0 30px rgba(16,185,129,0.4)" }}>
              <span className="card-label" style={{ color: "#10b981" }}>FINAL DECISION</span>
              <div style={{ margin: "10px 0", display: "flex", justifyContent: "center" }}>
                <div style={{ width: "60px", height: "60px", borderRadius: "16px", overflow: "hidden", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  <PlayerIcon icon={finalDecisionTarget.icon} size={60} />
                </div>
              </div>
              <h2 style={{ fontSize: "20px", margin: "5px 0 10px 0", color: "#2b2b2b" }}>
                🗳️ <span style={{ color: "#ff4785" }}>[{finalDecisionTarget.name}]</span>은(는) 라이어인가요?
              </h2>
              <p style={{ fontSize: "13px", color: "#666", marginBottom: "15px" }}>80% 이상이 무죄로 판단해야 구제(2라운드)됩니다.</p>

              {/* 유죄/무죄 선택 버튼 */}
              {(() => {
                const myId = socket.id || myPlayerInfo?.socketId;
                const isTarget = myId === finalDecisionTarget.socketId;
                if (isTarget) return <p style={{ color: "#999", fontStyle: "italic" }}>🔒 본인은 투표할 수 없습니다.</p>;
                return (
                  <>
                    <div style={{ display: "flex", gap: "10px", margin: "15px 0" }}>
                      <button
                        onClick={() => setSelectedFinalDecision("guilty")}
                        style={{
                          flex: 1, padding: "14px", borderRadius: "14px", cursor: "pointer", fontWeight: "bold", fontSize: "15px", transition: "all 0.2s",
                          border: selectedFinalDecision === "guilty" ? "3px solid #ff4785" : "1px solid #ddd",
                          background: selectedFinalDecision === "guilty" ? "#ffe5ee" : "#fff",
                          color: selectedFinalDecision === "guilty" ? "#ff4785" : "#333",
                        }}
                      >
                        🚨 유죄<br/><small>라이어로 지목</small>
                      </button>
                      <button
                        onClick={() => setSelectedFinalDecision("innocent")}
                        style={{
                          flex: 1, padding: "14px", borderRadius: "14px", cursor: "pointer", fontWeight: "bold", fontSize: "15px", transition: "all 0.2s",
                          border: selectedFinalDecision === "innocent" ? "3px solid #10b981" : "1px solid #ddd",
                          background: selectedFinalDecision === "innocent" ? "#cbf7e6" : "#fff",
                          color: selectedFinalDecision === "innocent" ? "#059669" : "#333",
                        }}
                      >
                        ✅ 무죄<br/><small>2라운드 진행</small>
                      </button>
                    </div>
                    <button
                      className="primary-button"
                      style={{ width: "100%" }}
                      disabled={!selectedFinalDecision || hasFinalVoted}
                      onClick={() => {
                        socket.emit("submit-final-decision", { decision: selectedFinalDecision });
                        setHasFinalVoted(true);
                      }}
                    >
                      {hasFinalVoted ? "투표 완료! (다른 참가자 투표 대기 중...)" : "투표 제출하기 ➜"}
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* ── 최종 결정 결과 모달 (유죄 확정 시에만 표시) ── */}
        {finalDecisionResult && !finalDecisionResult.isInnocent && !innocentClearedNotice && (gamePhase === "final-decision" || gamePhase === "post-vote-free-talk" || gamePhase === "self-defense" || gamePhase === "final-defense") && (
          <div className="modal-backdrop" style={{ zIndex: 9970 }}>
            <div className="nickname-modal" style={{
              maxWidth: "480px", width: "90%", textAlign: "center",
              border: `3px solid ${finalDecisionResult.isInnocent ? "#10b981" : "#ff4785"}`,
              boxShadow: `0 0 30px ${finalDecisionResult.isInnocent ? "rgba(16,185,129,0.4)" : "rgba(255,71,133,0.4)"}`,
            }}>
              <span className="card-label" style={{ color: finalDecisionResult.isInnocent ? "#10b981" : "#ff4785" }}>
                {finalDecisionResult.isInnocent ? "INNOCENT - ROUND 2" : "GUILTY VERDICT"}
              </span>
              <div style={{ margin: "10px 0", display: "flex", justifyContent: "center" }}>
                <div style={{ width: "60px", height: "60px", borderRadius: "16px", overflow: "hidden", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  <PlayerIcon icon={finalDecisionResult.targetIcon} size={60} />
                </div>
              </div>
              <h2 style={{ fontSize: "22px", margin: "5px 0 12px 0", color: "#2b2b2b" }}>
                [{finalDecisionResult.targetName}] 판정 결과
              </h2>
              <div style={{ display: "flex", justifyContent: "center", gap: "20px", margin: "15px 0", fontSize: "18px", fontWeight: "bold" }}>
                <span style={{ color: "#ff4785" }}>🚨 유죄: {finalDecisionResult.guiltyCount}표</span>
                <span style={{ color: "#10b981" }}>✅ 무죄: {finalDecisionResult.innocentCount}표</span>
              </div>
              <p style={{ fontSize: "14px", color: "#666" }}>
                무죄 비율: <b>{finalDecisionResult.innocentPercent?.toFixed(0)}%</b> / 필요: 80%
              </p>
              <h3 style={{
                fontSize: "20px", marginTop: "15px", padding: "12px", borderRadius: "12px",
                background: finalDecisionResult.isInnocent ? "#cbf7e6" : "#ffe5ee",
                color: finalDecisionResult.isInnocent ? "#059669" : "#ff4785",
              }}>
                {finalDecisionResult.isInnocent
                  ? "✅ 구제! 2라운드로 진행합니다."
                  : "🚨 유죄 확정! 라이어로 지목됩니다."
                }
              </h3>
              <p style={{ fontSize: "12px", color: "#999", marginTop: "10px" }}>잠시 후 자동으로 다음 단계로 넘어갑니다...</p>
            </div>
          </div>
        )}

        {/* ── 재투표 모달 (re-vote) ── */}
        {gamePhase === "re-vote" && reVoteCandidates.length > 0 && (
          <div className="modal-backdrop" style={{ zIndex: 9980 }}>
            <div className="nickname-modal" style={{ maxWidth: "460px", width: "90%", border: "3px solid #ff6f3c", boxShadow: "0 0 30px rgba(255,111,60,0.4)" }}>
              <span className="card-label" style={{ color: "#ff6f3c" }}>RE-VOTE PHASE</span>
              <h2 style={{ fontSize: "20px", margin: "10px 0" }}>🗳️ 재투표</h2>
              <p style={{ fontSize: "13px", color: "#666", marginBottom: "15px" }}>공동 최다 득표자 중 1명을 선택해 주세요!</p>

              {(() => {
                const myId = socket.id || myPlayerInfo?.socketId;
                const isCandidate = reVoteCandidates.includes(myId || "");
                if (isCandidate) return <p style={{ color: "#999", fontStyle: "italic" }}>🔒 공동 최다 득표자는 투표할 수 없습니다.</p>;
                return (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", margin: "10px 0", maxHeight: "200px", overflowY: "auto" }}>
                      {reVoteCandidates.map(candidateId => {
                        const player = onlinePlayers.find(p => p.socketId === candidateId);
                        return (
                          <button
                            key={candidateId}
                            onClick={() => setSelectedReVoteTarget(candidateId)}
                            style={{
                              display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px",
                              borderRadius: "14px", cursor: "pointer", transition: "all 0.2s",
                              border: selectedReVoteTarget === candidateId ? "2px solid #ff6f3c" : "1px solid #ddd",
                              background: selectedReVoteTarget === candidateId ? "#ffe3d1" : "#fff",
                            }}
                          >
                            <div style={{ width: "28px", height: "28px", display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "8px", overflow: "hidden" }}>
                              <PlayerIcon icon={player?.icon || portraits[0]} size={28} />
                            </div>
                            <span style={{ fontWeight: "bold", fontSize: "14px", flex: 1, textAlign: "left", color: "#2b2b2b" }}>{player?.name || "참여자"}</span>
                            {selectedReVoteTarget === candidateId && <b style={{ color: "#ff6f3c" }}>선택됨</b>}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      className="primary-button"
                      style={{ width: "100%", marginTop: "10px" }}
                      disabled={!selectedReVoteTarget || hasReVoted}
                      onClick={() => {
                        socket.emit("submit-re-vote", { targetSocketId: selectedReVoteTarget });
                        setHasReVoted(true);
                      }}
                    >
                      {hasReVoted ? "투표 완료! (대기 중...)" : "재투표 제출하기 ➜"}
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* ── 게임 결과 모달 (result) ── */}
        {gamePhase === "result" && gameResultData && (
          <div className="modal-backdrop" style={{ zIndex: 9990 }}>
            <div className="nickname-modal" style={{
              maxWidth: "500px", width: "90%", textAlign: "center",
              border: `3px solid ${gameResultData.citizenWin ? "#10b981" : "#ff4785"}`,
              boxShadow: `0 0 40px ${gameResultData.citizenWin ? "rgba(16,185,129,0.5)" : "rgba(255,71,133,0.5)"}`,
            }}>
              <span className="card-label" style={{ color: gameResultData.citizenWin ? "#10b981" : "#ff4785" }}>GAME RESULT</span>
              <h1 style={{ fontSize: "32px", margin: "15px 0", color: gameResultData.citizenWin ? "#059669" : "#ff4785" }}>
                {gameResultData.citizenWin ? "🏆 시민 팀 승리!" : "😈 라이어 승리!"}
              </h1>
              <div style={{ margin: "12px 0", display: "flex", justifyContent: "center" }}>
                <div style={{ width: "64px", height: "64px", borderRadius: "16px", overflow: "hidden", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  <PlayerIcon icon={gameResultData.targetIcon} size={64} />
                </div>
              </div>
              <p style={{ fontSize: "18px", fontWeight: "bold", color: "#2b2b2b" }}>
                [{gameResultData.targetName}]은(는) {gameResultData.isActualLiar ? "라이어였습니다!" : "라이어가 아니었습니다!"}
              </p>
              
              {/* 🔑 제시어 및 라이어 다른 제시어 공개 카드 */}
              {gameResultData.realWord && (
                <div style={{ margin: "14px 0", padding: "12px 16px", borderRadius: "12px", background: "#f5f0ff", border: "2px dashed #7652dd", textAlign: "left" }}>
                  <p style={{ margin: "0 0 6px 0", fontSize: "14px", color: "#4338ca", fontWeight: "bold" }}>
                    🔑 진짜 제시어: <span style={{ color: "#635bff", fontSize: "16px" }}>[{gameResultData.realWord}]</span>
                  </p>
                  {gameResultData.gameMode === "fool" && gameResultData.liarWord && (
                    <p style={{ margin: 0, fontSize: "14px", color: "#ff4785", fontWeight: "bold" }}>
                      🤪 라이어가 받은 제시어: <span style={{ color: "#ff4785", fontSize: "16px" }}>[{gameResultData.liarWord}]</span>
                    </p>
                  )}
                </div>
              )}

              {gameResultData.liarNames && (
                <p style={{ fontSize: "14px", color: "#666", marginTop: "8px" }}>
                  진짜 라이어: <b>{gameResultData.liarNames.join(", ")}</b>
                </p>
              )}
              <button className="primary-button" style={{ marginTop: "20px" }} onClick={() => {
                setGamePhase("waiting");
                setScreen("room");
                setGameResultData(null);
                setFinalDecisionResult(null);
                setChatLog([]);
                setUserSpeechMap({});
              }}>
                대기실로 돌아가기 ➜
              </button>
            </div>
          </div>
        )}


        <div className="astra-game-canvas">
          <main className="astra-game-board">
            {/* 상단 플레이어 줄 */}
            <div className="astra-portrait-row" style={{ filter: isNoticeDimmed ? "grayscale(70%) opacity(0.4)" : "none", transition: "all 0.3s" }}>
              {onlinePlayers.slice(0, 6).map((player) => {
                const isSpeaker = userSpeechMap[player.socketId];
                const isTurnSpeaker = gamePhase === "hint-turn" && player.socketId === turnSpeakerSocketId;
                const isEliminated = eliminatedSocketIds.includes(player.socketId);
                const stains = playerStainsMap[player.socketId] || [];
                const hitBadge = hitBadgeMap[player.socketId];

                return (
                  <div
                    className="astra-player-card"
                    key={`top-${player.socketId || player.name}`}
                    data-socket-id={player.socketId}
                    data-player-name={player.name}
                    onClick={() => {
                      if (player.socketId !== (socket.id || myPlayerInfo?.socketId)) {
                        setItemTargetPlayer(player);
                      }
                    }}
                    style={{
                      backgroundColor: isEliminated ? "#dcdcdc" : player.softColor,
                      borderColor: isTurnSpeaker ? "#ff4785" : player.color,
                      boxShadow: isTurnSpeaker ? "0 0 12px #ff4785" : "none",
                      filter: isEliminated ? "grayscale(100%) opacity(0.5)" : "none",
                    }}
                  >
                    {/* 마우스 호버 시 노출되는 [💡 Hint] 뱃지 */}
                    <button
                      type="button"
                      className="hint-badge-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedHintPlayer(player);
                      }}
                    >
                      💡 Hint
                    </button>

                    {/* 충돌 시 머리 위에 떠오르는 [🎯 던진 사람: 🦊 닉네임] 표식 */}
                    {hitBadge && (
                      <div className="throw-hit-sender-badge">
                        🎯 던진 사람: <PlayerIcon icon={hitBadge.senderIcon} size={16} /> {hitBadge.senderName}
                      </div>
                    )}

                    {/* 캐릭터 지속 오염 자국 Stain Overlay */}
                    <div className="stain-overlay-container">
                      {stains.map((stain) => (
                        <span
                          key={stain.id}
                          className="stain-item"
                          style={{
                            left: `${stain.x}%`,
                            top: `${stain.y}%`,
                            transform: `rotate(${stain.rotate}deg)`,
                          }}
                        >
                          <img
                            src={`/items/broken_${stain.type.toLowerCase()}.png`}
                            alt={stain.type}
                            style={{ width: "54px", height: "54px", objectFit: "contain", filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))" }}
                          />
                        </span>
                      ))}
                    </div>

                    <div className="astra-avatar-wrap">
                      <Avatar type="initial" initials={player.icon} size="large" shape="square" />
                    </div>
                    <span className="text-label-sm text-text-primary">
                      {player.name} {isEliminated && "(탈락)"}
                    </span>
                    {/* 발언자 본인 캐릭터 카드 위에만 말풍선 표시 */}
                    {isSpeaker && (
                      <div className="astra-speech-bubble">{isSpeaker}</div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* 중앙 대화 & 제시어 기록 패널 */}
            <section className="astra-log-panel">
              <div className="astra-log-header">
                <div className="text-title text-text-primary">▣ 대화 기록</div>
                {/* 턴 이동 시 진행자 통제 타이핑 알림 띠 */}
                {turnNoticeText && (
                  <div style={{ background: "#635bff", color: "#fff", padding: "4px 12px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold" }}>
                    {turnNoticeText}
                  </div>
                )}
                {/* 대화 기록 우측 밀착 배치된 비밀 제시어 상자 (초기 블러 시 z-index 10005로 뚫리는 스포트라이트 연출) */}
                {(() => {
                  const isSpotlight = gamePhase === "countdown" || gamePhase === "notice";
                  return (
                    <div
                      className="astra-secret-hover secret-border-blink"
                      style={{
                        position: "relative",
                        zIndex: isSpotlight ? 10005 : 1,
                        boxShadow: isSpotlight ? "0 0 35px #ff4785, 0 0 70px rgba(255,71,133,0.6)" : "none",
                        transform: isSpotlight ? "scale(1.08)" : "scale(1)",
                        transition: "all 0.4s ease",
                        background: isLiar ? "#ffe0e0" : "#ffffff",
                      }}
                    >
                      <span className="text-label-xs text-text-secondary">
                        마우스를 올려 제시어 확인
                      </span>
                      <span className="astra-secret-word text-label-sm" style={isLiar ? { background: "#ff4785" } : undefined}>
                        {secretWord}
                      </span>
                    </div>
                  );
                })()}
              </div>
              <div className="astra-log-body">
                <div className="astra-prompt-pane">
                  {/* 포트레이트, 닉네임, 메시지, 시간이 가로 한 줄(1열)로 출력되는 콤팩트 채팅 리스트 */}
                  <div className="astra-message-list" ref={messageListRef}>
                    {chatLog.map((entry, index) => (
                      <div className="astra-message" key={`astra-log-${entry.text}-${index}`}>
                        {/* 채팅 메시지 옆 아바타 아이콘 (작은 원형 스타일 적용) */}
                        <Avatar type="initial" initials="💬" size="small" shape="circle" />
                        <span className="astra-message-name">{entry.text.split(':')[0]}</span>
                        <span className="astra-message-text" style={entry.text.includes("[시스템]") ? { fontWeight: "bold", color: "#635bff" } : undefined}>{entry.text.split(':')[1] || entry.text}</span>
                        <span className="astra-message-time">{entry.time}</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* 게임 내 입력 창 (Strict Turn 제어 & 탈락자 입력 제한 & 투표 후 플로우 채팅 제어) */}
                  {(() => {
                    const myId = socket.id || myPlayerInfo?.socketId;
                    const isEliminated = eliminatedSocketIds.includes(myId || "");
                    const isMyTurn = gamePhase === "hint-turn" && turnSpeakerSocketId === myId;

                    // 최후변론/자기변호: 현재 발언자만 채팅 가능
                    const isDefenseSpeaker = (gamePhase === "final-defense" || gamePhase === "self-defense") && turnSpeakerSocketId === myId;

                    // 투표 후 자유토론: 최다 득표자(들) 제외한 나머지만 채팅 가능
                    const isPostVoteExcluded = gamePhase === "post-vote-free-talk" && postVoteExcludedIds.includes(myId || "");
                    const isPostVoteFreeTalkAllowed = gamePhase === "post-vote-free-talk" && !isPostVoteExcluded;

                    const canChat = !isEliminated && (
                      gamePhase === "free-talk" ||
                      isMyTurn ||
                      isDefenseSpeaker ||
                      isPostVoteFreeTalkAllowed
                    );
                    const speakerName = onlinePlayers.find(p => p.socketId === turnSpeakerSocketId)?.name || "발언자";

                    return (
                      <div className="astra-inline-composer" style={{ opacity: canChat ? 1 : 0.6 }}>
                        <textarea
                          value={chatMessage}
                          onChange={(event) => setChatMessage(event.target.value)}
                          onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && canChat) { event.preventDefault(); sendChat(); } }}
                          placeholder={
                            isEliminated
                              ? "🔒 탈락하여 관전 모드입니다 (채팅 불가)."
                              : canChat
                              ? (gamePhase === "final-defense" || gamePhase === "self-defense")
                                ? "변론 메시지를 입력하세요..."
                                : "메시지를 입력하세요..."
                              : (gamePhase === "final-defense" || gamePhase === "self-defense")
                              ? `🔒 [${speakerName}] 님이 변론 중입니다. 발언할 수 없습니다.`
                              : isPostVoteExcluded
                              ? "🔒 최다 득표자는 자유토론에 참여할 수 없습니다."
                              : `🔒 현재 [${speakerName}] 님이 발언 중입니다. 순서를 기다려주세요.`
                          }
                          disabled={!canChat}
                          rows={1}
                        />
                        <button type="button" onClick={sendChat} disabled={!canChat || !chatMessage.trim()}>전송</button>
                      </div>
                    );
                  })()}
                </div>

                {/* 현재 발언자 라이브 패널 & [발언 완료] 버튼 */}
                <aside className="astra-live-panel" style={{ filter: isNoticeDimmed ? "grayscale(70%) opacity(0.4)" : "none", transition: "all 0.3s" }}>
                  <span className="card-label">LIVE TURN</span>
                  {(() => {
                    const myId = socket.id || myPlayerInfo?.socketId;
                    const isFreeTalk = gamePhase === "free-talk" || gamePhase === "post-vote-free-talk";
                    const isFinalDefense = gamePhase === "final-defense";
                    const isSelfDefense = gamePhase === "self-defense";
                    const isDefensePhase = isFinalDefense || isSelfDefense;
                    const currentSpeaker = onlinePlayers.find(p => p.socketId === turnSpeakerSocketId) || onlinePlayers[0];
                    const isMyTurn = gamePhase === "hint-turn" && turnSpeakerSocketId === myId;

                    return (
                      <>
                        <div className="live-avatar">
                          <Avatar type="initial" initials={isFreeTalk ? "💬" : isDefensePhase ? "⚖️" : (currentSpeaker?.icon || "🦊")} size="large" shape="square" />
                        </div>
                        <strong>
                          {isFreeTalk ? "전원 자유 대화"
                           : isDefensePhase ? (currentSpeaker?.name || "참여자")
                           : (currentSpeaker?.name || "참여자")}
                        </strong>
                        <span className="live-speaking" style={
                          isFreeTalk ? { background: "#ffe5ee", color: "#ff4785" }
                          : isFinalDefense ? { background: "#ffe5ee", color: "#ff4785" }
                          : isSelfDefense ? { background: "#fff2c4", color: "#f5b300" }
                          : undefined
                        }>
                          <i />
                          {isFreeTalk ? "🗣️ 자유 토론 중"
                           : isFinalDefense ? "⚖️ 최후변론 중"
                           : isSelfDefense ? "🎤 자기 변호 중"
                           : "🎙️ 힌트 발언 중"}
                        </span>
                        <div className="live-clock">00:{String(turnTimeLeft).padStart(2, "0")}</div>
                        <small>
                          {isFreeTalk ? "자유 토론 남은 시간"
                           : isDefensePhase ? "변론 남은 시간"
                           : "남은 발언 시간"}
                        </small>

                        {/* 1) 힌트 턴 시 발언권 본인 전용 [발언 완료] 버튼 */}
                        {gamePhase === "hint-turn" && isMyTurn && (
                          <button
                            type="button"
                            className="primary-button small"
                            style={{ marginTop: "10px", background: "#10b981", borderColor: "#059669", boxShadow: "0 0 12px rgba(16,185,129,0.4)" }}
                            onClick={handleTurnPass}
                          >
                            발언 완료 ➔
                          </button>
                        )}

                        {/* 2) 최후변론 / 자기변호 시 현재 발언자 전용 [변론 완료] 버튼 */}
                        {isDefensePhase && turnSpeakerSocketId === myId && (
                          <button
                            type="button"
                            className="primary-button small"
                            style={{ marginTop: "10px", background: "#ff4785", borderColor: "#e0316e", boxShadow: "0 0 12px rgba(255,71,133,0.5)" }}
                            onClick={handlePassDefense}
                          >
                            ⚖️ 변론 완료 ➔
                          </button>
                        )}

                        {/* 3) 자유토론 / 투표 후 자유토론 시 100% 만장일치 조기종료 투표 UI */}
                        {isFreeTalk && (() => {
                          const isPostVoteFreeTalk = gamePhase === "post-vote-free-talk";
                          const isExcluded = isPostVoteFreeTalk && postVoteExcludedIds.includes(myId || "");
                          const isEliminated = eliminatedSocketIds.includes(myId || "");

                          if (isExcluded) {
                            return (
                              <p style={{ marginTop: "10px", fontSize: "11px", color: "#888", fontWeight: "bold" }}>
                                🔒 최다 득표자는 토론에 참여할 수 없습니다.
                              </p>
                            );
                          }
                          if (isEliminated) {
                            return (
                              <p style={{ marginTop: "10px", fontSize: "11px", color: "#888" }}>
                                🔒 탈락자는 토론 조기종료에 참여할 수 없습니다.
                              </p>
                            );
                          }

                          // 활성 유효 인원 계산
                          const activeCount = onlinePlayers.length - eliminatedSocketIds.length;
                          const effectiveTotal = isPostVoteFreeTalk
                            ? Math.max(1, activeCount - postVoteExcludedIds.length)
                            : Math.max(1, activeCount);

                          const skipCount = discussionSkipData?.skipCount || 0;
                          const totalCount = discussionSkipData?.totalCount || effectiveTotal;
                          const hasAgreed = Boolean(discussionSkipData?.voterSocketIds?.includes(myId || ""));
                          const percent = Math.min(100, Math.round((skipCount / Math.max(1, totalCount)) * 100));

                          return (
                            <div style={{ width: "100%", marginTop: "10px" }}>
                              {/* 실시간 동의율 프로그레스 바 */}
                              <div style={{ width: "100%", height: "6px", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden", marginBottom: "6px" }}>
                                <div
                                  style={{
                                    width: `${percent}%`,
                                    height: "100%",
                                    background: hasAgreed ? "#10b981" : "#635bff",
                                    transition: "width 0.3s ease",
                                  }}
                                />
                              </div>

                              {/* 조기 종료 토글 버튼 */}
                              <button
                                type="button"
                                onClick={handleToggleSkipDiscussion}
                                style={{
                                  width: "100%",
                                  padding: "8px 10px",
                                  borderRadius: "10px",
                                  fontSize: "12px",
                                  fontWeight: "bold",
                                  cursor: "pointer",
                                  transition: "all 0.2s ease",
                                  border: hasAgreed ? "2px solid #10b981" : "2px solid #635bff",
                                  background: hasAgreed ? "#cbf7e6" : "#f3f0ff",
                                  color: hasAgreed ? "#059669" : "#635bff",
                                  boxShadow: hasAgreed ? "0 0 10px rgba(16,185,129,0.35)" : "none",
                                }}
                              >
                                {hasAgreed
                                  ? `✓ 조기 종료 동의됨 (${skipCount}/${totalCount}명)`
                                  : `⚡ 토론 조기 종료 (${skipCount}/${totalCount}명)`}
                              </button>

                              <div style={{ fontSize: "10px", color: "#888", marginTop: "4px", textAlign: "center" }}>
                                ※ 전원({totalCount}명) 동의 시 즉시 투표로 이동
                              </div>
                            </div>
                          );
                        })()}

                        <p style={{ marginTop: "8px" }}>
                          {isFreeTalk ? "자유롭게 대화하며 라이어를 찾아내세요!"
                           : isFinalDefense ? "최다 득표자가 최후변론을 진행하고 있습니다."
                           : isSelfDefense ? "공동 최다 득표자가 자기 변호를 진행하고 있습니다."
                           : "힌트를 남기고 있어요. 서로의 반응을 살펴보세요!"}
                        </p>
                      </>
                    );
                  })()}
                </aside>
              </div>
            </section>

            {/* 하단 플레이어 줄 */}
            <div className="astra-portrait-row" style={{ filter: isNoticeDimmed ? "grayscale(70%) opacity(0.4)" : "none", transition: "all 0.3s" }}>
              {onlinePlayers.slice(6, 12).map((player) => {
                const isSpeaker = userSpeechMap[player.socketId];
                const isTurnSpeaker = gamePhase === "hint-turn" && player.socketId === turnSpeakerSocketId;
                const isEliminated = eliminatedSocketIds.includes(player.socketId);
                const stains = playerStainsMap[player.socketId] || [];
                const hitBadge = hitBadgeMap[player.socketId];

                return (
                  <div
                    className="astra-player-card"
                    key={`bottom-${player.socketId || player.name}`}
                    data-socket-id={player.socketId}
                    data-player-name={player.name}
                    onClick={() => {
                      if (player.socketId !== (socket.id || myPlayerInfo?.socketId)) {
                        setItemTargetPlayer(player);
                      }
                    }}
                    style={{
                      backgroundColor: isEliminated ? "#dcdcdc" : player.softColor,
                      borderColor: isTurnSpeaker ? "#ff4785" : player.color,
                      boxShadow: isTurnSpeaker ? "0 0 12px #ff4785" : "none",
                      filter: isEliminated ? "grayscale(100%) opacity(0.5)" : "none",
                    }}
                  >
                    {/* 마우스 호버 시 노출되는 [💡 Hint] 뱃지 */}
                    <button
                      type="button"
                      className="hint-badge-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedHintPlayer(player);
                      }}
                    >
                      💡 Hint
                    </button>

                    {/* 충돌 시 머리 위에 떠오르는 [🎯 던진 사람: 🦊 닉네임] 표식 */}
                    {hitBadge && (
                      <div className="throw-hit-sender-badge">
                        🎯 던진 사람: <PlayerIcon icon={hitBadge.senderIcon} size={16} /> {hitBadge.senderName}
                      </div>
                    )}

                    {/* 캐릭터 지속 오염 자국 Stain Overlay */}
                    <div className="stain-overlay-container">
                      {stains.map((stain) => (
                        <span
                          key={stain.id}
                          className="stain-item"
                          style={{
                            left: `${stain.x}%`,
                            top: `${stain.y}%`,
                            transform: `rotate(${stain.rotate}deg)`,
                          }}
                        >
                          <img
                            src={`/items/broken_${stain.type.toLowerCase()}.png`}
                            alt={stain.type}
                            style={{ width: "54px", height: "54px", objectFit: "contain", filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))" }}
                          />
                        </span>
                      ))}
                    </div>

                    <div className="astra-avatar-wrap">
                      <Avatar type="initial" initials={player.icon} size="large" shape="square" />
                    </div>
                    <span className="text-label-sm text-text-primary">
                      {player.name} {isEliminated && "(탈락)"}
                    </span>
                    {isSpeaker && (
                      <div className="astra-speech-bubble">{isSpeaker}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </main>
        </div>

        {/* ── 🎯 인터랙티브 과일 투척 메뉴 휠 모달 ── */}
        {itemTargetPlayer && (
          <div className="modal-backdrop" style={{ zIndex: 99990 }} onClick={() => setItemTargetPlayer(null)}>
            <div className="nickname-modal" style={{ maxWidth: "380px", width: "90%", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
              <span className="card-label" style={{ color: "#ff4785" }}>ITEM THROW</span>
              <div style={{ margin: "8px 0", display: "flex", justifyContent: "center" }}>
                <div style={{ width: "50px", height: "50px", borderRadius: "14px", overflow: "hidden", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  <PlayerIcon icon={itemTargetPlayer.icon} size={50} />
                </div>
              </div>
              <h2 style={{ fontSize: "20px", margin: "4px 0 10px 0", color: "#2b2b2b" }}>
                🎯 <span style={{ color: "#ff4785" }}>[{itemTargetPlayer.name}]</span> 님에게 투척!
              </h2>
              <p style={{ fontSize: "12px", color: "#666", marginBottom: "16px" }}>
                원하는 아이템을 선택해 날려보세요 (매 판당 각 2개 제공)
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {[
                  { type: "tomato", name: "토마토", icon: "🍅", color: "#ff4785", bg: "#ffe5ee" },
                  { type: "egg", name: "달걀", icon: "🥚", color: "#d97706", bg: "#fef3c7" },
                  { type: "water", name: "물풍선", icon: "💦", color: "#0284c7", bg: "#e0f2fe" },
                  { type: "banana", name: "바나나 껍질", icon: "🍌", color: "#ca8a04", bg: "#fef9c3" },
                ].map((item) => {
                  const count = myInventory[item.type] ?? 2;
                  const isDisabled = count <= 0;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => {
                        const targetId = itemTargetPlayer.socketId || itemTargetPlayer.name;
                        socket.emit("throw-item", { targetId, itemType: item.type, roomCode });
                        setItemTargetPlayer(null);
                      }}
                      style={{
                        padding: "14px",
                        borderRadius: "14px",
                        border: `2px solid ${isDisabled ? "#ccc" : item.color}`,
                        background: isDisabled ? "#f3f4f6" : item.bg,
                        cursor: isDisabled ? "not-allowed" : "pointer",
                        opacity: isDisabled ? 0.5 : 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "4px",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <div style={{ fontSize: "28px" }}>{item.icon}</div>
                      <b style={{ fontSize: "13px", color: isDisabled ? "#888" : item.color }}>{item.name}</b>
                      <small style={{ fontSize: "10px", color: isDisabled ? "#aaa" : "#555", fontWeight: "bold" }}>
                        {count > 0 ? `남은수량: ${count}/2개` : "소진됨 (0/2)"}
                      </small>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                className="primary-button"
                style={{ width: "100%", marginTop: "16px", background: "#666", borderColor: "#555" }}
                onClick={() => setItemTargetPlayer(null)}
              >
                닫기
              </button>
            </div>
          </div>
        )}
      </section>}

      {/* 🚀 [화면 전체 날아가는 과일 투척 3D 궤적 애니메이션 오버레이] */}
      {flyingProjectiles.length > 0 && (
        <div className="flying-projectile-layer">
          {flyingProjectiles.map((p) => {
            return (
              <div
                key={p.id}
                className="flying-projectile-item"
                style={{
                  "--sx": `${p.startX}px`,
                  "--sy": `${p.startY}px`,
                  "--ex": `${p.endX}px`,
                  "--ey": `${p.endY}px`,
                } as React.CSSProperties}
              >
                <img
                  src={`/items/${p.itemType.toLowerCase()}.png`}
                  alt={p.itemType}
                  style={{ width: "52px", height: "52px", objectFit: "contain", filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.35))" }}
                />
              </div>
            );
          })}
        </div>
      )}


      {/* 닉네임 수정 모달 팝업 */}
      {editingNickname && (
        <div className="modal-backdrop" onClick={() => setEditingNickname(false)}>
          <div className="nickname-modal" onClick={(event) => event.stopPropagation()}>
            <button className="close" onClick={() => setEditingNickname(false)}>×</button>
            <span className="card-label">NICKNAME EDIT</span>
            <h2>내 이름을 정해줘!</h2>
            <div style={{ display: "flex", gap: "8px", margin: "10px 0" }}>
              <input
                autoFocus
                value={nickname}
                onChange={(event) => setNickname(event.target.value.slice(0, 12))}
                placeholder={defaultNickname}
                maxLength={12}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={() => setNickname(generateRandomNickname())}
                style={{
                  padding: "8px 12px",
                  borderRadius: "10px",
                  border: "2px solid #635bff",
                  background: "#e0e0ff",
                  color: "#4338ca",
                  fontWeight: "bold",
                  fontSize: "13px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                🎲 주사위
              </button>
            </div>
            <p>입력하지 않으면 기본 닉네임 <b>"{defaultNickname}"</b>(으)로 보여요.</p>
            <button className="primary-button" style={{ marginTop: "10px" }} onClick={() => setEditingNickname(false)}>저장하기 <span>→</span></button>
          </div>
        </div>
      )}

      {/* 비밀번호 입력 모달 팝업 */}
      {passModalOpen && (
        <div className="modal-backdrop" onClick={() => setPassModalOpen(false)}>
          <div className="nickname-modal" onClick={(event) => event.stopPropagation()}>
            <button className="close" onClick={() => setPassModalOpen(false)}>×</button>
            <span className="card-label">ROOM PASSWORD</span>
            <h2>비밀번호 입력</h2>
            <p>이 방에 입장하려면 비밀번호가 필요합니다.</p>
            <input
              type="password"
              autoFocus
              value={passInput}
              onChange={(event) => setPassInput(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") handlePassSubmit(); }}
              placeholder="비밀번호 입력"
            />
            <button className="primary-button" style={{ marginTop: "15px" }} onClick={handlePassSubmit}>
              방 입장하기 <span>→</span>
            </button>
          </div>
        </div>
      )}

      {/* ── 💡 플레이어 힌트 히스토리 보기 모달 ── */}
      {selectedHintPlayer && (
        <div className="modal-backdrop" style={{ zIndex: 99990 }} onClick={() => setSelectedHintPlayer(null)}>
          <div className="nickname-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "460px", width: "90%", border: `3px solid ${selectedHintPlayer.color || "#635bff"}`, boxShadow: `0 0 30px ${selectedHintPlayer.softColor || "rgba(99,91,255,0.4)"}` }}>
            <button className="close" onClick={() => setSelectedHintPlayer(null)}>×</button>
            <span className="card-label" style={{ color: selectedHintPlayer.color || "#635bff" }}>PLAYER HINT HISTORY</span>
            <div style={{ margin: "10px 0", display: "flex", justifyContent: "center" }}>
              <div style={{ width: "56px", height: "56px", borderRadius: "14px", overflow: "hidden", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <PlayerIcon icon={selectedHintPlayer.icon} size={56} />
              </div>
            </div>
            <h2 style={{ fontSize: "20px", margin: "5px 0 12px 0", color: "#2b2b2b" }}>
              <span style={{ color: selectedHintPlayer.color || "#635bff" }}>[{selectedHintPlayer.name}]</span> 님의 힌트 제출 기록
            </h2>
            
            <div style={{ textAlign: "left", background: "#f8fafc", padding: "16px", borderRadius: "14px", border: "1px solid #e2e8f0", margin: "15px 0", maxHeight: "250px", overflowY: "auto" }}>
              {(() => {
                // 💡 백엔드 실시간 저장소(playerHints)에서 해당 유저의 힌트 목록만 조회
                // (힌트 발언 턴에 등록된 정식 힌트만 포함되며, 자유토론/일반 채팅 내용은 포함되지 않습니다)
                const hints =
                  playerHints[selectedHintPlayer.socketId || ""] ||
                  playerHints[selectedHintPlayer.name || ""] ||
                  [];

                if (hints.length === 0) {
                  return <p style={{ color: "#94a3b8", fontStyle: "italic", textAlign: "center", margin: "10px 0" }}>아직 제출한 힌트가 없습니다. 💬</p>;
                }
                return hints.map((h: any, idx: number) => (
                  <div key={idx} style={{ marginBottom: "12px", paddingBottom: "10px", borderBottom: idx < hints.length - 1 ? "1px dashed #cbd5e1" : "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "bold", color: "#64748b", marginBottom: "4px" }}>
                      <span>{h.round === 2 ? "🔄 2라운드 힌트" : "💬 1라운드 힌트"}</span>
                      <span style={{ fontSize: "11px", color: "#94a3b8" }}>{h.time}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: "15px", fontWeight: "bold", color: "#1e293b", background: "#fff", padding: "10px 14px", borderRadius: "10px", border: "1px solid #cbd5e1" }}>
                      "{h.text}"
                    </p>
                  </div>
                ));
              })()}
            </div>

            <button className="primary-button" style={{ width: "100%" }} onClick={() => setSelectedHintPlayer(null)}>
              확인 완료 <span>✓</span>
            </button>
          </div>
        </div>
      )}

      {/* ── 80% 무죄 구제 전면 블러 안내 모달 (독립 최상위 레이어 zIndex 999999 & 5초 멈춤 노출) ── */}
      {innocentClearedNotice && (
        <div className="modal-backdrop" style={{ backdropFilter: "blur(20px)", backgroundColor: "rgba(0,0,0,0.85)", zIndex: 999999 }}>
          <div className="nickname-modal" style={{
            maxWidth: "500px", width: "90%", textAlign: "center",
            border: "3px solid #10b981", boxShadow: "0 0 60px rgba(16,185,129,0.8)",
            animation: "popIn 0.3s ease",
          }}>
            <span className="card-label" style={{ color: "#10b981", fontSize: "12px", letterSpacing: "2px" }}>✨ INNOCENT CLEARED</span>
            <div style={{ margin: "16px 0", display: "flex", justifyContent: "center" }}>
              <div style={{ width: "72px", height: "72px", borderRadius: "18px", overflow: "hidden", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <PlayerIcon icon={innocentClearedNotice.targetIcon} size={72} />
              </div>
            </div>
            <h2 style={{ fontSize: "22px", margin: "8px 0 14px 0", color: "#10b981", lineHeight: "1.4" }}>
              80퍼센트 이상이 <span style={{ color: "#ff4785", textDecoration: "underline" }}>[{innocentClearedNotice.targetName}]</span> 님의 무죄를 인정하여 2라운드가 진행됩니다!
            </h2>
            <p style={{ fontSize: "15px", color: "#555", margin: "10px 0" }}>
              무죄 찬성률: <b style={{ color: "#10b981", fontSize: "18px" }}>{innocentClearedNotice.innocentPercent?.toFixed(0)}%</b> (구제 성공)
            </p>
            <div style={{ marginTop: "20px", padding: "14px", borderRadius: "14px", background: "#cbf7e6", color: "#059669", fontWeight: "bold", fontSize: "14px" }}>
              🔄 5초 후 2라운드 힌트 발표(각 6초)가 시작됩니다.
            </div>
          </div>
        </div>
      )}
      {/* ── 🔒 관리자 방 생성 비밀번호(0307) 입력 모달 (모든 screen에서 표출 가능) ── */}
      {adminPassModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 99999, backdropFilter: "blur(12px)", backgroundColor: "rgba(0,0,0,0.7)" }}>
          <div className="nickname-modal" style={{ maxWidth: "420px", width: "90%", textAlign: "center", border: "3px solid #7652dd" }}>
            <span className="card-label" style={{ color: "#7652dd" }}>ADMIN AUTHENTICATION</span>
            <div style={{ fontSize: "54px", margin: "10px 0" }}>🔒</div>
            <h2 style={{ fontSize: "20px", margin: "5px 0 10px 0", color: "#2b2b2b" }}>
              관리자 비밀번호 입력
            </h2>
            <p style={{ fontSize: "14px", color: "#666", marginBottom: "15px", lineHeight: "1.5" }}>
              테스트 버전이므로 <b>관리자만 방을 생성</b>할 수 있습니다.
            </p>
            
            <input
              type="password"
              value={adminPassInput}
              onChange={(e) => setAdminPassInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleVerifyAdminPassword(); }}
              placeholder="비밀번호 입력"
              style={{
                width: "100%", padding: "12px 16px", borderRadius: "12px", border: "2px solid #7652dd",
                fontSize: "16px", textAlign: "center", marginBottom: "10px"
              }}
              autoFocus
            />

            {adminPassError && (
              <p style={{ color: "#ff4785", fontSize: "13px", fontWeight: "bold", margin: "5px 0 10px 0" }}>
                {adminPassError}
              </p>
            )}

            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button className="primary-button" style={{ flex: 1 }} onClick={handleVerifyAdminPassword}>
                인증 완료 (캐릭터 선택으로) ➔
              </button>
              <button
                style={{ padding: "12px 16px", borderRadius: "12px", border: "1px solid #ccc", background: "#f0f0f0", cursor: "pointer", fontWeight: "bold" }}
                onClick={() => setAdminPassModalOpen(false)}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 👤 게임 중/투표 중 일반 플레이어 이탈 상단 플로팅 토스트 배너 ── */}
      {playerLeftToast && (
        <div style={{
          position: "fixed",
          top: "24px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 999999,
          background: "linear-gradient(135deg, rgba(30, 27, 75, 0.95), rgba(76, 29, 149, 0.95))",
          color: "#fff",
          padding: "12px 24px",
          borderRadius: "30px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.4), 0 0 15px rgba(255, 71, 133, 0.5)",
          border: "2px solid #ff4785",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          fontSize: "15px",
          fontWeight: "bold",
          animation: "popIn 0.3s ease",
          pointerEvents: "none",
        }}>
          <div style={{ width: "24px", height: "24px", borderRadius: "6px", overflow: "hidden", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <PlayerIcon icon={playerLeftToast.icon} size={24} />
          </div>
          <span><b>[{playerLeftToast.name}]</b> 님이 방을 나갔습니다.</span>
          <span style={{
            background: "#ff4785",
            color: "#fff",
            fontSize: "12px",
            padding: "2px 8px",
            borderRadius: "12px",
            marginLeft: "4px"
          }}>
            남은 인원: {playerLeftToast.count}명
          </span>
        </div>
      )}

      {/* ── 🚨 플레이어 이탈 (방장 이탈 / 인원 부족) 전면 모달 (모든 screen에서 표출 가능) ── */}
      {disconnectNoticeModal && (
        <div className="modal-backdrop" style={{ zIndex: 99999, backdropFilter: "blur(16px)", backgroundColor: "rgba(0,0,0,0.85)" }}>
          <div className="nickname-modal" style={{
            maxWidth: "480px", width: "90%", textAlign: "center",
            border: `3px solid ${disconnectNoticeModal.type === "host" ? "#ff4785" : "#ff6f3c"}`,
            boxShadow: `0 0 45px ${disconnectNoticeModal.type === "host" ? "rgba(255,71,133,0.6)" : "rgba(255,111,60,0.6)"}`,
            animation: "popIn 0.3s ease",
          }}>
            <span className="card-label" style={{ color: disconnectNoticeModal.type === "host" ? "#ff4785" : "#ff6f3c" }}>
              {disconnectNoticeModal.type === "host" ? "🚨 GAME TERMINATED" : "⚠️ NOT ENOUGH PLAYERS"}
            </span>
            <div style={{ fontSize: "64px", margin: "14px 0" }}>
              {disconnectNoticeModal.type === "host" ? "👑" : "📢"}
            </div>
            <h2 style={{ fontSize: "22px", margin: "8px 0 14px 0", color: "#2b2b2b", lineHeight: "1.4" }}>
              {disconnectNoticeModal.message}
            </h2>
            <p style={{ fontSize: "14px", color: "#666", marginBottom: "18px" }}>
              {disconnectNoticeModal.type === "host"
                ? "방장이 퇴장하여 방이 삭제되었습니다. 캐릭터 선택창으로 이동합니다."
                : "남은 인원이 2명 이하가 되어 더 이상 게임을 진행할 수 없습니다. 대기실로 이동합니다."}
            </p>
            <button
              type="button"
              className="primary-button"
              style={{
                width: "100%",
                background: disconnectNoticeModal.type === "host" ? "#ff4785" : "#635bff",
                borderColor: disconnectNoticeModal.type === "host" ? "#e02667" : "#4f46e5",
              }}
              onClick={() => {
                if (disconnectNoticeModal.type === "host") {
                  setDisconnectNoticeModal(null);
                  setRoomCode("");
                  setOnlinePlayers(defaultPlayers);
                  setMyPlayerInfo(null);
                  setGamePhase("waiting");
                  setScreen("character");
                } else {
                  setDisconnectNoticeModal(null);
                  setGamePhase("waiting");
                  setScreen("room");
                }
              }}
            >
              {disconnectNoticeModal.type === "host" ? "캐릭터 선택창으로 이동 ➔" : "대기실로 이동 ➔"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
