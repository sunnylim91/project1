# 측량 및 지형공간정보기술사 AI 답안 생성기

측지기술사 기출문제 DB를 기반으로 Claude AI가 기술사 수준의 모범답안을 생성하는 학습 보조 도구입니다.

---

## 설치 및 실행

### 1. 패키지 설치
```bash
npm install
```

### 2. 환경변수 설정
프로젝트 루트의 `.env` 파일을 열고 Anthropic API 키를 입력합니다:
```
VITE_ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx
```

> **보안 주의**: Vite 환경변수는 번들에 포함되어 브라우저에 노출됩니다.
> 공개 배포 시 반드시 백엔드 프록시 서버를 통해 API 키를 보호하세요.

### 3. 기출문제 DB 초기화
`문제만.xlsx` 파일이 프로젝트 상위 폴더에 있는 상태에서 실행합니다:
```bash
python scripts/convert_xlsx.py
```
→ `public/db/questions.json` 및 `src/data/questions.json` 자동 생성

### 4. 개발 서버 실행
```bash
npm run dev
```
브라우저에서 `http://localhost:5173` 접속

---

## 기출문제 DB 업데이트

1. `문제만.xlsx` 파일을 최신 버전으로 교체
2. 변환 스크립트 재실행:
   ```bash
   python scripts/convert_xlsx.py
   ```
3. 개발 서버 재시작 (또는 `public/db/questions.json` 변경 시 자동 반영)

---

## 빌드

```bash
npm run build
```
→ `dist/` 폴더 생성 (정적 파일 — 웹서버 또는 CDN으로 서빙)

### 배포 옵션
| 플랫폼 | 방법 |
|--------|------|
| Netlify | `dist/` 폴더 Drag & Drop 또는 `netlify deploy` |
| Vercel  | `vercel --prod` |
| Nginx   | `dist/` 폴더를 웹루트로 설정 |

> gzip 압축: Netlify·Vercel은 자동 적용됩니다.
> Nginx 직접 서빙 시 `gzip on;` 설정 권장.

---

## 프로젝트 구조

```
geo-exam/
├── public/db/questions.json     ← 기출문제 DB (convert_xlsx.py 생성)
├── src/
│   ├── components/
│   │   ├── Layout.jsx           ← 공통 네비게이션/레이아웃
│   │   └── ErrorBoundary.jsx    ← 전역 에러 처리
│   ├── pages/
│   │   ├── HomePage.jsx         ← 메인 대시보드 (/)
│   │   ├── BrowserPage.jsx      ← 기출문제 브라우저 (/browser)
│   │   ├── AnswerPage.jsx       ← AI 답안 생성 (/answer)
│   │   └── TrendPage.jsx        ← 출제경향 분석 (/trend)
│   ├── utils/
│   │   ├── answerEngine.js      ← 프롬프트 빌더 + 스트리밍 API
│   │   ├── cache.js             ← SHA-256 기반 인메모리 캐시
│   │   ├── classifier.js        ← 문제 유형 분류
│   │   ├── searcher.js          ← DB 검색/필터
│   │   └── validator.js         ← 품질 검증 (8항목 채점)
│   ├── styles/
│   │   └── print.css            ← A4 인쇄 전용 스타일
│   └── index.css
├── scripts/
│   └── convert_xlsx.py          ← 엑셀 → JSON 변환
├── .env                         ← API 키 (git에 커밋하지 마세요)
└── vite.config.js
```

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| 기출문제 DB | 2009~2026년 35개 회차 1,083문제 |
| 문제 유형 자동분류 | 용어형 / 설명형 / 논술형 / 비교형 |
| AI 답안 생성 | Claude Sonnet 스트리밍 실시간 출력 |
| 품질 검증 | 8개 항목 100점 채점 + 자동 수정 |
| 인메모리 캐시 | 동일 문제 재요청 시 API 미호출 (sessionStorage) |
| 출제경향 분석 | 연도별/유형별/주제별 차트 + 예상문제 10선 |
| A4 인쇄 최적화 | 답안만 인쇄, 상하 20mm / 좌우 25mm |

---

## 의존 패키지

**npm**
```
react, react-dom, react-router-dom
recharts, lucide-react
react-markdown, remark-gfm
tailwindcss, @tailwindcss/vite
```

**pip**
```
pandas, openpyxl
```

---

## 라이선스

개인 학습 목적 사용. 기출문제 저작권은 한국산업인력공단에 있습니다.
