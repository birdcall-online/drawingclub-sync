### 새로운 Drawing Club을 진행하는 경우

GitHub Repository의 **Settings → Secrets and variables → Actions → Secrets**에서 다음 값을 변경합니다.

| Name                 | Value                         |
| -------------------- | ----------------------------- |
| `CSV_URL`            | Google Sheets의 CSV export URL |
| `DISCORD_CHANNEL_ID` | 동기화할 Discord 채널의 ID           |
| `DISCORD_TOKEN`      | Discord Bot Token             |
| `ARENA_TOKEN`        | Are.na API Token              |
| `ARENA_GROUP`        | Are.na Group ID       |

* `CSV_URL` — 새로운 Google Sheets의 CSV export URL
* `DISCORD_CHANNEL_ID` — 새로운 Discord 채널의 ID
* `ARENA_GROUP` — 다른 Are.na 그룹을 사용하는 경우 해당 그룹의 ID `birdcall-drawing-club`

**`DISCORD_TOKEN`과 `ARENA_TOKEN`은 별도로 변경할 필요가 없습니다.**


#### CSV_URL 변경 방법

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

설정값을 변경한 후에는 기존 `state.json`을 삭제하고 커밋합니다.

`state.json`에는 마지막으로 처리한 Discord 메시지 ID(`lastMessageId`)가 저장되어 있으므로, 새로운 Drawing Club을 시작할 때 기존 파일을 그대로 사용하면 이전 채널의 메시지 ID를 기준으로 동작할 수 있습니다.

### 최초 1회 수동 실행

새로운 설정을 완료한 후에는 **GitHub Actions를 최초 1회 수동으로 실행하세요.**

1. GitHub Repository의 **Actions** 탭으로 이동합니다.
2. 왼쪽의 **Sync Discord Images to Are.na** 클릭합니다.
3. 오른쪽의 **Run workflow** 버튼을 클릭하여 실행합니다.
4. workflow가 성공적으로 완료되었는지 확인합니다.

최초 실행에서는 새로운 설정을 기준으로 Discord 메시지를 처음부터 가져옵니다.

실행이 완료되면 `state.json`이 새로 생성되며, 이후부터는 저장된 `lastMessageId`를 기준으로 새로운 메시지만 처리합니다.
