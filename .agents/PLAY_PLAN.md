# [최종 기획서 v6] 라이어 게임 1인 모드 & 2인 이상 모드 전체 진행 스펙

본 문서는 1인 라이어 모드의 룰렛 적용 코멘트("1인 모드 룰렛에 걸린 사람이 라이어로 지목")까지 완벽히 반영된 최종 v6 공식 기획서입니다.

---

## 🎯 1인 라이어 모드 핵심 룰 (Liar = 1명)

1. **1라운드 힌트 발언 (각 20초):** 순서대로 발언. 자기 턴에만 대화 가능 (`[발언 완료 ➔]` 버튼으로 넘기기 가능).
2. **1차 자유 토론 (40초) & 1차 투표 (8초):** 전체 공개 상세 표 팝업.
3. **1차 투표 결과 분기:**
   * **[단일 최다 득표 시]:** 최다 득표자 5초간 **"남길 말"** ➔ 10초 자유 토론 ➔ **"80% 무죄 결정 투표 (8초)"**
     * **80% 이상 무죄 투표 시:** **2라운드 진입!** (힌트 각 6초, 기권 가능)
     * **80% 미만 무죄 투표 시:** **즉시 라이어 지목 확정 & 정체 공개!**
   * **[동률 발생 시]:** 동률 대상자 5초간 **"자기 변호"** ➔ 재투표(5초). 
     * 재투표에서도 또 동률 시 **`🎰 단죄 룰렛`** 가동 ➔ **룰렛에 걸린 사람이 라이어 후보로 즉시 지목!**

---

## 🎯 2인 이상 라이어 모드 핵심 룰 (Liar N명)

1. **1라운드 힌트 발언 (각 20초) ➔ 자유 토론 (40초) ➔ 1차 투표 (8초)**
2. **1차 투표 결과 분기:**
   * **Case A (N명 정확히 선발):** 5초간 남길 말 ➔ **즉시 라이어 결정 확정 & 결과 결산!**
   * **Case B (N명 초과 동률):** **`🎰 生存(생존) 룰렛`** 가동 (1명 사면) ➔ 남은 N명 남길 말 ➔ **라이어 확정!**
   * **Case C (N명 미만 M명 선발):** M명 **흑백 전환 + 채팅 박탈 (탈락)** ➔ 남은 수(K = N - M 명) 들고 **2라운드 진입!**
3. **2라운드 (남은 수 K명) 투표 결과 분기:**
   * **Case A (K명 정확히 선발):** 남길 말 ➔ **라이어 확정 & 결과 결산!**
   * **Case B (K명 초과 동률):** **`🎰 사면 룰렛`** 가동 (초과자 사면) ➔ K명 라이어 확정!
   * **Case C (K명 미만 선발):** **`🎰 단죄 룰렛`** 가동 (부족한 인원 무작위 지정) ➔ K명 채우고 최종 결산!

---

## 🗺️ 1. [1인 라이어 모드] 최종 다이어그램

```mermaid
flowchart TD
    Start1["🎮 게임 시작 (1인 라이어 모드)"] --> Hint1["📢 1라운드 힌트 발언 (각 20초)"]
    Hint1 --> Discuss1["💬 1차 자유 토론 (40초)"]
    Discuss1 --> Vote1["🗳️ 1차 투표 (8초)<br/>(상세 표 전체 공개)"]
    Vote1 --> CheckVote1{"투표 결과"}

    Message1["💬 최다 득표자<br/>'남길 말' (5초)"]
    Discuss10["💬 10초 자유 토론"]
    GuiltyVote["🗳️ 유죄/무죄<br/>결정 투표 (8초)"]
    CheckGuilty{"80% 이상이<br/>무죄 투표?"}
    
    Defense1["🎤 동률 대상자<br/>'자기 변호' (5초)"]
    ReVote1["🗳️ 동률 가르기<br/>재투표 (5초)"]
    CheckReVote{"재투표 결과"}
    Roulette1["🎰 단죄 룰렛 가동!<br/>(걸린 사람이 라이어로 지목)"]

    ResultLiar1["⚖️ 라이어 지목 확정!<br/>정체 공개"]
    CheckWin1{"라이어 맞음?"}
    CitizenWin1["🏆 시민 팀 승리!"]
    LiarWin1["😈 라이어 승리!"]
    
    Round2["🔄 2라운드 진행"]
    Hint2["📢 2라운드 힌트<br/>(각 6초 / 기권가능)"]
    Vote2["🗳️ 2차 최종 투표 (8초)"]
    CheckWin2{"라이어 검출?"}
    LiarWin2["😈 라이어 승리!<br/>(동률·실패 시)"]

    CheckVote1 -- "단일 최다 득표자" --> Message1
    CheckVote1 -- "동률 발생" --> Defense1
    Defense1 --> ReVote1 --> CheckReVote
    CheckReVote -- "승자 결정" --> Message1
    CheckReVote -- "또 동률" --> Roulette1 --> Message1

    Message1 --> Discuss10 --> GuiltyVote --> CheckGuilty
    CheckGuilty -- "80% 이상 무죄 (2R 진행)" --> Round2
    CheckGuilty -- "80% 미만 무죄 (즉시 지목)" --> ResultLiar1

    ResultLiar1 --> CheckWin1
    CheckWin1 -- "맞음" --> CitizenWin1
    CheckWin1 -- "틀림" --> LiarWin1

    Round2 --> Hint2 --> Vote2 --> CheckWin2
    CheckWin2 -- "성공" --> CitizenWin1
    CheckWin2 -- "동률·실패" --> LiarWin2
```

---

## 🗺️ 2. [2인 이상 라이어 모드] 최종 다이어그램

```mermaid
flowchart TD
    Start2["🎮 게임 시작 (2인 이상 라이어 모드 N명)"] --> Hint1M["📢 1라운드 힌트 (각 20초)"]
    Hint1M --> Discuss1M["💬 1차 자유 토론 (40초)"]
    Discuss1M --> Vote1M["🗳️ 1차 투표 (8초)<br/>(상세 표 공개)"]
    
    Vote1M --> CheckResult1{"1차 투표 결과<br/>(목표 N명 대비)"}
    
    CheckResult1 -- "Case A: N명 정확히 선발" --> LastWordsA["💬 N명 5초간 '남길 말'"]
    LastWordsA --> ConfirmLiarA["⚖️ 즉시 라이어 확정 & 결과 결산"]
    
    CheckResult1 -- "Case B: N명 초과 동률 발생" --> SurvivalRoulette["🎰 生存 룰렛 가동!<br/>(초과 인원 사면)"]
    SurvivalRoulette --> LastWordsA
    
    CheckResult1 -- "Case C: N명 미만 선발 (M명)" --> EliminateM["💀 M명 탈락 연출<br/>(흑백 전환 + 채팅 박탈)"]
    EliminateM --> Round2M["🔄 2라운드 진입<br/>(남은 라이어 K = N - M 명)"]
    
    Round2M --> Hint2M["📢 2라운드 힌트 (각 6초 / 기권가능)"]
    Hint2M --> Discuss2M["💬 10초 자유 토론"]
    Discuss2M --> Vote2M["🗳️ 2차 투표 (8초)"]
    
    Vote2M --> CheckResult2{"2차 투표 결과<br/>(남은 K명 대비)"}
    
    CheckResult2 -- "Case A: K명 정확히 선발" --> LastWordsB["💬 K명 5초간 '남길 말'"]
    CheckResult2 -- "Case B: K명 초과 동률 발생" --> AmnestyRoulette["🎰 사면 룰렛 가동!<br/>(초과 인원 사면)"]
    CheckResult2 -- "Case C: K명 미만 선발" --> CondemnRoulette["🎰 단죄 룰렛 가동!<br/>(부족한 인원 추첨)"]
    
    AmnestyRoulette --> LastWordsB
    CondemnRoulette --> LastWordsB
    LastWordsB --> ConfirmFinal["🏆 전원 공개 & 최종 결과 결산"]
```
