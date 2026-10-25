# 정처기 실기 족보

정보처리기사 실기 대비 웹 — 이론 노트 · 용어집(1,339) · 개념 퀴즈(2,124) · 기출 변형/예상 모의고사(768) · 최종 모의고사 5회.
로그인 없이 동작하고, 기록은 브라우저(localStorage)에만 저장됩니다. 코드 출력·SQL 작성형은 브라우저 안에서 실제 실행(sql.js)해 채점합니다.

## 배포 (GitHub Pages)

1. GitHub에서 새 저장소를 만든다 (예: `jcg-web`, Public).
2. 이 폴더에서:
   ```bash
   git init
   git add .
   git commit -m "init"
   git branch -M main
   git remote add origin https://github.com/<아이디>/jcg-web.git
   git push -u origin main
   ```
3. 저장소 **Settings → Pages → Build and deployment → Source: GitHub Actions** 로 바꾼다.
4. 1~2분 뒤 `https://<아이디>.github.io/jcg-web/` 에서 열림. (push할 때마다 자동 재배포)

`vite.config.ts`의 `base: './'` 라 저장소 이름이 무엇이든 그대로 동작합니다.

## 로컬 실행

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/
```

## 구조

- `src/data/*.json` — 문제 은행(bank), 용어집(gloss), 개념 퀴즈(qs), 이론 노트(areas), 최종 모의고사(finals)
- `src/engine/` — 채점(grade·sql), 모의고사 조합(mock), 기록(store)
- `src/pages/` — 화면
- `public/sql-asm.js` — sql.js (asm.js 빌드, wasm 없이 동작)

## 문항 데이터 형식

`bank.json`의 각 문항:

```json
{ "id": "kv-25-1-03", "area": "net", "concept": "…", "type": "short|box|code|codeblank|sql|value",
  "stem": "…", "passage": "( ① ) …", "box": ["…"], "blanks": [{"label": "①", "answer": "…", "accept": ["…"]}],
  "code": {"lang": "c|java|python", "src": "…"}, "sql": {"tables": [...], "kind": "select|dml", "expect": "…"},
  "trap": "…", "explain": "…", "kv": "25-1-03" }
```

- `kv`는 기출 회차·번호 기반 **변형** 문항(원문 아님), `pred`는 예상 문항.
- 코드 문항 정답은 실제 컴파일·실행 결과로 검증한 값입니다.
