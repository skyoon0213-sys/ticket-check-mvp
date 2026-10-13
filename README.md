# 티켓체크 MVP

트위터(X) 티켓 양도 전에 거래 상황과 양도글·DM의 위험 신호를 확인하는 한국어 MVP입니다.

`index.html` 하나에 화면, 스타일, 동작을 포함합니다. 휴대전화 화면에서도 어절 단위로 줄바꿈합니다.

- 거래 체크리스트와 규칙 기반 텍스트 분석은 실제 입력으로 동작합니다.
- 사기 이력 조회와 이메일 로그인은 명시적으로 표시한 체험 기능입니다.
- 출시 알림 신청의 이름·연락처·남긴 말은 Supabase `launch_signups` 표에 저장됩니다.
- 브라우저에는 공개용 publishable 키만 사용합니다. RLS와 테이블 권한으로 새 신청 추가만 허용하며, 신청 조회·수정·삭제는 차단합니다.
- 데이터베이스 정의는 `supabase/migrations/20261013120000_create_launch_signups.sql`에 있습니다.

Vercel은 GitHub `main` 브랜치 푸시로 자동 배포합니다. CLI 직접 배포는 사용하지 않습니다.

수정 후 다시 올리기: `git add . && git commit -m "MVP 수정" && git push origin main`
