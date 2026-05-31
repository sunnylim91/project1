// 로컬 규칙 기반 채점 — Gemini API 호출 없음

const TARGET_LEN = { '용어형': 800, '설명형': 1600, '논술형': 1600, '비교형': 1200 };

const SCORE_KEYS = [
  '법령적합성', '최신성', '기술정확성', '논리성',
  '출제의도부합성', '답안구성', '분량적정성', '채점관가독성',
];

export function validateAnswer(question, answer, type) {
  const len = answer.length;

  // 분량 적정성
  const target = TARGET_LEN[type] ?? 800;
  const 분량적정성 = len >= target ? 100 : Math.round((len / target) * 100);

  // 법령 적합성
  const 법령키워드 = ['법', '시행령', '시행규칙', '고시', '규정', '기준'];
  const 법령count = 법령키워드.filter((k) => answer.includes(k)).length;
  const 법령적합성 = Math.min(100, 70 + 법령count * 5);

  // 최신성
  const 최신키워드 = ['GNSS', 'LiDAR', '드론', 'UAV', '디지털트윈', 'AI', 'RTK', 'PPP', 'BIM', '스마트시티'];
  const 최신count = 최신키워드.filter((k) => answer.includes(k)).length;
  const 최신성 = Math.min(100, 60 + 최신count * 8);

  // 답안 구성
  const 구성키워드 = type === '비교형'
    ? ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', '비교']
    : ['Ⅰ', 'Ⅱ', 'Ⅲ', '개요', '결론'];
  const 구성count = 구성키워드.filter((k) => answer.includes(k)).length;
  const 답안구성 = Math.min(100, 60 + 구성count * 8);

  // 채점관 가독성
  const 가독키워드 = ['①', '②', '③', '•', '-', '표', '정의', '특징'];
  const 가독count = 가독키워드.filter((k) => answer.includes(k)).length;
  const 채점관가독성 = Math.min(100, 65 + 가독count * 5);

  // 로컬 판단 불가 항목 (고정값)
  const 기술정확성 = 88;
  const 논리성 = 87;
  const 출제의도부합성 = 86;

  const 종합점수 = Math.round(
    (분량적정성 + 법령적합성 + 최신성 + 답안구성 + 채점관가독성 + 기술정확성 + 논리성 + 출제의도부합성) / 8
  );

  const 개선사항 = [];
  if (분량적정성 < 90) 개선사항.push('답안 분량을 늘려주세요');
  if (법령적합성 < 85) 개선사항.push('법령 근거를 추가해주세요');
  if (최신성 < 85) 개선사항.push('최신 기술 키워드를 추가해주세요');
  if (답안구성 < 85) 개선사항.push('Ⅰ.개요 Ⅱ.본론 Ⅲ.결론 구조를 갖춰주세요');

  return {
    법령적합성,
    최신성,
    기술정확성,
    논리성,
    출제의도부합성,
    답안구성,
    분량적정성,
    채점관가독성,
    종합점수,
    개선사항: 개선사항.length > 0 ? 개선사항 : ['전반적으로 우수한 답안입니다'],
  };
}

export function needsAutoFix(validationResult) {
  if (!validationResult) return false;
  if (validationResult['종합점수'] < 90) return true;
  return SCORE_KEYS.some(
    (k) => typeof validationResult[k] === 'number' && validationResult[k] < 85
  );
}
