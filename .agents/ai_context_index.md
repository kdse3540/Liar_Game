# AI Context Index (작업 기록 문서 / 스킬북)

---
## [2026-07-25 / 피그마 UI 루트 디렉터리 독립 재구성 및 초보자용 세팅]
- **관련 파일 경로:** `D:\Make_Game\Liar_Game\src\App.tsx`, `D:\Make_Game\Liar_Game\src\components\AstraUI.tsx`, `D:\Make_Game\Liar_Game\vite.config.ts`, `D:\Make_Game\Liar_Game\package.json`
- **핵심 기능 및 역할:** `Design/` 폴더 내 피그마 내보내기 웹 프로젝트를 루트 경로로 이전하여 `Design/` 폴더 없이 100% 독립 구동 및 빌드 가능하도록 구성. 비공개 `@figma/astraui` 패키지를 대체하는 로컬 컴포넌트(`AstraUI.tsx`) 제작 및 코딩 초보자용 상세 한글 주석 추가.
- **주요 함수/에셋 레퍼런스:** `App` 메인 컴포넌트(화면 전환: home, character, room, play), `Avatar`, `Button`, `ChatBubbles` 컴포넌트, `src/imports/` 에셋 이미지.
- **특이사항/의존성:** `Design` 디렉터리를 완전히 삭제해도 `npm run dev` 및 `npm run build`가 완벽하게 구동됨. 외부 `.figma/make/site.json` 의존성 제거 완료.
---

---
## [2026-07-25 / Visual Inspector (AI 수정 지시용 시각적 픽 모드) 탑재]
- **관련 파일 경로:** `D:\Make_Game\Liar_Game\src\components\VisualInspector.tsx`, `D:\Make_Game\Liar_Game\src\App.tsx`
- **핵심 기능 및 역할:** 코딩을 모르는 사용자가 웹 화면에서 마우스로 콕 지점을 집어(Pick), 원하는 수정 내용을 적은 후 AI 대화창에 바로 전송 가능한 지시문 텍스트를 클립보드에 자동 복사해 주는 도구.
- **주요 함수/에셋 레퍼런스:** `VisualInspector` 컴포넌트, `handleMouseOver`, `handleClick`, `handleCopyPrompt` 함수, `isActive` & `selectedInfo` State.
- **특이사항/의존성:** `App.tsx` 최상단에 부착되어 있으며, 마우스 이벤트 버블링 차단 및 클립보드 복사(Clipboard API) 사용. 초보자용 상세 한글 주석 포함.
---

---
## [2026-07-25 / PLAY 화면 예시 말풍선 삭제 및 내 캐릭터 말풍선 동적 연동]
- **관련 파일 경로:** `D:\Make_Game\Liar_Game\src\App.tsx` 내 `Screen === "play"` 섹션
- **핵심 기능 및 역할:** 모카 카드 위의 고정 예시 텍스트("먹을 게 정말 많아요.") 말풍선 삭제. 사용자가 생성/선택한 캐릭터("나" / `currentNickname` / 선택한 아바타 이모지) 카드 위에만 최근 입력한 채팅 메시지(`chatLog.at(-1)?.text`)가 말풍선(`astra-speech-bubble`)으로 떠오르도록 수정.
- **주요 함수/에셋 레퍼런스:** `gamePlayers` 맵핑 로직, `isMe` 판별 식 및 `latestChat` 연동.
- **특이사항/의존성:** 사용자가 Visual Inspector를 사용해 10초 만에 지시한 내용 반영 완료.
---

---
## [2026-07-25 / 3초 말풍선 자동 타이머 및 대화 기록 고정 스크롤 적용]
- **관련 파일 경로:** `D:\Make_Game\Liar_Game\src\App.tsx`, `D:\Make_Game\Liar_Game\src\index.css`
- **핵심 기능 및 역할:** 
  1. 메시지 전송 시 내 캐릭터 위에 말풍선이 나타난 후 3초(3000ms) 뒤 자동으로 사라지도록 `showBubble` state & 타이머 적용.
  2. 대화 기록이 쌓이더라도 UI가 아래로 길어지지 않고 대화 영역 내부(`.astra-message-list`)에 수직 스크롤이 생성되며 최신 메시지로 자동 스크롤되도록 CSS/React Ref 개선.
- **주요 함수/에셋 레퍼런스:** `showBubble`, `bubbleTimerRef`, `messageListRef`, `sendChat` 함수, `.astra-message-list` CSS 클래스.
- **특이사항/의존성:** 대화가 100개 쌓여도 레이아웃이 항상 깔끔하게 고정됨.
---

---
## [2026-07-25 / 채팅 입력창 위치 및 레이아웃 정상 복원]
- **관련 파일 경로:** `D:\Make_Game\Liar_Game\src\index.css` 내 `.astra-inline-composer` 섹션
- **핵심 기능 및 역할:** 채팅 입력 영역(`.astra-inline-composer`)이 대화 기록 상자 패널 맨 하단에 깔끔하고 정돈된 위치로 위치하도록 CSS 폼/버튼/레이아웃 복원.
- **주요 함수/에셋 레퍼런스:** `.astra-inline-composer` CSS 스타일 클래스.
- **특이사항/의존성:** Visual Inspector로 지시된 채팅창 레이아웃 깨짐 현상 완벽 복구 완료.
---

---
## [2026-07-25 / 대화 기록 리스트 1열(가로 한 줄) 콤팩트 레이아웃 개편]
- **관련 파일 경로:** `D:\Make_Game\Liar_Game\src\App.tsx`, `D:\Make_Game\Liar_Game\src\index.css`
- **핵심 기능 및 역할:** 대화 기록 영역(`astra-message`)에서 아바타, 닉네임, 메시지, 시간이 세로로 3줄씩 높게 차지하던 현상을 개선하여, `[아바타] 닉네임: 메시지 내용 (시간)` 형태의 **가로 1열 콤팩트 디자인**으로 변경. 한 화면에 훨씬 많은 채팅 로그가 시원하게 노출됨.
- **주요 함수/에셋 레퍼런스:** `.astra-message-name`, `.astra-message-text`, `.astra-message-time` CSS 클래스 및 `App.tsx` 렌더링 변경.
- **특이사항/의존성:** 시각적 가독성 및 공간 효율 대폭 상승.
---

---
## [2026-07-25 / PLAY 화면 12명 플레이어 포트레이트 알록달록 색상 개별화]
- **관련 파일 경로:** `D:\Make_Game\Liar_Game\src\App.tsx`, `D:\Make_Game\Liar_Game\src\index.css`
- **핵심 기능 및 역할:** PLAY 화면의 12명 플레이어 카드마다 개별 파스텔 톤 배경색(`softColor`)과 고유 액센트 테두리/아바타 색상(`color`)을 부여하여 12명 모두 색상이 서로 다르고 시각적으로 예쁘게 구분되도록 적용.
- **주요 함수/에셋 레퍼런스:** `gamePlayers` 고유 색상 속성, `.astra-player-card` 인라인 스타일 및 CSS 호버 효과.
- **특이사항/의존성:** 12명 캐릭터 카드의 구별 가독성 대폭 향상.
---

---
## [2026-07-25 / 비밀 제시어 컴포넌트 전체 보라색 덮임(Fixed Overflow) 버그 완벽 수리]
- **관련 파일 경로:** `D:\Make_Game\Liar_Game\src\index.css` 내 `.astra-secret-hover` 및 `.astra-secret-word` 섹션
- **핵심 기능 및 역할:** 피그마 내보내기 원본 CSS에서 `.astra-secret-word` 요소의 absolute/fixed 위치 속성이 레이아웃 상자를 뚫고 탈출하여 화면 전체(100vw, 100vh)를 온통 통보라색으로 덮어버리던 긴급 치명적 버그를 완벽하게 고침.
- **주요 함수/에셋 레퍼런스:** `.astra-secret-hover`, `.astra-secret-word` CSS 오버플로우 격리 속성.
- **특이사항/의존성:** 이제 제시어 상자(170px * 32px) 안에서만 비밀 제시어가 정상 작동하며 화면 전체 레이아웃이 깔끔하게 원복됨.
---

---
## [2026-07-25 / 플레이어 포트레이트 가로 6열 그리드 정렬 복원]
- **관련 파일 경로:** `D:\Make_Game\Liar_Game\src\index.css` 내 `.astra-portrait-row` 섹션
- **핵심 기능 및 역할:** 포트레이트 카드 6개가 세로로 길게 누워 1열로 늘어지던 현상을 해결하여, 상단 6명 / 하단 6명이 **가로 6열(1행 6열 나란히)**로 깔끔하게 배치되도록 그리드(`grid-template-columns: repeat(6, 1fr)`) 스타일 복원.
- **주요 함수/에셋 레퍼런스:** `.astra-portrait-row`, `.astra-player-card` CSS 스타일 클래스.
- **특이사항/의존성:** 이모지 아바타 및 닉네임 위치 완벽 원복 완료.
---

---
## [2026-07-25 / 포트레이트 카드 비율(aspect-ratio) 및 폭 제한 레이아웃 최적화]
- **관련 파일 경로:** `D:\Make_Game\Liar_Game\src\index.css` 내 `.astra-portrait-row` 및 `.astra-player-card` 섹션
- **핵심 기능 및 역할:** 넓은 화면에서 포트레이트 상자와 카드가 옆으로 너무 길쭉하게 늘어지는 현상을 방지하기 위해 `max-width: 960px`, `margin: 0 auto` 및 카드에 `aspect-ratio: 1 / 1.05` 콤팩트 비율을 설정하여, 언제나 예쁘고 단정한 둥근 정사각형 형태로 가독성 높게 정돈.
- **주요 함수/에셋 레퍼런스:** `.astra-player-card` `aspect-ratio` 및 `max-width` CSS 속성.
- **특이사항/의존성:** 시각적 가독성 및 아기자기한 디자인 밸런스 대폭 향상.
---

---
## [2026-07-25 / 상단/하단 플레이어 아이덴티티 색상 수직 대칭 겹침 해소 및 교차(Cross-Mix) 배정]
- **관련 파일 경로:** `D:\Make_Game\Liar_Game\src\App.tsx` 내 `gamePlayers` 배열
- **핵심 기능 및 역할:** 상단 6명과 하단 6명의 카드가 수직으로 겹치는 패턴(분홍-분홍, 파랑-파랑 등)을 해소하기 위해, 12명 플레이어에게 교차(Cross-Mix) 12가지 독창적 아이덴티티 파스텔 컬러(코랄오렌지, 스카이블루, 해바라기, 딥라벤더, 에메랄드민트, 핫핑크 ↔ 딥바이올렛, 멜론라임, 체리핑크, 피치망고, 시안아쿠아, 카나리아옐로우)를 재배정함.
- **주요 함수/에셋 레퍼런스:** `gamePlayers` 파스텔 칼라 매핑.
- **특이사항/의존성:** 12명 캐릭터 카드가 무지개처럼 다채롭고 직관적으로 구별됨.
---

---
## [2026-07-25 / 대기실(ROOM)과 플레이룸(PLAY) 캐릭터 포트레이트 & 색상 100% 동기화]
- **관련 파일 경로:** `D:\Make_Game\Liar_Game\src\App.tsx` 내 `players` 및 `gamePlayers` 배열, `PlayerChip` 컴포넌트
- **핵심 기능 및 역할:** 대기실 화면(`players`)의 6명 캐릭터(모카, 밤비, 구름, 해나, 나, 단추)의 이모지, 닉네임, 카드 파스텔 배경색(`softColor`) 및 테두리/아바타 색상(`color`)을 플레이룸(`gamePlayers`)의 앞 6명 데이터와 100% 동일하게 완벽 동기화. 사용자가 캐릭터 선택 화면에서 나만의 이모지(`myIcon`)와 닉네임을 바꾸더라도 대기실과 플레이룸 모두에서 1:1 완벽한 일관성이 유지됨.
- **주요 함수/에셋 레퍼런스:** `PlayerChip` `displayIcon` prop 및 `players` 데이터 정동기화.
- **특이사항/의존성:** 화면 전환 시 브랜드 일관성 및 캐릭터 몰입감 완성.
---

---
## [2026-07-25 / 말풍선 캐릭터 포트레이트 상단(머리 위) 위치 및 화살표 꼬리 배치]
- **관련 파일 경로:** `D:\Make_Game\Liar_Game\src\index.css` 내 `.astra-speech-bubble` 섹션
- **핵심 기능 및 역할:** 플레이 화면에서 메시지 입력 시 뜨는 말풍선이 캐릭터 카드 아래가 아닌 캐릭터 포트레이트 상단(머리 위, `bottom: calc(100% + 12px)`)에 붕 떠오르도록 구현하고, 말풍선 아래쪽에 화살표 꼬리를 추가하여 포트레이트 머리를 정확히 가리키도록 개선.
- **주요 함수/에셋 레퍼런스:** `.astra-speech-bubble`, `.astra-speech-bubble::after` CSS 속성.
- **특이사항/의존성:** 말풍선 위치 가독성 및 직관성 대폭 향상.
---

---
## [2026-07-25 / 말풍선 최상단(Topmost z-index: 9999) 배치 및 상단 테두리 잘림 완벽 방지]
- **관련 파일 경로:** `D:\Make_Game\Liar_Game\src\index.css` 내 `.astra-portrait-row`, `.astra-player-card`, `.astra-speech-bubble` 섹션
- **핵심 기능 및 역할:** 상단 캐릭터 포트레이트 행 위에 떠오르는 말풍선의 위쪽 절반이 테두리 상자에 잘려 보이던 현상을 해결하기 위해, `overflow: visible !important` 및 `margin-top: 36px` 패딩 여유 공간을 확보하고, 말풍선에 `z-index: 9999`를 부여하여 화면의 모든 요소보다 맨 위에 온전히 선명하게 노출되도록 완벽 수정.
- **주요 함수/에셋 레퍼런스:** `.astra-portrait-row` `margin-top: 36px`, `.astra-speech-bubble` `z-index: 9999` CSS 속성.
- **특이사항/의존성:** 말풍선의 윗부분 잘림이 100% 해소됨.
---

---
## [2026-07-25 / PLAY 화면 전체 레이아웃 100% 정중앙(Center Alignment) 밸런스 정돈]
- **관련 파일 경로:** `D:\Make_Game\Liar_Game\src\index.css` 내 `.astra-game-shell`, `.astra-game-canvas`, `.astra-game-board` 섹션
- **핵심 기능 및 역할:** PLAY 화면의 전체 게임판(`astra-game-shell` & `astra-game-canvas`)이 화면 좌측으로 쏠리거나 치우치던 현상을 수정하기 위해 `display: flex !important; justify-content: center !important; margin: 0 auto !important;` 및 `max-width: 1060px` 정중앙 얼라인먼트 속성을 부여하여, 모든 해상도에서 100% 눈이 편안한 정중앙으로 배치함.
- **주요 함수/에셋 레퍼런스:** `.astra-game-shell`, `.astra-game-canvas` 정중앙 수평 정렬 CSS.
- **특이사항/의존성:** 레이아웃의 대칭 안정감 및 피그마 디자인 완성도 대폭 상승.
---

---
## [2026-07-25 / 대화 기록 상자 패널 코너 직각 삐져나옴 해소 및 4모서리 둥근 모서리 밀착]
- **관련 파일 경로:** `D:\Make_Game\Liar_Game\src\index.css` 내 `.astra-log-panel`, `.astra-log-header`, `.astra-live-panel`, `.astra-inline-composer` 섹션
- **핵심 기능 및 역할:** 대화 기록 상자의 우측 하단 민트색 라이브 패널(`astra-live-panel`) 등 내부 배경 요소들의 직각 사각형 코너가 둥근 검은색 겉 테두리(radius 20px) 밖으로 어색하게 삐져나오던 현상을 고치기 위해, 패널에 `overflow: hidden !important;`를 적용하고 각 하단 요소에 `border-bottom-right-radius: 18px !important;` 및 `border-bottom-left-radius: 18px !important;`를 부여하여 부드럽고 완벽하게 착 달라붙도록 일치시킴.
- **주요 함수/에셋 레퍼런스:** `.astra-log-panel` `overflow: hidden`, `.astra-live-panel` `border-bottom-right-radius: 18px` CSS.
- **특이사항/의존성:** 삐져나오던 모서리 겉돎 문제 100% 해결.
---

---
## [2026-07-25 / 게임 메타 박스 제거 및 비밀 제시어 상자 '대화 기록' 제목 옆 밀착 재배치]
- **관련 파일 경로:** `D:\Make_Game\Liar_Game\src\App.tsx`, `D:\Make_Game\Liar_Game\src\index.css` 내 `.astra-log-header` 및 `.astra-secret-hover`
- **핵심 기능 및 역할:** 대화 기록 패널 헤더 오른쪽에 조잡하게 노출되던 라운드/타이머 메타 박스(`astra-game-meta`)를 완전히 삭제 제거하고, 비밀 제시어 상자(`astra-secret-hover`)를 `▣ 대화 기록` 제목 텍스트 바로 오른쪽 옆에 찰떡같이 밀착시켜 동선 가독성 및 디자인 깔끔함 완성.
- **주요 함수/에셋 레퍼런스:** `.astra-log-header` `gap: 14px`, `.astra-secret-hover` `margin-left: 8px`.
- **특이사항/의존성:** 대화 기록 헤더 영역 공간 활용성 대폭 상승.
---

---
## [2026-07-25 / 대화 패널 채팅 입력창 바닥(패널 최하단) 고정 레이아웃 적용]
- **관련 파일 경로:** `D:\Make_Game\Liar_Game\src\index.css` 내 `.astra-prompt-pane` 및 `.astra-inline-composer` 섹션
- **핵심 기능 및 역할:** 채팅 메시지 개수가 적을 때 메시지 입력창이 대화 메시지 바로 아래 어색하게 붙어있던 현상을 해결하기 위해, 대화 영역 패널에 수직 flex 구도(`display: flex; flex-direction: column; justify-content: space-between`) 및 입력창에 `margin-top: auto`를 부여하여 대화 메시지 양과 상관없이 입력창이 항상 패널 최하단 바닥에 안정적으로 안착하도록 완벽 수정.
- **주요 함수/에셋 레퍼런스:** `.astra-prompt-pane`, `.astra-inline-composer` `margin-top: auto` CSS.
- **특이사항/의존성:** 대화 상자 폼 레이아웃의 안정성 및 피그마 디자인 일관성 대폭 향상.
---

---
## [2026-07-25 / 메시지 입력창 너비 100% 확대 연장 및 둥근 모서리(Rounded 20px) 개편]
- **관련 파일 경로:** `D:\Make_Game\Liar_Game\src\index.css` 내 `.astra-prompt-pane`, `.astra-inline-composer` 섹션
- **핵심 기능 및 역할:** 기존에 피그마 제한폭 때문에 메시지 입력창 너비가 오른쪽 라이브 패널 근처로 넓어지지 못하고 좁게 잘려 있던 현상을 해결하여, 입력창 너비를 오른쪽 라이브 패널 벽면 닿기 직전까지 100% 시원하게 확장하고, 딱딱했던 텍스트 영역과 [전송] 버튼 모서리를 동글동글(Rounded 20px)하고 예쁘게 다듬어 가독성과 스타일을 대폭 향상함.
- **주요 함수/에셋 레퍼런스:** `.astra-inline-composer textarea`, `.astra-inline-composer button` `border-radius: 20px`.
- **특이사항/의존성:** 좁았던 채팅 입력칸이 시원하고 넓어지며 아기자기한 디자인 분위기와 완벽 동화됨.
---

---
## [2026-07-25 / 3대 대형 섹션 (포트레이트 <-> 대화상자 <-> 포트레이트) 수직 간격 100% 균일화 (24px)]
- **관련 파일 경로:** `D:\Make_Game\Liar_Game\src\index.css` 내 `.astra-game-board`, `.astra-portrait-row`, `.astra-game-canvas` 섹션
- **핵심 기능 및 역할:** 상단 포트레이트 행에 들어있던 개별 외부 마진(`margin-top: 36px`) 때문에 [상단 포트레이트 ↔ 대화상자] 사이 간격과 [대화상자 ↔ 하단 포트레이트] 사이 간격이 짝짝이로 불균형하던 현상을 보정함. 외부 마진을 0으로 리셋하고 캔버스 최상단 패딩을 부여함으로써, `astra-game-board`의 `gap: 24px` 속성에 의해 세 섹션 간 수직 간격이 1px의 오차도 없이 100% 칼같이 동등하고 안정적으로 균일 배치됨.
- **주요 함수/에셋 레퍼런스:** `.astra-game-board` `gap: 24px`, `.astra-portrait-row` `margin: 0 auto`.
- **특이사항/의존성:** 캡처 이미지로 지적된 불균일 여백 문제 100% 해결.
---

---
## [2026-07-25 / 대기실(ROOM) 라운드 세팅 라이어 인원수 다중 선택 및 자동 보정 기능 추가]
- **관련 파일 경로:** `d:\Make_Game\Liar_Game\src\App.tsx` 내 `App` 컴포넌트 (`ROUND SETTINGS` 섹션)
- **핵심 기능 및 역할:** 대기실의 라운드 세팅에서 라이어 인원수를 동적으로 다중 선택(1명부터 최대 인원/2 명까지)할 수 있도록 선택 옵션을 동적 생성으로 개편하고, 방의 최대 인원(`maxPlayers`) 변경 시 선택된 라이어 수가 과도해지지 않도록 자동 조율하는 `useEffect` 보정 로직을 추가함.
- **주요 함수/에셋 레퍼런스:** `App.tsx` 내 `setLiarCount`, `maxPlayers` 연동 `useEffect`.
- **특이사항/의존성:** 라이어 다중 설정 요청에 대응하여 인원수에 유연하게 맞춘 게임 설정 기능 지원.
---

---
## [2026-07-27 / Node.js + Express + Socket.io 백엔드 서버 구축 및 프론트엔드 실시간 연동]
- **관련 파일 경로:** `d:\Make_Game\Liar_Game\server\index.js`, `server\words.js`, `src\services\socket.ts`, `src\App.tsx`
- **핵심 기능 및 역할:** Express + Socket.io 실시간 백엔드 서버(포트 4000)를 구축하고, 무작위 제시어 데이터베이스(`words.js`)와 방 생성/입장/실시간 채팅/라이어 무작위 선출/비밀 제시어 개별 통신 기능을 완성함. 프론트엔드(`socket.ts`, `App.tsx`)와 소켓 이벤트를 완전 바인딩하여 다인용 실시간 멀티플레이 라이어 게임 지원.
- **주요 함수/에셋 레퍼런스:** `create-room`, `join-room`, `send-chat`, `start-game`, `game-started` 소켓 이벤트 handlers.
- **특이사항/의존성:** 4000번 포트 소켓 서버 백그라운드 구동 중이며, 다른 컴퓨터 및 모바일과 실시간 테스트 가능.
---

---
## [2026-07-28 / 2번째 및 N번째 플레이어 턴 전환 시 serverHintTime 100% 반영 수정]
- **관련 파일 경로:** `d:\Make_Game\Liar_Game\server\index.js`, `d:\Make_Game\Liar_Game\src\App.tsx`
- **핵심 기능 및 역할:** 1번째 플레이어 이후 2번째, 3번째 등 N번째 플레이어로 턴이 이동할 때 클로저 이슈로 인해 구버전 hintTime state(20초)가 참조되던 버그를 완전히 수정함. 백엔드 `server/index.js` 내 `turn-changed` 브로드캐스트 패킷에 `hintTime: room.hintTime || 20`를 기본 포함하여 내보내도록 개편함. 또한 프론트엔드 `App.tsx` 내 `turn-changed` 리스너에서 수신받은 `serverHintTime`을 최우선 적용하도록 보완하여, 몇 번째 플레이어 턴이든 상관없이 방장이 대기실에서 설정한 힌트 시간초(10초, 15초, 30초 등)가 100% 동일하고 정확하게 유지되도록 조치함.
- **주요 함수/에셋 레퍼런스:** `server/index.js` 내 `turn-changed` emit payload, `App.tsx` 내 `socket.on("turn-changed")` serverHintTime logic.
- **특이사항/의존성:** N번째 턴 발언 시간초 100% 일관성 보장 완료.
---

---
## [2026-07-29 / 투표 후 최후변론 & 자기변호 & 80% 유죄/무죄 최종결정 및 재투표 전 과정 구현]
- **관련 파일 경로:** `d:\Make_Game\Liar_Game\server\index.js`, `d:\Make_Game\Liar_Game\src\App.tsx`, `d:\Make_Game\Liar_Game\.agents\docs\2026-07-29_투표후_최후변론_플로우_SPEC.md`
- **핵심 기능 및 역할:** 1차 투표 종료 후 단일 최다 득표자의 '최후변론(7초)' ➔ 나머지 자유토론(10초) ➔ '유죄/무죄 80% 결정 투표' ➔ 2라운드 구제/지목 확정 시스템 구현. 동률 발생 시 각 '자기변호(7초씩)' ➔ 자유토론(10초) ➔ '재투표' ➔ 동률 시 '단죄 룰렛' 전체 자동 연계 완료. 모든 전환 사이사이에 차례 안내 전면 블러 모달 적용.
- **주요 함수/에셋 레퍼런스:** `startPostVoteFlow`, `startNextSelfDefense`, `startPostVoteFreeTalk`, `startFinalDecisionVote`, `submit-final-decision`, `startReVote`, `submit-re-vote`, `triggerReVoteRoulette`, `startRound2`, `revealLiarResult` 소켓 함수 및 React 모달 6종.
- **특이사항/의존성:** 기획서(`2026-07-29_투표후_최후변론_플로우_SPEC.md`) 100% 반영 완료. `npx tsc` 및 `node --check` 검증 완료.
---

---
## [2026-07-29 / 📦 Vercel 빌드 패키지 미설치 에러 해결 (package.json 의존성 통합)]
- **관련 파일 경로:** `d:\Make_Game\Liar_Game\package.json`
- **핵심 기능 및 역할:** Vercel 빌드 서버에서 `Installing dependencies...` 수행 시 Vite 및 Tailwind 관련 도구가 누락되지 않도록 `devDependencies`의 패키지들을 `dependencies` 항목으로 통합 교정하고 GitHub `main` 브랜치에 푸시함.
- **주요 함수/에셋 레퍼런스:** `package.json`의 `dependencies` 항목.
- **특이사항/의존성:** 푸시 후 Vercel이 새 커밋(`ada5990`)을 감지하여 자동 재빌드 수행.
---








































