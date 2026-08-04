## Initial Setup

1. Discord 설정에서 개발자 모드 활성화

2. `.env` 파일 생성 및 Discord, Are.na, CSV 관련 환경 변수 설정

3. 기존에 수동 업로드한 마지막 Discord 메시지 ID 확인

4. `state.json` 생성 후 `lastMessageId` 저장


## Workflow

1. `state.json` 읽기 `loadState()`
      ↓
2. Are.na 그룹의 채널 목록 가져오기 `getChannels()`
      ↓
3. Google Sheets CSV 사용자 정보 가져오기 `getMembers()`
      ↓
4. Discord의 새 메시지 가져오기 `getMessages()`
      ↓
5. 이미지가 포함된 메시지만 추출
      ↓
6. Discord 사용자와 CSV 정보 일치 여부 확인
      ├─ 일치하지 않는 사용자 존재 → 전체 작업 취소
      └─ 모두 일치 → 계속
      ↓
7. `findChannelId()`로 Are.na 채널 매칭
      ├─ 매칭되지 않는 채널 존재 → 전체 작업 취소
      └─ 모두 매칭 → 계속
      ↓
8. 이미지 업로드 작업(Task) 생성
      ↓
9. `createBlock()`으로 이미지를 순차적으로 업로드
      └─ 각 요청 사이에 0.5초 대기 (Rate Limit 방지)
      ↓
10. 하나라도 업로드 실패 → state 저장 안 함
      ↓
11. 모두 성공 → `saveState()`로 `lastMessageId` 저장
