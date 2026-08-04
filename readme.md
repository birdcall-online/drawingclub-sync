1. state.json 읽기 `loadState()`
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
      ├─ 없으면 종료
      └─ 있으면 계속
      ↓
7. `findChannelId()`로 Are.na 채널 매칭
      ├─ 없으면 종료
      └─ 있으면 계속
      ↓
8. 이미지 업로드 작업(Task) 생성
      ↓
9. `createBlock()`으로 이미지를 순차적으로 업로드
      └─ 각 요청 사이에 0.5초 대기 (Rate Limit 방지)
      ↓
10. 하나라도 업로드에 실패하면 state 저장 안 함
      ↓
11. 모두 성공하면 `saveState()`로 lastMessageId 저장
