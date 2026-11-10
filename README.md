# 티켓체크 MVP

트위터(X) 티켓 양도 전에 거래 상황과 양도글·DM의 위험 신호를 확인하는 한국어 MVP입니다.

`index.html` 하나에 화면, 스타일, 동작을 포함합니다. 휴대전화 화면에서도 어절 단위로 줄바꿈합니다.

- 거래 체크리스트와 규칙 기반 텍스트 분석은 실제 입력으로 동작합니다.
- 사기 이력 조회는 샘플 전용입니다. 로그인은 Google OAuth와 Supabase Auth를 사용하는 실제 로그인입니다.
- PKCE로 로그인하고 새로고침 시 계정을 확인하며, AI 서버도 Supabase에서 사용자 토큰을 검증합니다.
- 출시 알림 신청의 이름·연락처·남긴 말은 Supabase `launch_signups` 표에 저장됩니다.
- 브라우저에는 공개용 publishable 키만 사용합니다. RLS와 테이블 권한으로 새 신청 추가만 허용하며, 신청 조회·수정·삭제는 차단합니다.
- 데이터베이스 정의는 `supabase/migrations/20261013120000_create_launch_signups.sql`에 있습니다.

Vercel은 GitHub `main` 브랜치 푸시로 자동 배포합니다. CLI 직접 배포는 사용하지 않습니다.

수정 후 다시 올리기: `git add . && git commit -m "MVP 수정" && git push origin main`

양도글·DM은 브라우저 기본 문구 확인과 Groq 무료 AI 테스트를 제공합니다. AI 테스트는 개인정보가 없는 가상 대화만 입력합니다. 서버 전용 `GROQ_API_KEY`와 `AI_PROVIDER=groq` 설정이 필요하며 키는 Git에 올리지 않습니다. 개인정보 안내는 `privacy.html`에 있습니다.

검증: `node --test tests/*.cjs`
