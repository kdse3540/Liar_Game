# 🚀 Render(백엔드) + Vercel(프론트엔드) 무료 배포 가이드

> **작성일:** 2026-07-29  
> **목적:** Render.com(24시간 Node.js 소켓 서버)과 Vercel.com(Vite React 프론트엔드)을 이용해 라이어 게임을 100% 무료 배포하고 친구들과 공유하는 가이드

---

## 📌 준비물
1. **GitHub 계정** (프로젝트 코드 올리기용)
2. **Render.com 계정** (백엔드 호스팅용)
3. **Vercel.com 계정** (프론트엔드 호스팅용)

---

## STEP 1. GitHub에 내 소스코드 올리기 🐙

1. [GitHub.com](https://github.com/) 접속 ➔ 로그인 후 우측 상단 `[+]` ➔ `[New repository]` 클릭
2. Repository name: `Liar_Game` 입력 ➔ Public 선택 ➔ `Create repository` 클릭
3. 내 컴퓨터 터미널(VS Code 명령어 창)에서 아래 명령어 실행:
   ```bash
   git init
   git add .
   git commit -m "Deploy Liar Game v1.0"
   git branch -M main
   git remote add origin https://github.com/본인아이디/Liar_Game.git
   git push -u origin main
   ```

---

## STEP 2. Render.com에 백엔드 소켓 서버 배포하기 🖥️

1. [Render.com](https://render.com/) 접속 ➔ Sign Up (GitHub 계정으로 로그인)
2. 대시보드 ➔ **`New +`** 버튼 ➔ **`Web Service`** 선택
3. **`Build and deploy from a Git repository`** 선택 ➔ Next
4. 방금 올린 `Liar_Game` 리포지토리 선택 ➔ Connect
5. **설정값 입력**:
   - **Name**: `liar-game-backend` (원하는 이름)
   - **Region**: Singapore 또는 Oregon
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server/index.js`
   - **Instance Type**: `Free` 선택
6. 맨 아래 **`Create Web Service`** 버튼 클릭!
7. 약 1~2분 후 배포가 완료되면 상단에 내 백엔드 URL이 생성됩니다:
   👉 예시: `https://liar-game-backend.onrender.com`

---

## STEP 3. Vercel.com에 프론트엔드 웹사이트 배포하기 🎨

1. [Vercel.com](https://vercel.com/) 접속 ➔ GitHub 계정으로 로그인
2. 대시보드 ➔ **`Add New...`** ➔ **`Project`** 클릭
3. `Liar_Game` 리포지토리 옆의 **`Import`** 버튼 클릭
4. **Environment Variables (환경 변수) 설정 (중요!!)**:
   - Expand `Environment Variables` 클릭
   - **Key**: `VITE_BACKEND_URL`
   - **Value**: Render에서 받은 백엔드 URL 입력 (예: `https://liar-game-backend.onrender.com`)
   - `Add` 버튼 클릭!
5. 맨 아래 **`Deploy`** 버튼 클릭!
6. 약 30초~1분 후 축하 폭죽과 함께 내 게임 주소가 생성됩니다:
   👉 예시: `https://liar-game-xyz.vercel.app`

---

## STEP 4. 친구들과 즐겁게 게임 플레이! 🎉

- Vercel에서 발급받은 주소(`https://liar-game-xyz.vercel.app`)를 카카오톡이나 단톡방에 친구들에게 전달합니다.
- 모바일 스마트폰, 태블릿, PC 어디서나 브라우저로 접속하여 24시간 실시간 라이어 게임을 자유롭게 즐기실 수 있습니다!
