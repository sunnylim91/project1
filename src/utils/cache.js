// ── sessionStorage 기반 인메모리 캐시 ──────────────────────────
// key: SHA-256(question + type) — 동일 문제 재요청 시 API 미호출
const STORAGE_KEY = 'geo-exam-answer-cache';
const _mem = new Map();

// 브라우저 재시작 전까지 유지 (sessionStorage 복원)
try {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (raw) {
    for (const [k, v] of JSON.parse(raw)) _mem.set(k, v);
  }
} catch {}

function persist() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([..._mem.entries()]));
  } catch {
    // sessionStorage 용량 초과 시 무시 (캐시는 best-effort)
  }
}

export const answerCache = {
  get(key)        { return _mem.get(key) ?? null; },
  set(key, value) { _mem.set(key, value); persist(); },
  has(key)        { return _mem.has(key); },
  clear()         { _mem.clear(); try { sessionStorage.removeItem(STORAGE_KEY); } catch {} },
};

// SHA-256 해시 → 캐시 키 생성 (비동기)
export async function computeCacheKey(question, type) {
  const text = `${question.trim()}::${type}`;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
