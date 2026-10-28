### 새로운 Drawing Club을 진행하는 경우

#### 1. Discord 봇 권한 설정

Discord 버드콜 서버에서 `mole#6282` 봇의 Roles에 동기화할 채널의 역할을 추가해주세요.
새로운 Drawing Club 채널에서도 봇이 해당 채널의 메시지를 읽을 수 있도록, 해당 채널에 필요한 역할을 봇에 부여해야 합니다.

#### 2. GitHub Secrets 변경

GitHub Repository의 **Settings → Secrets and variables → Actions → Secrets**에서 다음 값을 변경합니다.

| Name                 | 변경 여부 | Value                          |
| -------------------- | --------- | ------------------------------ |
| `CSV_URL`            | **변경**  | Google Sheets의 CSV export URL |
| `DISCORD_CHANNEL_ID` | **변경**  | 동기화할 Discord 채널의 ID     |
| `ARENA_GROUP`        | 상황에 따라 | Are.na 그룹 ID               |
| `DISCORD_TOKEN`      | 변경 안 함 | Discord Bot Token             |
| `ARENA_TOKEN`        | 변경 안 함 | Are.na API Token              |

* `CSV_URL` — 새로운 Google Sheets의 CSV export URL (아래 참고)
* `DISCORD_CHANNEL_ID` — 새로운 Discord 채널의 ID. Discord에서 해당 채널을 우클릭 → **Copy Channel ID**를 선택하여 확인합니다. (개발자 모드가 켜져 있어야 합니다.)
* `ARENA_GROUP` — 기존과 같은 Are.na 그룹(`birdcall-drawing-club`)을 계속 사용한다면 변경하지 않습니다. 다른 그룹을 사용하는 경우에만 해당 그룹의 ID로 변경합니다.

**`DISCORD_TOKEN`과 `ARENA_TOKEN`은 별도로 변경할 필요가 없습니다.**

> ⚠️ 코드에는 `birdcall-drawing-club/birdcalldrawingclub-`(CSV의 Are.na slug)와 `birdcalldrawingclub-`(Are.na 채널 slug) 접두사가 하드코딩되어 있습니다. 새 Drawing Club의 slug 규칙이 다르다면 코드도 함께 수정해야 합니다.

#### 3. CSV_URL 만들기

Google Sheets에서 사용할 시트를 선택한 후, 해당 시트의 `gid`를 확인하여 다음 형식으로 CSV export URL을 만듭니다.

```text
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/export?format=csv&gid=SHEET_GID
```

예:

```text
https://docs.google.com/spreadsheets/d/1SlQMbEAF0jBjQiSAti5uTNDOJGoj5Ebz7rdyrPMzEmk/export?format=csv&gid=651847690
```

* `SPREADSHEET_ID` — Google Sheets URL에 포함된 스프레드시트 ID
* `SHEET_GID` — 데이터를 가져올 시트(tab)의 ID

만든 CSV export URL을 `CSV_URL` Secret에 입력합니다.

CSV의 형식은 첫 줄이 헤더이고, 이후 각 줄이 `Discord 유저 ID,Are.na slug` 입니다.
새 채널에 이미지를 올리는 **모든 유저가 CSV에 등록**되어 있어야 하며, 없는 유저가 있으면 동기화가 중단됩니다.

#### 4. state.json 초기화

이 프로그램은 `state.json`이 **없으면 에러로 종료**됩니다. 따라서 삭제하지 말고, 아래처럼 **초기화한 내용으로 수정**하여 커밋합니다.

```json
{
  "time": null,
  "messageId": "새 채널의 첫 번째 메시지 ID",
  "imageIndex": -1,
  "userId": null,
  "channelSlug": null,
  "url": null
}
```

* `messageId` — 새 Discord 채널의 **첫 번째 메시지 ID**입니다. 해당 메시지를 우클릭 → **Copy Message ID**로 확인하며, 반드시 따옴표로 감싼 문자열이어야 합니다.
* `imageIndex` — `-1`로 설정하면 첫 메시지의 첫 번째 이미지(0번)부터 업로드됩니다.
* 나머지 값은 모두 `null`로 둡니다.

기존 `state.json`을 그대로 두면 이전 채널의 메시지 ID를 기준으로 동작하여 오류가 나므로 반드시 초기화해야 합니다.

> ⚠️ `messageId`를 `null`로 두면 "처음부터"가 아니라 채널의 **가장 최신 메시지 100개**부터 가져옵니다. 처음부터 동기화하려면 반드시 첫 메시지 ID를 넣어주세요.

#### 5. 최초 1회 수동 실행

새로운 설정을 완료한 후에는 **GitHub Actions를 최초 1회 수동으로 실행하세요.**

1. GitHub Repository의 **Actions** 탭으로 이동합니다.
2. 왼쪽의 **Sync Discord Images to Are.na**를 클릭합니다.
3. 오른쪽의 **Run workflow** 버튼을 클릭하여 실행합니다.
4. workflow가 성공적으로 완료되었는지 확인합니다.

최초 실행에서는 `state.json`에 지정한 첫 메시지부터 Discord 메시지를 가져와 업로드합니다.

실행이 완료되면 `state.json`이 마지막으로 업로드한 메시지 기준으로 **갱신**되며, 이후부터는 저장된 `messageId`와 `imageIndex`를 기준으로 새로운 메시지만 처리합니다.

#### 실행 전 체크리스트

- [ ] 봇에 새 채널 읽기 권한(역할)을 부여했다
- [ ] `CSV_URL`, `DISCORD_CHANNEL_ID`(필요하면 `ARENA_GROUP`)를 변경했다
- [ ] CSV에 새 채널의 모든 참가자가 등록되어 있다
- [ ] Are.na에 참가자별 채널이 미리 생성되어 있다
- [ ] `state.json`을 초기화하여 커밋했다