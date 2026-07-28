import { useState, useEffect, useCallback } from "react";

/**
 * ====================================================================
 * [Visual Inspector - AI 수정 지시용 시각적 픽 모드]
 * --------------------------------------------------------------------
 * 코딩을 몰라도 화면의 원하는 위치를 마우스로 콕 집어
 * AI에게 전달할 수정 요청문(텍스트)을 1초 만에 복사해 주는 도구입니다.
 * ====================================================================
 */

interface VisualInspectorProps {
  currentScreen: string; // 현재 활성화된 화면 ("home" | "character" | "room" | "play")
}

interface SelectedElementInfo {
  tagName: string;
  className: string;
  innerText: string;
  rect: DOMRect;
}

export function VisualInspector({ currentScreen }: VisualInspectorProps) {
  // 1. 픽 모드 활성화 여부 (true: 켜짐, false: 꺼짐)
  const [isActive, setIsActive] = useState(false);

  // 2. 현재 마우스가 가리키고 있는 요소를 표시할 하이라이트 범위
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);

  // 3. 마우스로 클릭하여 선택한 요소 정보 & 지시문 입력 모달 관련 State
  const [selectedInfo, setSelectedInfo] = useState<SelectedElementInfo | null>(null);
  const [userComment, setUserComment] = useState("");
  const [copied, setCopied] = useState(false);

  // ------------------------------------------------------------------
  // 마우스 이동 감지 핸들러 (요소 위에 오버 시 보라색 테두리 표시)
  // ------------------------------------------------------------------
  const handleMouseOver = useCallback(
    (e: MouseEvent) => {
      if (!isActive || selectedInfo) return;

      const target = e.target as HTMLElement;
      // 인스펙터 자체 UI 요소는 하이라이트 대상에서 제외
      if (target.closest(".visual-inspector-ui")) return;

      const rect = target.getBoundingClientRect();
      setHoverRect(rect);
    },
    [isActive, selectedInfo]
  );

  // ------------------------------------------------------------------
  // 마우스 클릭 감지 핸들러 (요소 클릭 시 모달 팝업 오픈)
  // ------------------------------------------------------------------
  const handleClick = useCallback(
    (e: MouseEvent) => {
      if (!isActive || selectedInfo) return;

      const target = e.target as HTMLElement;
      if (target.closest(".visual-inspector-ui")) return;

      // 클릭 기본 동작(페이지 이동, 버튼 클릭 등) 일시 차단
      e.preventDefault();
      e.stopPropagation();

      const rect = target.getBoundingClientRect();
      const info: SelectedElementInfo = {
        tagName: target.tagName.toLowerCase(),
        className: target.className || "없음",
        innerText: target.innerText ? target.innerText.trim().slice(0, 40) : "텍스트 없음",
        rect,
      };

      setSelectedInfo(info);
    },
    [isActive, selectedInfo]
  );

  // 이벤트 리스너 등록 및 해제
  useEffect(() => {
    if (isActive) {
      window.addEventListener("mouseover", handleMouseOver);
      window.addEventListener("click", handleClick, true);
    } else {
      setHoverRect(null);
      setSelectedInfo(null);
    }

    return () => {
      window.removeEventListener("mouseover", handleMouseOver);
      window.removeEventListener("click", handleClick, true);
    };
  }, [isActive, handleMouseOver, handleClick]);

  // ------------------------------------------------------------------
  // 복사 버튼 클릭 시 AI 지시문을 생성하여 클립보드에 복사
  // ------------------------------------------------------------------
  const handleCopyPrompt = () => {
    if (!selectedInfo) return;

    // AI에게 그대로 전달할 깔끔한 지시문 양식 생성
    const promptText = `<USER_REQUEST>
[AI UI 수정 요청]
- 화면 위치: ${currentScreen.toUpperCase()} 화면
- 선택된 요소: <${selectedInfo.tagName} class="${selectedInfo.className}">
- 요소 내부 글자: "${selectedInfo.innerText}"
- 요청사항: ${userComment.trim() || "이 부분의 디자인/내용을 수정해줘."}
</USER_REQUEST>`;

    navigator.clipboard.writeText(promptText);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
      setSelectedInfo(null);
      setUserComment("");
    }, 1200);
  };

  return (
    <div className="visual-inspector-ui">
      {/* ------------------------------------------------------------------ */}
      {/* A. 우측 하단 픽 모드 토글 버튼 */}
      {/* ------------------------------------------------------------------ */}
      <button
        type="button"
        onClick={() => setIsActive(!isActive)}
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 9999,
          padding: "12px 18px",
          borderRadius: "999px",
          background: isActive ? "#ff4757" : "#7652dd",
          color: "#ffffff",
          border: "2px solid #20212b",
          boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
          fontWeight: 800,
          fontSize: "14px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          transition: "transform 0.2s, background 0.2s",
        }}
      >
        <span>🔍</span>
        <span>{isActive ? "픽 모드 끄기 [X]" : "UI 수정 지시 모드 켜기"}</span>
      </button>

      {/* ------------------------------------------------------------------ */}
      {/* B. 픽 모드가 켜졌을 때 상단 안내 바 */}
      {/* ------------------------------------------------------------------ */}
      {isActive && !selectedInfo && (
        <div
          style={{
            position: "fixed",
            top: "12px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9998,
            padding: "8px 20px",
            borderRadius: "12px",
            background: "#7652dd",
            color: "#ffffff",
            fontWeight: 700,
            fontSize: "13px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            pointerEvents: "none",
          }}
        >
          👉 수정하고 싶은 UI 요소를 마우스로 콕 클릭하세요!
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* C. 마우스 오버 시 보라색 가이드 테두리 */}
      {/* ------------------------------------------------------------------ */}
      {isActive && hoverRect && !selectedInfo && (
        <div
          style={{
            position: "fixed",
            top: `${hoverRect.top}px`,
            left: `${hoverRect.left}px`,
            width: `${hoverRect.width}px`,
            height: `${hoverRect.height}px`,
            border: "2px dashed #7652dd",
            backgroundColor: "rgba(118, 82, 221, 0.15)",
            pointerEvents: "none",
            zIndex: 9997,
            borderRadius: "4px",
            transition: "all 0.05s ease-out",
          }}
        />
      )}

      {/* ------------------------------------------------------------------ */}
      {/* D. 요소 선택 시 나타나는 수정 요청문 작성 팝업 모달 */}
      {/* ------------------------------------------------------------------ */}
      {selectedInfo && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            backgroundColor: "rgba(32, 33, 43, 0.6)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setSelectedInfo(null)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "460px",
              background: "#fffaf0",
              border: "2.5px solid #20212b",
              borderRadius: "18px",
              boxShadow: "8px 8px 0 #ffc844",
              padding: "24px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <span style={{ fontSize: "11px", fontWeight: 800, color: "#7652dd", letterSpacing: "1px" }}>
                AI UI EDIT REQUEST
              </span>
              <button
                type="button"
                onClick={() => setSelectedInfo(null)}
                style={{ border: 0, background: "transparent", fontSize: "20px", cursor: "pointer", fontWeight: 800 }}
              >
                ✕
              </button>
            </div>

            <h3 style={{ margin: "0 0 12px", fontSize: "20px", fontWeight: 800, color: "#20212b" }}>
              선택한 지점에 수정을 지시하세요
            </h3>

            {/* 감지된 요소 정보 표시 카드 */}
            <div
              style={{
                background: "#f4f1eb",
                borderRadius: "10px",
                padding: "12px",
                fontSize: "12px",
                lineHeight: "1.6",
                marginBottom: "16px",
                border: "1px solid #e8e2d6",
              }}
            >
              <div>📍 <b>화면:</b> {currentScreen.toUpperCase()}</div>
              <div>🏷️ <b>태그/클래스:</b> &lt;{selectedInfo.tagName}&gt; ({selectedInfo.className})</div>
              <div>💬 <b>내용:</b> "{selectedInfo.innerText}"</div>
            </div>

            {/* 수정 요청 내용 입력창 */}
            <label style={{ display: "block", fontSize: "12px", fontWeight: 800, marginBottom: "6px", color: "#5a5760" }}>
              어떻게 바꾸고 싶으신가요? (예: 글자색을 빨간색으로, 버튼을 더 크게 등)
            </label>
            <textarea
              autoFocus
              value={userComment}
              onChange={(e) => setUserComment(e.target.value)}
              placeholder="예: 이 버튼 색상을 빨간색으로 바꿔주고, 글씨 크기를 키워줘!"
              rows={3}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "10px",
                border: "1.5px solid #20212b",
                fontSize: "13px",
                outline: "none",
                fontFamily: "inherit",
                resize: "none",
                marginBottom: "16px",
              }}
            />

            {/* 클립보드 복사 버튼 */}
            <button
              type="button"
              onClick={handleCopyPrompt}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "12px",
                background: copied ? "#31bd80" : "#7652dd",
                color: "#ffffff",
                border: "2px solid #20212b",
                fontWeight: 800,
                fontSize: "14px",
                cursor: "pointer",
                boxShadow: "0 4px 0 #20212b",
                transition: "background 0.2s",
              }}
            >
              {copied ? "✓ 클립보드 복사 완료! (채팅창에 Ctrl+V 하세요)" : "📋 AI 지시문 복사하기 (Ctrl + C)"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
