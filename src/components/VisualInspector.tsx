import { useState, useEffect } from "react";

/**
 * ====================================================================
 * [Visual Inspector - UI 수정 지시 시각적 픽 도구]
 * --------------------------------------------------------------------
 * 사용자가 웹 화면에서 원하는 UI 요소를 마우스로 콕 클릭하면
 * 위치 정보와 텍스트 내용이 담긴 지시문이 자동으로 생성되어
 * 클립보드에 복사되고 팝업창으로도 바로 보여주는 도구입니다.
 * ====================================================================
 */
interface VisualInspectorProps {
  currentScreen?: string;
}

export function VisualInspector({ currentScreen = "알수없음" }: VisualInspectorProps) {
  // 1. 상태 관리 (State)
  const [isActive, setIsActive] = useState(false); // 지시 모드 활성화 여부
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null); // 현재 마우스가 올라간 요소
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null); // 생성된 지시문 텍스트 (모달 표시용)
  const [rect, setRect] = useState<DOMRect | null>(null); // 호버 박스의 위치/크기 좌표 정보
  const [isCopiedSuccess, setIsCopiedSuccess] = useState(false);

  // 2. 100% 클립보드 복사 보장 함수 (Legacy Fallback 지원)
  const copyTextToClipboard = (text: string): boolean => {
    try {
      // Modern API 시도
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // 에러 시 아래 fallback 구문 실행
    }

    // Fallback: 임시 텍스트 영역 생성 후 execCommand 사용
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "-9999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textarea);
      return successful;
    } catch {
      return false;
    }
  };

  // 3. 마우스 이동 시 대상 요소 추적
  useEffect(() => {
    if (!isActive) {
      setHoveredElement(null);
      setRect(null);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(".visual-inspector-ui")) return;

      setHoveredElement(target);
      setRect(target.getBoundingClientRect());
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [isActive]);

  // 4. 클릭 시 요소를 감지하고 지시문 텍스트 생성 및 자동 복사
  useEffect(() => {
    if (!isActive) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(".visual-inspector-ui")) return;

      e.preventDefault();
      e.stopPropagation();

      // 요소 선택자 및 정보 추출
      const tagName = target.tagName.toLowerCase();
      const rawClass = target.className && typeof target.className === "string" ? target.className : "";
      const className = rawClass ? `.${rawClass.split(" ").filter(c => !c.startsWith("visual-")).join(".")}` : "";
      const textContent = (target.innerText || target.textContent || "").trim().slice(0, 30).replace(/\n/g, " ");

      // AI 에이전트 전송용 지시문 텍스트 구성
      const promptText = `[UI 수정 요청] 위치: [화면: ${currentScreen} / 선택자: <${tagName}${className}> / 내용: "${textContent}"] ➔ 이 부분을 수정하고 싶어: `;

      // 클립보드 복사 실행
      const success = copyTextToClipboard(promptText);
      setIsCopiedSuccess(success);
      setCopiedPrompt(promptText);

      // 클릭 후 연속 선택을 위해 모드는 켜둔 채로 팝업만 띄움
    };

    window.addEventListener("click", handleClick, true);
    return () => window.removeEventListener("click", handleClick, true);
  }, [isActive, currentScreen]);

  return (
    <div className="visual-inspector-ui">
      {/* 1. 화면 우측 하단 지시 모드 On/Off 스위치 버튼 */}
      <button
        type="button"
        onClick={() => {
          setIsActive(!isActive);
          if (isActive) {
            setCopiedPrompt(null);
          }
        }}
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 999999,
          padding: "12px 18px",
          borderRadius: "99px",
          border: isActive ? "3px solid #ff4785" : "2px solid #635bff",
          backgroundColor: isActive ? "#ff4785" : "#635bff",
          color: "#ffffff",
          fontWeight: "bold",
          fontSize: "14px",
          boxShadow: isActive ? "0 0 20px rgba(255, 71, 133, 0.6)" : "0 4px 14px rgba(99, 91, 255, 0.4)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          transition: "all 0.2s ease",
        }}
      >
        <span>{isActive ? "🎯 선택 모드 켜짐 (클릭 시 선택)" : "🎯 UI 수정 위치 선택기 켜기"}</span>
      </button>

      {/* 2. 요소 호버 시 보라색 테두리 아웃라인 하이라이터 */}
      {isActive && rect && (
        <div
          style={{
            position: "fixed",
            top: `${rect.top}px`,
            left: `${rect.left}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
            border: "3px dashed #ff4785",
            backgroundColor: "rgba(255, 71, 133, 0.15)",
            pointerEvents: "none",
            zIndex: 999998,
            borderRadius: "6px",
            boxSizing: "border-box",
            transition: "all 0.05s ease-out",
          }}
        >
          {/* 현재 짚은 요소 태그 툴팁 */}
          <span
            style={{
              position: "absolute",
              top: "-28px",
              left: "0",
              backgroundColor: "#ff4785",
              color: "#fff",
              fontSize: "11px",
              fontWeight: "bold",
              padding: "2px 8px",
              borderRadius: "4px",
              whiteSpace: "nowrap",
            }}
          >
            {hoveredElement?.tagName.toLowerCase()}{hoveredElement?.className && typeof hoveredElement.className === "string" ? `.${hoveredElement.className.slice(0, 20)}` : ""} (클릭 시 선택)
          </span>
        </div>
      )}

      {/* 3. 선택 성공 지시문 팝업 모달 (복사 상태 안내 및 원터치 복사 지원) */}
      {copiedPrompt && (
        <div
          style={{
            position: "fixed",
            bottom: "84px",
            right: "24px",
            zIndex: 999999,
            padding: "18px 20px",
            borderRadius: "18px",
            backgroundColor: "#fffdf9",
            color: "#20212b",
            border: "3px solid #ff4785",
            boxShadow: "0 10px 35px rgba(0, 0, 0, 0.25)",
            width: "360px",
            fontSize: "13px",
            lineHeight: "1.5",
            animation: "popIn 0.3s ease",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <b style={{ color: "#ff4785", fontSize: "14px" }}>
              {isCopiedSuccess ? "✨ 클립보드에 자동 복사됨!" : "📌 선택된 UI 지시문"}
            </b>
            <button
              type="button"
              onClick={() => setCopiedPrompt(null)}
              style={{ border: 0, background: "none", color: "#999", fontSize: "16px", cursor: "pointer", fontWeight: "bold" }}
            >
              ✕
            </button>
          </div>

          <p style={{ margin: "0 0 8px 0", color: "#555", fontSize: "12px" }}>
            아래 지시문 텍스트를 AI 대화창에 <b>Ctrl+V(붙여넣기)</b> 하거나 [복사하기] 버튼을 누르세요:
          </p>

          <textarea
            readOnly
            value={copiedPrompt}
            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            style={{
              width: "100%",
              height: "70px",
              borderRadius: "10px",
              border: "1px solid #ded7ca",
              padding: "8px 10px",
              fontSize: "12px",
              fontWeight: "bold",
              color: "#333",
              backgroundColor: "#f7f4ee",
              resize: "none",
              outlineColor: "#ff4785",
            }}
          />

          <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
            <button
              type="button"
              onClick={() => {
                copyTextToClipboard(copiedPrompt);
                setIsCopiedSuccess(true);
              }}
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: "8px",
                border: 0,
                backgroundColor: "#ff4785",
                color: "#fff",
                fontWeight: "bold",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              📋 다시 복사하기
            </button>
            <button
              type="button"
              onClick={() => setCopiedPrompt(null)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #ddd",
                backgroundColor: "#fff",
                color: "#555",
                fontWeight: "bold",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
