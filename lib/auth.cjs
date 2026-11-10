'use strict';
// Public project configuration only; the user token is verified by Supabase Auth.
const AUTH_URL = 'https://vuumxcqycppwkkdbgzjd.supabase.co/auth/v1/user';
const PUBLIC_KEY = 'sb_publishable_iai7iwBPVCyInikeX_SuyA_j-bvfIKN';
async function verifyUser(req) {
  const authorization = req.headers.authorization;
  if (typeof authorization !== 'string' || !/^Bearer [A-Za-z0-9._-]{20,8000}$/.test(authorization)) {
    return { status: 401, error: '구글 계정으로 로그인한 뒤 이용해 주세요.' };
  }
  try {
    const response = await fetch(AUTH_URL, {
      headers: { apikey: PUBLIC_KEY, Authorization: authorization },
      signal: AbortSignal.timeout(8000), cache: 'no-store'
    });
    if (response.status === 401 || response.status === 403) return { status: 401, error: '로그인이 만료됐어요. 다시 로그인해 주세요.' };
    if (!response.ok) throw new Error('auth-unavailable');
    const user = await response.json();
    if (typeof user.id !== 'string' || !user.id || user.is_anonymous) return { status: 401, error: '구글 계정으로 로그인한 뒤 이용해 주세요.' };
    return { status: 200, userId: user.id };
  } catch {
    return { status: 503, error: '로그인 상태를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.' };
  }
}
module.exports = { verifyUser, AUTH_URL };
