import { io, Socket } from "socket.io-client";

/**
 * [프론트엔드 소켓 연결 서비스 - socket.ts]
 * --------------------------------------------------------------------
 * 현재 브라우저의 IP(hostname)를 자동으로 감지하여
 * 4000번 포트의 백엔드 소켓 서버와 연결을 수립합니다.
 * (예: localhost -> http://localhost:4000 , 192.168.75.196 -> http://192.168.75.196:4000)
 * --------------------------------------------------------------------
 */

const getBackendUrl = () => {
  // 1) 배포 환경변수(VITE_BACKEND_URL)가 지정되어 있으면 최우선 적용 (예: Render/Railway 소켓 서버)
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }
  
  // 2) 브라우저 환경에서 현재 주소를 감지하여 자동 연결
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    // 로컬 및 내부망 환경인 경우 (포트 4000 소켓 백엔드 자동 바인딩)
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("192.168.")) {
      return `http://${hostname}:4000`;
    }
    // 유료 도메인 및 클라우드 배포 환경인 경우
    return window.location.origin;
  }
  
  return "http://localhost:4000";
};

// 소켓 싱글톤 인스턴스 생성
export const socket: Socket = io(getBackendUrl(), {
  autoConnect: false, // 필요할 때 socket.connect() 호출
  transports: ["websocket", "polling"],
});
