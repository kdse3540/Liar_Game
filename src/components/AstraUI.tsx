import React, { type ReactNode } from "react";

/**
 * ====================================================================
 * [초보자를 위한 UI 컴포넌트 모듈] - AstraUI 호환 컴포넌트
 * --------------------------------------------------------------------
 * 피그마 내보내기 시 사용되는 아바타, 버튼, 채팅 풍선 등의 UI 요소를
 * 로컬 React 컴포넌트로 구현해 두었습니다.
 * 수정을 원하는 경우 각 컴포넌트 내부 스타일이나 태그를 마음껏 바꾸셔도 됩니다!
 * ====================================================================
 */

// 1. 테마 제공자 (전체 앱을 감싸는 기본 컨테이너 역할을 수행합니다)
export function ThemeProvider({ children }: { children: ReactNode }) {
  return <div className="astra-theme-root">{children}</div>;
}

// 2. 아바타 컴포넌트 (선수 프로필 아이콘 / 캐릭터 표시)
export interface AvatarProps {
  type?: string;
  initials?: string;
  size?: "small" | "medium" | "large";
  shape?: "square" | "circle";
}

export function Avatar({
  initials = "/portraits/Portrait_01.png",
  size = "medium",
  shape = "square",
}: AvatarProps) {
  // 아바타 크기(width, height) 및 폰트 크기 설정
  const sizeStyle =
    size === "large"
      ? { width: "42px", height: "42px", fontSize: "24px" }
      : size === "small"
      ? { width: "24px", height: "24px", fontSize: "14px" }
      : { width: "32px", height: "32px", fontSize: "18px" };

  // 원형(circle) 또는 모서리가 둥근 사각형(square) 테두리 반경 설정
  const borderRadius = shape === "circle" ? "50%" : "12px";

  // 전달된 initials 값이 이미지 파일 경로(예: /portraits/Portrait_01.png)인지 확인
  const isImage =
    typeof initials === "string" &&
    (initials.startsWith("/") || initials.startsWith("http") || initials.startsWith("data:"));

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius,
        background: "rgba(255, 255, 255, 0.4)",
        border: "1px solid rgba(0,0,0,0.1)",
        overflow: "hidden", // 이미지가 모서리를 뚫고 나가지 않도록 숨김 처리
        ...sizeStyle,
      }}
    >
      {isImage ? (
        <img
          src={initials}
          alt="캐릭터 포트레이트"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

// 3. 버튼 컴포넌트
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
}

export function Button({ children, className = "", ...props }: ButtonProps) {
  return (
    <button className={`primary-button ${className}`} {...props}>
      {children}
    </button>
  );
}

// 4. 채팅 풍선 컴포넌트 (게임 속 대화 메시지를 나타냅니다)
export interface ChatBubblesProps {
  type?: "ai" | "user";
  text?: string;
  userAvatar?: ReactNode;
}

export function ChatBubbles({ text = "", type = "user" }: ChatBubblesProps) {
  const isAi = type === "ai";
  return (
    <div
      style={{
        padding: "8px 12px",
        borderRadius: isAi ? "4px 12px 12px 12px" : "12px 4px 12px 12px",
        background: isAi ? "#f4f1eb" : "#e5dbff",
        color: "#20212b",
        fontSize: "13px",
        fontWeight: 600,
        display: "inline-block",
      }}
    >
      <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{text}</p>
    </div>
  );
}
