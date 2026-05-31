import { classifyType, extractKeywords } from './classifier.js';
import { answerCache, computeCacheKey } from './cache.js';

// ── Gemini API 설정 ───────────────────────────────────────────
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODEL_GEN = 'gemini-2.5-flash-preview-04-17';   // 답안 생성용

// ── 유형 감지 ─────────────────────────────────────────────────
export function detectType(question) {
  return classifyType(question);
}

// ── 유사 문제 검색 (Jaccard 유사도) ──────────────────────────
export function findSimilarByText(dbQuestions, questionText, topN = 3) {
  const kws = extractKeywords(questionText);
  if (kws.length === 0) {
    const lower = questionText.trim().toLowerCase();
    return dbQuestions
      .filter((q) => q.question.toLowerCase().includes(lower))
      .slice(0, topN);
  }
  const setA = new Set(kws);
  return dbQuestions
    .map((q) => {
      const setB = new Set(q.keywords);
      const intersection = [...setA].filter((k) => setB.has(k)).length;
      const union = new Set([...setA, ...setB]).size;
      return { ...q, _score: union === 0 ? 0 : intersection / union };
    })
    .filter((q) => q._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, topN);
}

// ── 프롬프트 빌더 ─────────────────────────────────────────────
const SYSTEM_BASE =
  '측량 및 지형공간정보 기술사 시험 암기용 요약 답안을 작성하세요.\n' +
  '현행 법령(공간정보의 구축 및 관리 등에 관한 법률, 공간정보산업 진흥법, 국가공간정보 기본법 등)을 근거로 하되, 핵심만 압축하여 작성하세요.\n' +
  '문장은 짧고 명확하게, 불필요한 수식어 금지.\n\n' +
  '출력 형식 규칙 (반드시 준수):\n\n' +
  '3단계 번호 체계:\n' +
  '1. 대항목 제목\n' +
  ' 1) 중항목 제목\n' +
  '  (1) 소항목 내용.\n' +
  '  (2) 소항목 내용.\n' +
  ' 2) 중항목 제목\n' +
  '  (1) 소항목 내용.\n\n' +
  '규칙:\n' +
  '- 대항목(1. 2. 3.): 제목만 작성\n' +
  '- 중항목(1) 2) 3)): 스페이스 1칸 들여쓰기\n' +
  '- 소항목((1) (2) (3)): 스페이스 2칸 들여쓰기\n' +
  '- 기호(-, *, •) 절대 사용 금지\n' +
  '- 한 줄에 여러 항목 절대 금지\n' +
  '- Ⅰ. Ⅱ. Ⅲ. 앞뒤 빈 줄 1개\n' +
  '마크다운 문법(**, ##, -, *) 절대 사용 금지. 일반 텍스트로만 출력하라.';

const TYPE_CONFIG = {
  '용어형': {
    maxTokens: 3000,
    instruction:
      '아래 구조로 A4 1~2페이지 분량으로 작성 (마크다운 금지, 일반 텍스트 출력):\n\n' +
      '1. 개요\n' +
      ' 1) 정의\n' +
      '  (1) ...\n\n' +
      '2. 핵심 특징\n' +
      ' 1) ...\n' +
      '  (1) ...\n' +
      '  (2) ...\n\n' +
      '3. 구성요소 또는 종류\n' +
      ' 1) ...\n' +
      '  (1) ...\n' +
      '  (2) ...\n\n' +
      '4. 활용 및 장단점\n' +
      ' 1) 장점\n' +
      '  (1) ...\n' +
      '  (2) ...\n' +
      ' 2) 한계\n' +
      '  (1) ...\n\n' +
      '5. 최신동향\n' +
      ' 1) ...\n' +
      '  (1) ...',
  },
  '설명형': {
    maxTokens: 5000,
    instruction:
      '아래 구조로 A4 3~4페이지 분량으로 작성 (마크다운 금지, 일반 텍스트 출력):\n\n' +
      'Ⅰ. 개요\n' +
      '(3~4줄 서술)\n\n' +
      'Ⅱ. 본론\n\n' +
      '1. 정의 및 원리\n' +
      ' 1) ...\n' +
      '  (1) ...\n' +
      '  (2) ...\n\n' +
      '2. 구성 및 특징\n' +
      ' 1) ...\n' +
      '  (1) ...\n\n' +
      '3. 장점 및 한계\n' +
      ' 1) 장점\n' +
      '  (1) ...\n' +
      ' 2) 한계\n' +
      '  (1) ...\n\n' +
      '4. 활용사례\n' +
      ' 1) ...\n' +
      '  (1) ...\n\n' +
      '5. 최신기술 동향\n' +
      ' 1) ...\n\n' +
      'Ⅲ. 결론\n' +
      '(3~4줄 서술)',
  },
  '논술형': {
    maxTokens: 5000,
    instruction:
      '아래 구조로 A4 3~4페이지 분량으로 작성 (마크다운 금지, 일반 텍스트 출력):\n\n' +
      'Ⅰ. 개요\n' +
      '(3~4줄 서술)\n\n' +
      'Ⅱ. 본론\n\n' +
      '1. 현황 및 문제점\n' +
      ' 1) ...\n' +
      '  (1) ...\n' +
      '  (2) ...\n\n' +
      '2. 해결방안 및 개선방향\n' +
      ' 1) ...\n' +
      '  (1) ...\n\n' +
      '3. 관련 법령 및 제도\n' +
      ' 1) ...\n' +
      '  (1) ...\n\n' +
      '4. 기대효과\n' +
      ' 1) ...\n' +
      '  (1) ...\n\n' +
      'Ⅲ. 결론\n' +
      '(3~4줄 서술)',
  },
  '비교형': {
    maxTokens: 4000,
    instruction:
      '아래 구조로 작성 (마크다운 금지, 일반 텍스트 출력):\n\n' +
      'Ⅰ. 개요\n' +
      '(2~3줄 서술)\n\n' +
      'Ⅱ. 비교\n\n' +
      '1. 비교표 (항목 | A | B 형식으로 5~7개 항목 비교)\n\n' +
      'Ⅲ. 핵심 차이점\n\n' +
      '1. 차이점\n' +
      ' 1) ...\n' +
      '  (1) ...\n' +
      '  (2) ...\n' +
      ' 2) ...\n' +
      '  (1) ...\n\n' +
      'Ⅳ. 결론\n' +
      '(2~3줄 서술)',
  },
};

// ── 답안 후처리: 3단계 들여쓰기 정규화 ──────────────────────
export function formatAnswer(text) {
  const lines = text.split('\n');
  const result = [];

  for (let line of lines) {
    line = line.trim();
    if (!line) {
      result.push('');
      continue;
    }
    if (/^[ⅠⅡⅢⅣⅤ]\./.test(line)) {
      // Ⅰ. Ⅱ. Ⅲ. 섹션: 앞뒤 빈 줄
      result.push('');
      result.push(line);
      result.push('');
    } else if (/^\d+\.\s/.test(line)) {
      // 대항목 1. 2. 3.: 들여쓰기 없음
      result.push(line);
    } else if (/^\d+\)/.test(line)) {
      // 중항목 1) 2) 3): 스페이스 1칸
      result.push(' ' + line);
    } else if (/^\(\d+\)/.test(line)) {
      // 소항목 (1) (2) (3): 스페이스 2칸
      result.push('  ' + line);
    } else {
      result.push(line);
    }
  }

  return result.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function buildPrompt(question, type, similarQuestions = []) {
  const config = TYPE_CONFIG[type] ?? TYPE_CONFIG['용어형'];
  let similarContext = '';
  if (similarQuestions.length > 0) {
    similarContext =
      '\n\n[참고: 유사 기출문제]\n' +
      similarQuestions
        .map((q, i) => `${i + 1}. (${q.year}년 제${q.round}회) ${q.question}`)
        .join('\n');
  }
  return {
    systemPrompt: SYSTEM_BASE,
    userPrompt: `문제: ${question}${similarContext}\n\n${config.instruction}`,
    maxTokens: config.maxTokens,
  };
}

// ── Gemini 에러 메시지 매핑 ───────────────────────────────────
function geminiErrorMsg(status) {
  return (
    {
      400: 'API 요청 오류입니다. (잘못된 형식)',
      401: 'Gemini API 키를 확인해주세요.',
      403: 'Gemini API 접근 권한이 없습니다.',
      429: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요 (약 1분 후).',
      500: 'AI 서버 오류입니다. 잠시 후 다시 시도해주세요.',
      503: 'AI 서버가 일시적으로 사용 불가합니다.',
    }[status] ?? `API 오류 (HTTP ${status})`
  );
}

// ── Gemini 스트리밍 호출 ──────────────────────────────────────
export async function generateAnswer({
  question,
  type,
  similarQuestions = [],
  apiKey,
  onChunk,
  onDone,
  onError,
}) {
  if (!apiKey || apiKey.includes('여기에')) {
    onError?.('Gemini API 키가 없습니다. ⚙️ 버튼을 눌러 키를 초기화 후 재입력하세요.');
    return;
  }

  // ── 디버그: 키 앞 10자리 확인 (개발 모드에서만) ─────────────
  if (import.meta.env.DEV) {
    console.log('[DEBUG] Gemini API 키 앞 10자리:', apiKey.slice(0, 10) + '...');
  }

  // ── 캐시 확인 ─────────────────────────────────────────────
  const cacheKey = await computeCacheKey(question, type);
  if (similarQuestions.length === 0 && answerCache.has(cacheKey)) {
    console.log('[CACHE] 캐시 히트 —', question.slice(0, 20));
    onChunk?.(answerCache.get(cacheKey));
    onDone?.();
    return;
  }

  const { systemPrompt, userPrompt, maxTokens } = buildPrompt(question, type, similarQuestions);
  const url = `${GEMINI_BASE}/${GEMINI_MODEL_GEN}:streamGenerateContent?alt=sse&key=${apiKey}`;

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: 0.7,
          topP: 0.95,
        },
      }),
    });
  } catch (err) {
    onError?.(`네트워크 연결을 확인해주세요. (${err.message})`);
    return;
  }

  if (!response.ok) {
    let msg = geminiErrorMsg(response.status);
    try {
      const body = await response.json();
      msg = body?.error?.message ?? msg;
    } catch {}
    onError?.(msg);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let accumulated = '';
  let finishReason = null;

  function processLines(lines) {
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (!data) continue;
      try {
        const parsed = JSON.parse(data);
        const candidate = parsed?.candidates?.[0];
        const text = candidate?.content?.parts?.[0]?.text;
        if (text) {
          accumulated += text;
          onChunk?.(text);
        }
        if (candidate?.finishReason) finishReason = candidate.finishReason;
      } catch {}
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        // 스트림 종료 후 buffer에 남은 데이터 플러시
        buffer += decoder.decode();
        if (buffer.trim()) processLines(buffer.split('\n'));
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      processLines(lines);
    }
  } finally {
    reader.releaseLock();
  }

  if (import.meta.env.DEV) {
    console.log('[DEBUG] 생성된 답안 글자 수:', accumulated.length, '자');
    console.log('[DEBUG] finishReason:', finishReason);
    const lines = accumulated.split('\n').filter(Boolean);
    console.log('[DEBUG] 답안 마지막 줄:', lines[lines.length - 1] ?? '(없음)');
  }

  if (similarQuestions.length === 0 && accumulated) {
    answerCache.set(cacheKey, accumulated);
  }
  onDone?.();
}
