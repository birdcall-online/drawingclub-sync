# Drawing Club Sync

Discord 채널에 올라온 **그림 이미지**를 자동으로 **Are.na 채널**에 옮겨주는 프로그램입니다.

- 참가자가 Discord Drawing Club 채널에 그림을 올립니다.
- 이 프로그램이 이미지를 찾아서, 그 참가자의 Are.na 채널에 업로드합니다.
- GitHub가 **6시간마다** 알아서 실행하기 때문에 평소에는 아무것도 하지 않아도 됩니다.

---

## 새로운 Drawing Club을 시작할 때

### 한눈에 보는 체크리스트

- [ ] 1. Discord 봇이 새 채널을 읽을 수 있게 설정했다
- [ ] 2. 새 Discord 채널 ID를 알아냈다
- [ ] 3. 참가자 명단(Google Sheets)을 만들고 시트 주소를 복사했다
- [ ] 4. Are.na에 참가자별 채널을 만들었다
- [ ] 5. GitHub **Variables** 3개(`DISCORD_CHANNEL_ID`, `SHEET_URL`, `ARENA_CHANNEL`)를 바꿨다
- [ ] 6. `state.json` 파일을 삭제했다
- [ ] 7. Actions에서 수동으로 1번 실행했다

---

### 1. Discord 봇 권한 설정

Discord 버드콜 서버에서 `mole#6282` 봇이 **새 Drawing Club 채널의 메시지를 읽을 수 있어야** 합니다.

- 서버 설정 → **역할(Roles)** 에서 봇에게 새 채널을 볼 수 있는 역할을 추가해주세요.
- 이 설정을 빼먹으면 프로그램이 채널을 읽지 못하고 에러로 멈춥니다.

### 2. Discord 채널 ID 알아내기

1. Discord에서 **사용자 설정 → 고급 → 개발자 모드**를 켭니다. (처음 한 번만 하면 됩니다.)
2. 새 Drawing Club 채널을 **우클릭 → 채널 ID 복사(Copy Channel ID)** 를 누릅니다.
3. 복사한 숫자(예: `1234567890123456789`)를 메모해 둡니다.

### 3. 참가자 명단 만들기 (Google Sheets)

**3-1. 시트 만들기**

Google Sheets에 아래 형식으로 참가자 명단을 만듭니다.

| Discord 유저 ID | Are.na slug |
|---|---|
| 111111111111111111 | birdcall-drawing-club/birdcalldrawingclub-hong |
| 222222222222222222 | birdcall-drawing-club/birdcalldrawingclub-kim |

- **첫 줄은 제목 줄**입니다. 내용은 아무거나 괜찮지만 반드시 있어야 합니다.
- 왼쪽은 참가자의 Discord 유저 ID, 오른쪽은 그 사람의 Are.na 채널 주소입니다.
- ⚠️ **채널에 그림을 올리는 모든 사람이 명단에 있어야 합니다.** 명단에 없는 사람이 그림을 올리면 프로그램이 멈춥니다.
- 유저 ID는 Discord에서 그 사람을 우클릭 → **사용자 ID 복사**로 알아냅니다.

**3-2. 공유 설정**

시트의 **공유** 버튼 → 일반 액세스를 **"링크가 있는 모든 사용자 / 뷰어"** 로 바꿔주세요. 이렇게 하지 않으면 프로그램이 명단을 읽지 못합니다.

**3-3. 시트 주소 복사하기**

명단이 있는 **시트(탭)를 연 상태에서** 브라우저 주소창의 주소를 그대로 복사합니다. 이게 전부입니다.

```
https://docs.google.com/spreadsheets/d/1SlQMbEAF0jBjQiSAti5uTNDOJGoj5Ebz7rdyrPMzEmk/edit?gid=651847690#gid=651847690
```

- 주소 끝의 `gid=숫자` 가 **어느 탭을 읽을지** 정합니다. 시트에 탭이 여러 개라면 **명단이 있는 탭을 클릭한 뒤** 주소를 복사하세요.
- CSV 주소로 바꾸는 작업은 프로그램이 알아서 합니다.

### 4. Are.na 채널 준비

- 참가자 한 명당 Are.na 채널이 **미리 만들어져 있어야** 합니다.
- 채널 주소는 `birdcalldrawingclub-` 로 시작해야 하고, 위 명단의 Are.na slug와 맞아야 합니다.
- 채널은 `birdcall-drawing-club` 그룹 안에 있어야 합니다.

### 5. GitHub Variables 바꾸기

1. 이 저장소의 **Settings** 탭 → 왼쪽 **Secrets and variables** → **Actions** 로 이동합니다.
2. 위쪽의 **Variables** 탭을 클릭합니다. (⚠️ Secrets 탭이 아닙니다.)
3. 아래 항목을 바꿉니다. 항목 오른쪽 **연필 아이콘**을 누르고, 값을 붙여넣은 뒤 **Update variable** 을 누릅니다.

| 이름 | 바꿔야 하나요? | 넣을 값 |
|---|---|---|
| `DISCORD_CHANNEL_ID` | ✅ **바꿈** | 2번에서 복사한 Discord 채널 ID |
| `SHEET_URL` | ✅ **바꿈** | 3번에서 복사한 구글 시트 주소 |
| `ARENA_CHANNEL` | ✅ **바꿈** | 새 프로그램의 Are.na 값 (이전 프로그램 값과 같은 형식으로 입력). 데이터 추출이 이 값을 기준으로 동작합니다. |
| `ARENA_GROUP` | 보통 그대로 | 같은 Are.na 그룹을 계속 쓰면 그대로 둡니다 |

> 🔒 `DISCORD_TOKEN`, `ARENA_TOKEN` 은 비밀번호 같은 값이라 **Secrets** 탭에 따로 저장되어 있습니다. 새 프로그램을 시작할 때는 **건드리지 않아도 됩니다.**

### 6. state.json 삭제하기

`state.json`은 "어디까지 옮겼는지"를 기억해두는 파일입니다. 새 프로그램을 시작할 때는 이 기록을 **지워야** 합니다.

1. 저장소 첫 화면에서 `state.json` 파일을 클릭합니다.
2. 오른쪽 위 **⋯ (점 세 개)** 메뉴 → **Delete file** 을 누릅니다.
3. 아래로 내려가 **Commit changes** 를 눌러 저장합니다.

파일을 지우면 다음 실행 때 프로그램이 **새 채널의 첫 번째 메시지부터** 자동으로 새 `state.json`을 만들어서 시작합니다. 직접 만들거나 고칠 필요가 없습니다.

> ⚠️ 반드시 5번(Variables 변경)을 **먼저** 끝낸 뒤에 지우세요. 순서가 바뀌면 이전 프로그램 채널을 기준으로 새로 만들어집니다.

### 7. 처음 1번은 직접 실행하기

1. 저장소 위쪽의 **Actions** 탭을 클릭합니다.
2. 왼쪽 목록에서 **Sync Discord Images to Are.na** 를 클릭합니다.
3. 오른쪽의 **Run workflow** 버튼을 누릅니다.
4. **실행할 작업**에서 `sync` 를 선택하고 초록색 **Run workflow** 를 누릅니다.
5. 잠시 후 목록에 새 실행이 나타납니다. 초록색 ✅ 면 성공입니다.

실행이 끝나면 Are.na 채널에 그림이 올라와 있는지, 그리고 `state.json` 파일이 새로 생겼는지 확인해보세요. 이후로는 6시간마다 자동으로 새 그림만 옮겨집니다.

---

## 특정 프로그램의 데이터만 추출하기

Are.na 채널의 데이터를 **프로그램별로** 뽑아볼 수 있습니다. 그림 동기화는 건드리지 않고 데이터 추출만 따로 실행합니다.

1. **Settings → Secrets and variables → Actions → Variables** 탭에서 `ARENA_CHANNEL` 값을 뽑고 싶은 프로그램의 값으로 바꿉니다. (연필 아이콘 → **Update variable**)
2. **Actions** 탭 → 왼쪽의 **Sync Discord Images to Are.na** 를 클릭합니다.
3. **Run workflow** 버튼을 누르고, **실행할 작업** 드롭다운에서 **`data`** 를 선택한 뒤 초록색 **Run workflow** 를 누릅니다.
4. 실행이 끝나면 저장소의 **`data` 폴더**와 **`list.json`** 파일에 결과가 저장됩니다. (커밋 메시지: `update data`)

**실행할 작업 선택지**

| 선택 | 하는 일 |
|---|---|
| `sync` | Discord 그림을 Are.na로 옮기기만 합니다. |
| `data` | 데이터 추출만 합니다. 그림 동기화와 `state.json` 은 건드리지 않습니다. |
| `all` | 둘 다 실행합니다. 6시간마다 자동 실행되는 것도 이 방식입니다. |

> ⚠️ 6시간마다 도는 자동 실행도 데이터 추출을 함께 하므로, 그때는 **그 시점의 `ARENA_CHANNEL` 값** 기준으로 `data` 폴더가 갱신됩니다. 새 프로그램을 시작할 때 5번에서 `ARENA_CHANNEL` 을 새 프로그램 값으로 바꿔두는 이유가 이것입니다. 지난 프로그램의 데이터만 따로 뽑아본 뒤에는, 현재 진행 중인 프로그램 값으로 `ARENA_CHANNEL` 을 되돌려 놓으세요.
