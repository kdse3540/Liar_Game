import { useState, type CSSProperties } from "react";
import { Avatar, Button, ChatBubbles } from "@figma/astraui";

type Screen = "home" | "character" | "room" | "play";

const portraits = ["🦊", "🐻", "🐣", "🐰", "🐸", "🐹", "🐯", "🐼", "🦁", "🐨", "🐶", "🐱", "🦄", "🐙"];

const players = [
  { name: "모카", color: "#ff786c", softColor: "#f8d4cf", icon: "🦊", ready: true },
  { name: "밤비", color: "#5a95ff", softColor: "#d6e4fb", icon: "🐻", ready: true },
  { name: "구름", color: "#f6b834", softColor: "#f7e4b4", icon: "🐣", ready: false },
  { name: "해나", color: "#a875f0", softColor: "#e4d7f4", icon: "🐰", ready: true },
  { name: "나", color: "#2fbd9b", softColor: "#ccebe1", icon: "🐸", ready: true },
  { name: "단추", color: "#ff8caf", softColor: "#f8d3df", icon: "🐹", ready: true },
];

const gamePlayers = [
  { name: "모카", icon: "🦊", ready: true, tone: "coral" },
  { name: "밤비", icon: "🐻", ready: true, tone: "sky" },
  { name: "구름", icon: "🐣", ready: false, tone: "sun" },
  { name: "해나", icon: "🐰", ready: true, tone: "lilac" },
  { name: "꼬마감자", icon: "🐸", ready: true, tone: "mint" },
  { name: "단추", icon: "🐹", ready: true, tone: "rose" },
  { name: "호두", icon: "🐯", ready: true, tone: "peach" },
  { name: "보리", icon: "🐼", ready: false, tone: "bluebell" },
  { name: "루루", icon: "🦁", ready: true, tone: "lemon" },
  { name: "콩이", icon: "🐨", ready: true, tone: "violet" },
  { name: "토토", icon: "🐶", ready: true, tone: "aqua" },
  { name: "나비", icon: "🐱", ready: true, tone: "blush" },
];

function Logo() {
  return <div className="logo" aria-label="라이어 게임"><span>LIAR</span><b>GAME</b><i>!</i></div>;
}

function PlayerChip({ player, compact = false, displayName, speech, onEdit }: { player: typeof players[number]; compact?: boolean; displayName?: string; speech?: string; onEdit?: () => void }) {
  return <div className={`player-chip ${compact ? "compact" : ""}`} style={compact ? undefined : { backgroundColor: player.softColor }}>
    {speech && <div className="player-speech" style={{ backgroundColor: player.softColor, borderColor: player.color, "--speech-bg": player.softColor } as CSSProperties}>{speech}</div>}
    <div className="avatar" style={{ background: player.color }}>{player.icon}</div>
    <span>{displayName ?? player.name}</span>
    {!compact && <em className={player.ready ? "ready" : "waiting"}>{player.ready ? "READY" : "..."}</em>}
    {onEdit && <button className="nickname-edit" onClick={onEdit}>닉네임 편집</button>}
  </div>;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [nickname, setNickname] = useState("");
  const [selectedPortrait, setSelectedPortrait] = useState(0);
  const [editingNickname, setEditingNickname] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatLog, setChatLog] = useState<{ text: string; time: string }[]>([]);
  const [roomCode, setRoomCode] = useState("MANGO7");
  const [roomTitle, setRoomTitle] = useState("모카의 비밀 아지트");
  const [roomPassword, setRoomPassword] = useState("1234");
  const [maxPlayers, setMaxPlayers] = useState(14);
  const [hintTime, setHintTime] = useState("60");
  const [defenseTime, setDefenseTime] = useState("45");
  const [liarCount, setLiarCount] = useState("1");
  const [copied, setCopied] = useState(false);
  const [selectedVote, setSelectedVote] = useState("밤비");
  const [timer, setTimer] = useState(78);

  const currentNickname = nickname.trim() || "꼬마감자";
  const sendChat = () => {
    const text = chatMessage.trim();
    if (!text) return;
    setChatLog((logs) => [...logs, { text, time: "방금" }]);
    setChatMessage("");
  };

  const copyCode = () => {
    navigator.clipboard?.writeText(roomCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <main className="app-shell">
      {/* MARKER-MAKE-KIT-INVOKED */}
      {/* MARKER-MAKE-KIT-ATTACHMENTS-READ */}
      {/* MARKER-MAKE-KIT-FINAL-CHECK-READ */}
      <div className="orb orb-one" /><div className="orb orb-two" /><div className="grid-sparkles" />
      <header className="topbar">
        <button className="brand-button" onClick={() => setScreen("home")}><Logo /></button>
        {screen !== "home" && <div className="top-status"><span className="pulse" /> 연결됨 <span className="status-divider" /> 6명 참여 중</div>}
        <button className="sound-button" aria-label="소리 설정">♪</button>
      </header>

      {screen === "home" && <section className="home-screen">
        <div className="hero-copy">
          <p className="eyebrow">SAY IT. HIDE IT. FIND THE LIAR.</p>
          <h1>누가 진짜<br /><strong>거짓말장인</strong>일까?</h1>
          <p className="hero-description">모두가 같은 단어를 아는 척해요.<br />단 한 명, <b>라이어</b>만 빼고요.</p>
          <div className="home-actions">
            <button className="primary-button" onClick={() => setScreen("character")}>방 만들기 <span>→</span></button>
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

      {screen === "character" && <section className="character-screen">
        <div className="character-heading"><p className="eyebrow">PLAYER PROFILE</p><h1>캐릭터 생성</h1><p>나를 닮은 포트레이트와 이름을 골라주세요.</p></div>
        <article className="character-card">
          <div className="character-card-head"><div><span className="card-label">STEP 01 / 01</span><h2>오늘의 나는 누구?</h2></div><span className="portrait-count">{selectedPortrait + 1} / {portraits.length}</span></div>
          <div className="portrait-grid">{portraits.map((portrait, index) => <button key={`${portrait}-${index}`} aria-label={`${index + 1}번 포트레이트`} onClick={() => setSelectedPortrait(index)} className={selectedPortrait === index ? "portrait-choice selected" : "portrait-choice"}><span>{portrait}</span>{selectedPortrait === index && <b>선택됨</b>}</button>)}</div>
          <div className="profile-divider" />
          <div className="nickname-entry"><div><label htmlFor="nickname">닉네임 입력 <small>선택</small></label><p>입력하지 않으면 <b>"꼬마감자"</b>로 참여해요.</p></div><input id="nickname" value={nickname} onChange={(event) => setNickname(event.target.value.slice(0, 12))} placeholder="꼬마감자" maxLength={12} /></div>
          <div className="character-actions"><button className="back-button" onClick={() => setScreen("home")}>← 처음으로</button><button className="primary-button" onClick={() => setScreen("room")}>대기실로 이동 <span>→</span></button></div>
        </article>
      </section>}

      {screen === "room" && <section className="room-screen">
        <div className="screen-intro"><p className="eyebrow">WAITING ROOM</p><h2>친구들을 <mark>불러모으는 중!</mark></h2><p>방 코드나 링크를 공유하면 바로 입장할 수 있어요.</p></div>
        <div className="room-layout">
          <article className="room-card invite-card">
            <div className="settings-heading"><span className="card-label">HOST CONTROLS</span><span className="host-badge">방장</span></div>
            <label className="field-label">방 제목<input value={roomTitle} onChange={(event) => setRoomTitle(event.target.value)} /></label>
            <label className="field-label">방 비밀번호 <span className="optional">선택</span><input type="password" value={roomPassword} onChange={(event) => setRoomPassword(event.target.value)} /></label>
            <label className="field-label">최대 인원<select value={maxPlayers} onChange={(event) => setMaxPlayers(Number(event.target.value))}>{[4, 6, 8, 10, 12, 14].map((count) => <option value={count} key={count}>{count}명</option>)}</select></label>
            <div className="rule-line" />
            <span className="card-label">ROUND SETTINGS</span>
            <div className="time-settings">
              <label>힌트 시간<select value={hintTime} onChange={(event) => setHintTime(event.target.value)}><option>45</option><option>60</option><option>90</option></select><small>초</small></label>
              <label>변론 시간<select value={defenseTime} onChange={(event) => setDefenseTime(event.target.value)}><option>30</option><option>45</option><option>60</option></select><small>초</small></label>
              <label>라이어 인원<select value={liarCount} onChange={(event) => setLiarCount(event.target.value)}><option>1</option><option>2</option><option>3</option></select><small>명</small></label>
            </div>
            <div className="code-footer"><div><span className="card-label">ROOM CODE</span><strong>{roomCode}</strong></div><button onClick={copyCode}>{copied ? "복사됨!" : "코드 복사"}</button></div>
            <button className="link-button" onClick={copyCode}>↗ 초대 링크 공유하기</button>
          </article>
          <article className="room-card players-card">
            <div className="card-title"><span><i className="online-dot" /> 플레이어 <b>{players.length}</b> / {maxPlayers}</span><small>방장: 모카 · {roomTitle}</small></div>
            <div className="players-grid">{players.map((player) => <PlayerChip player={player} key={player.name} displayName={player.name === "나" ? currentNickname : undefined} speech={player.name === "나" ? chatLog.at(-1)?.text : undefined} onEdit={player.name === "나" ? () => setEditingNickname(true) : undefined} />)}{Array.from({ length: Math.max(0, maxPlayers - players.length) }, (_, index) => <div className="empty-seat" key={`empty-${index}`}>+<span>빈 자리</span></div>)}</div>
            <div className="room-chat"><div className="room-chat-head"><span>💬 채팅 로그</span><small>대기실의 모든 참여자가 볼 수 있어요</small></div><div className="room-chat-log" aria-live="polite">{chatLog.length === 0 ? <p>아직 대화가 없어요. 먼저 인사해 보세요!</p> : chatLog.map((entry, index) => <div className="room-log-entry" key={`${entry.text}-${index}`}><b>{currentNickname}</b><span>{entry.text}</span><time>{entry.time}</time></div>)}</div><div className="chat-compose"><input value={chatMessage} onChange={(event) => setChatMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") sendChat(); }} placeholder="대기실에 메시지 보내기" maxLength={60} /><button onClick={sendChat} disabled={!chatMessage.trim()}>전송</button></div></div>
            <div className="ready-footer"><span>6명 모두 준비됐어요!</span><button className="primary-button small" onClick={() => setScreen("play")}>게임 시작 →</button></div>
          </article>
        </div>
      </section>}

      {screen === "play" && <section className="astra-game-shell">
        <div className="astra-game-canvas">
          <main className="astra-game-board">
            <div className="astra-portrait-row">{gamePlayers.slice(0, 6).map((player, index) => <div className={`astra-player-card tone-${player.tone}`} key={`top-${player.name}`}><div className="astra-avatar-wrap"><Avatar type="initial" initials={player.icon} size="large" shape="square" /></div><span className="text-label-sm text-text-primary">{player.name}</span>{index === 0 && <div className="astra-speech-bubble">“먹을 게 정말 많아요.”</div>}</div>)}</div>
            <section className="astra-log-panel">
              <div className="astra-log-header"><div className="text-title text-text-primary">▣ 대화 기록</div><div className="astra-secret-hover"><span className="text-label-xs text-text-secondary">나의 비밀 제시어</span><span className="astra-secret-word text-label-sm">놀이공원</span></div><div className="astra-game-meta"><span>ROUND <b>03</b> / 05</span><strong>{String(Math.floor(timer / 60)).padStart(2, "0")}:{String(timer % 60).padStart(2, "0")}</strong><small>구름 발언 중</small></div></div>
              <div className="astra-log-body"><div className="astra-prompt-pane">
                <div className="astra-message"><Avatar type="initial" initials="🦊" size="small" shape="square" /><div><div className="text-label-sm text-text-primary">모카</div><ChatBubbles type="ai" text="먹을 게 정말 많아요." /></div><span className="text-label-xs text-text-tertiary">방금</span></div>
                <div className="astra-message"><Avatar type="initial" initials="🐻" size="small" shape="square" /><div><div className="text-label-sm text-text-primary">밤비</div><ChatBubbles type="ai" text="저는 높은 곳이 제일 무서워요." /></div><span className="text-label-xs text-text-tertiary">1분 전</span></div>
                {chatLog.map((entry, index) => <div className="astra-message" key={`astra-log-${entry.text}-${index}`}><Avatar type="initial" initials="🐸" size="small" shape="square" /><div><div className="text-label-sm text-text-primary">{currentNickname}</div><ChatBubbles type="user" text={entry.text} userAvatar={<Avatar type="initial" initials="🐸" size="small" shape="circle" />} /></div><span className="text-label-xs text-text-tertiary">{entry.time}</span></div>)}
              <div className="astra-inline-composer"><textarea value={chatMessage} onChange={(event) => setChatMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendChat(); } }} placeholder="대기실에 메시지 보내기" rows={1} /><button type="button" onClick={sendChat} disabled={!chatMessage.trim()}>전송</button></div></div><aside className="astra-live-panel"><span className="card-label">LIVE TURN</span><div className="live-avatar"><Avatar type="initial" initials="🐣" size="large" shape="square" /></div><strong>구름</strong><span className="live-speaking"><i /> 발언 중</span><div className="live-clock">{String(Math.floor(timer / 60)).padStart(2, "0")}:{String(timer % 60).padStart(2, "0")}</div><small>남은 시간</small><p>힌트를 남기고 있어요.<br />서로의 반응을 살펴보세요!</p></aside></div>
            </section>
            <div className="astra-portrait-row">{gamePlayers.slice(6, 12).map((player) => <div className={`astra-player-card tone-${player.tone}`} key={`bottom-${player.name}`}><div className="astra-avatar-wrap"><Avatar type="initial" initials={player.icon} size="large" shape="square" /></div><span className="text-label-sm text-text-primary">{player.name}</span>{player.name === "토토" && chatLog.at(-1) && <div className="astra-speech-bubble">{chatLog.at(-1)?.text}</div>}</div>)}</div>
          </main>
        </div>
      </section>}

      {editingNickname && <div className="modal-backdrop" onClick={() => setEditingNickname(false)}><div className="nickname-modal" onClick={(event) => event.stopPropagation()}><button className="close" onClick={() => setEditingNickname(false)}>×</button><span className="card-label">NICKNAME EDIT</span><h2>내 이름을 정해줘!</h2><input autoFocus value={nickname} onChange={(event) => setNickname(event.target.value.slice(0, 12))} placeholder="꼬마감자" maxLength={12} /><p>입력하지 않으면 기본 닉네임 “꼬마감자”로 보여요.</p><button className="primary-button" onClick={() => setEditingNickname(false)}>저장하기 <span>→</span></button></div></div>}
    </main>
  );
}
