const TYPE_RULES = [
  {
    type: '비교형',
    patterns: ['비교', '차이', '구분', '대비'],
  },
  {
    type: '논술형',
    patterns: ['논하', '방안', '대책', '문제점', '개선'],
  },
  {
    type: '설명형',
    patterns: ['설명', '서술', '기술하', '제작 과정', '방법에 대하여'],
  },
];

export function classifyType(question) {
  for (const rule of TYPE_RULES) {
    if (rule.patterns.some((p) => question.includes(p))) {
      return rule.type;
    }
  }
  return '용어형';
}

// 영문 약어 패턴 (괄호 안 2~10자 대문자+숫자)
const ABBR_PATTERN = /[(\[（]([A-Z][A-Z0-9\-]{1,9})[)\]）]/g;

// 조사 기준 명사구 분리
const JOSA_PATTERN = /([가-힣a-zA-Z\s]+?)(?:을|를|이|가|의|에서|에|은|는|과|와|로|으로|도|만|까지|부터|에게|께|한테)(?:\s|$)/g;

export function extractKeywords(question) {
  const keywords = new Set();

  // 1. 영문 약어 우선 추출
  let m;
  while ((m = ABBR_PATTERN.exec(question)) !== null) {
    keywords.add(m[1]);
    if (keywords.size >= 5) return [...keywords];
  }

  // 2. 명사구 추출
  let match;
  while ((match = JOSA_PATTERN.exec(question)) !== null) {
    const noun = match[1].trim().replace(/^[.\s]+|[.\s]+$/g, '');
    if (noun.length >= 2) {
      keywords.add(noun);
    }
    if (keywords.size >= 5) break;
  }

  return [...keywords].slice(0, 5);
}
