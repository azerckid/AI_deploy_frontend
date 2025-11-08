# Nomad Agents Frontend

React Router Framework Mode + Shadcn UI 기반 멀티 에이전트 대시보드입니다. 좌측에는 대화 목록, 우측에는 채팅 패널/입력창으로 구성되어 있으며, 현재는 OpenAI 백엔드 연동 전 UI 목업 상태입니다.

## 기술 스택
- React Router v7 Framework Mode
- TypeScript 5
- Tailwind CSS v4 (app/app.css 엔트리, @tailwindcss/vite 플러그인)
- Shadcn UI 구성요소(Button, Card, ScrollArea, Textarea 등)
- next-themes 기반 다크 모드 토글 준비
- Sonner 토스트 알림

## 프로젝트 스크립트
```bash
npm install           # 의존성 설치
npm run dev           # 개발 서버 (http://localhost:5173)
npm run build         # 프로덕션 번들 생성
npm run start         # 빌드 결과 실행
npm run typecheck     # router typegen + tsc
```

> Tailwind v4 CLI는 `npm run dev` 실행 시 자동으로 감지됩니다. 기존 PostCSS 설정은 필요하지 않습니다.

## UI 구조 개요
- `app/root.tsx`: ThemeProvider/Toaster 래핑 및 `app/app.css` 글로벌 스타일 로딩
- `app/routes/_index.tsx`
  - `loader`: 대화 목록 플레이스홀더 반환 (추후 Supabase/백엔드 Fetch로 대체)
  - `action`: 메시지 전송 자리 (현재 미구현)
  - 컴포넌트: 두 컬럼 레이아웃 + 채팅 패널, 낙관적 메시지 처리 데모
- `app/components/ui/*`: Shadcn UI 패턴으로 작성된 버튼, 카드, ScrollArea 등
- `tailwind.config.ts`: Tailwind v4 전용 content 스캔 범위 및 테마 토큰 구성
- `app/app.css`: 테마 변수, 다크 모드, 커스텀 유틸리티 정의

## 백엔드 연동 계획
- **대화 목록 로딩**: `loader`에서 Supabase 또는 FastAPI `/conversations` 호출 결과를 사용해 `conversations` 데이터를 채우도록 변경
- **메시지 전송**: `action` 혹은 Fetcher를 통해 `/conversations/:id/message-stream` API 호출 → 스트리밍 응답을 `setMessages`에 반영
- **실시간 상태**: 현재 `setTimeout`으로 모의 응답을 추가하는 부분을 OpenAI/Runner 스트림 이벤트로 교체 (`TODO` 주석 참고)
- **에러 처리**: Sonner 토스트를 활용해 요청 실패, 인증 만료 등을 사용자에게 안내

## 다음 단계 체크리스트
- 백엔드 응답 형식에 맞춘 타입 통합 (loader/action 공통 타입 모듈 구성)
- ThemeToggle 컴포넌트 추가 및 헤더 배치
- 모바일 레이아웃 개선(대화 목록 접기/토글)
- 테스트(Playwright 또는 React Testing Library)로 핵심 인터랙션 검증
- Tailwind 디자인 토큰을 Supabase/환경 설정과 연동하는 설정 문서화

---
UI와 상태 관리 흐름이 준비된 상태이므로, OpenAI Conversations API 연동과 Supabase 세션 관리를 이어서 진행하면 됩니다. 최신 Tailwind v4 설정(`app/app.css`, `tailwind.config.ts`)을 유지한 채 기능 구현을 진행하세요.
