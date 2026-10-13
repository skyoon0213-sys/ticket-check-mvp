# 티켓체크 MVP

트위터(X) 티켓 양도 전에 거래 상황과 양도글·DM의 위험 신호를 확인하는 한국어 MVP입니다.

`index.html` 하나에 화면, 스타일, 동작을 포함합니다. 휴대전화 화면에서도 어절 단위로 줄바꿈합니다.

- 거래 체크리스트는 입력 즉시 결과를 표시하고, 양도글·DM은 AI가 문맥과 원문 근거를 분석합니다.
- 사기 이력 조회와 이메일 로그인은 명시적으로 표시한 체험 기능입니다.
- 출시 알림 신청의 이름·연락처·남긴 말은 Supabase `launch_signups` 표에 저장됩니다.
- 브라우저에는 공개용 publishable 키만 사용합니다. RLS와 테이블 권한으로 새 신청 추가만 허용하며, 신청 조회·수정·삭제는 차단합니다.
- 데이터베이스 정의는 `supabase/migrations/20261013120000_create_launch_signups.sql`에 있습니다.

Vercel은 GitHub `main` 브랜치 푸시로 자동 배포합니다. CLI 직접 배포는 사용하지 않습니다.

수정 후 다시 올리기: `git add . && git commit -m "MVP 수정" && git push origin main`

## AI 분석

`api/analyze.js` Vercel Function이 OpenAI 모델을 호출합니다. Vercel에서는 자동 제공되는 서버 OIDC 토큰으로 AI Gateway를 사용합니다. 별도 OpenAI 키를 등록하면 OpenAI Responses API를 직접 사용합니다. 기본 모델은 `gpt-5-mini`이며 Vercel 환경변수 `OPENAI_MODEL`로 바꿀 수 있습니다. `OPENAI_API_KEY` 또는 `AI_GATEWAY_API_KEY`를 사용할 경우 서버 환경변수에만 등록하고 커밋하지 않습니다.

결과에는 원문 인용, 확인 이유, 판매자에게 물어볼 질문, 미확인 정보가 포함됩니다. AI 오류나 키 미등록 상태를 안전한 거래 결과로 바꾸지 않습니다. 입력은 8,000자, 결과는 최대 5개 위험 신호로 제한합니다. AI 요청에는 `store: false`를 사용하고, 신청 표에는 분석 입력을 저장하지 않습니다.

서버 함수가 없으므로 `python -m http.server`만으로는 AI 분석이 동작하지 않습니다. 배포한 Vercel 사이트에서 사용합니다.

검증: `node --test tests/analyze.test.js` (외부 AI 호출을 대체한 서버 동작 테스트). 실제 AI 응답은 배포한 사이트에서 별도로 확인합니다. AI Gateway 사용은 해당 계정의 이용 가능 크레딧과 한도에 따릅니다. 크레딧 충전이나 결제 설정은 자동으로 변경하지 않습니다.

참고: [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses), [Vercel Node.js Functions](https://vercel.com/docs/functions/runtimes/node-js).
