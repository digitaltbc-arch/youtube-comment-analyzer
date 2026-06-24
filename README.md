# 유튜브 댓글 분석기

YouTube 영상의 댓글을 **YouTube Data API**로 수집하고, **OpenAI GPT-4o-mini**로 심층 분석하는 웹 서비스입니다.

## 주요 기능

- YouTube URL / 영상 ID / Shorts 링크 지원
- 댓글 최대 200개 수집 (50 / 100 / 150 / 200개 선택)
- **대시보드**: 감성 점수, 도넛 차트, 화제 막대 차트, 키워드 클라우드
- **인사이트**: 긍정 하이라이트, 우려·비판 댓글, 시청자 프로필, 개선 제안
- 참여 지표 분석 (좋아요 참여율 / 댓글 참여율)
- 댓글 원본 목록 열람

## 시작하기

### 1. 레포지토리 클론

```bash
git clone https://github.com/digitaltbc-arch/youtube-comment-analyzer.git
cd youtube-comment-analyzer
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경 변수 설정

`.env.example`을 복사해서 `.env.local`을 만들고 API 키를 입력합니다.

```bash
cp .env.example .env.local
```

`.env.local` 파일을 열어 아래 두 값을 채웁니다:

```env
YOUTUBE_API_KEY=여기에_유튜브_API_키_입력
OPENAI_API_KEY=여기에_OpenAI_API_키_입력
```

| 변수 | 발급 경로 |
|------|----------|
| `YOUTUBE_API_KEY` | [Google Cloud Console](https://console.cloud.google.com/) → API 및 서비스 → YouTube Data API v3 사용 설정 |
| `OPENAI_API_KEY` | [OpenAI Platform](https://platform.openai.com/api-keys) → API Keys |

> ⚠️ `.env.local`은 `.gitignore`에 포함되어 있어 GitHub에 절대 올라가지 않습니다.

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 에 접속합니다.

## 사용 방법

1. YouTube 영상 URL 또는 영상 ID를 검색창에 입력
2. 수집할 댓글 수를 선택 (50 / 100 / 150 / 200개)
3. **분석 시작** 버튼 클릭
4. 댓글 수집 완료 후 AI가 자동으로 분석 시작 (약 10~20초)
5. **대시보드** / **인사이트** / **댓글 목록** 탭에서 결과 확인

## 기술 스택

| 분류 | 기술 |
|------|------|
| 프레임워크 | Next.js 15 (App Router) |
| 언어 | TypeScript |
| 스타일 | Tailwind CSS v4 |
| 댓글 수집 | YouTube Data API v3 |
| AI 분석 | OpenAI GPT-4o-mini |

## 프로젝트 구조

```
app/
├── api/
│   ├── comments/route.ts   # YouTube 댓글 수집 API
│   └── analyze/route.ts    # OpenAI 분석 API
├── globals.css
├── layout.tsx
└── page.tsx                # 메인 UI (대시보드)
.env.example                # 환경 변수 템플릿
.env.local                  # 실제 API 키 (gitignore)
```
