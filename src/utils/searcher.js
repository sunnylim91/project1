let _db = null;

export async function loadDB() {
  if (_db) return _db;
  const res = await fetch('/db/questions.json');
  _db = await res.json();
  return _db;
}

export function getStats(db) {
  const typeCounts = {};
  const yearCounts = {};
  let maxRound = 0;

  for (const q of db.questions) {
    typeCounts[q.type] = (typeCounts[q.type] || 0) + 1;
    yearCounts[q.year] = (yearCounts[q.year] || 0) + 1;
    if (q.round > maxRound) maxRound = q.round;
  }

  return {
    total: db.questions.length,
    byType: typeCounts,
    byYear: yearCounts,
    years: db.meta.years,
    maxRound,
  };
}

// 통합 필터: years=[], types=[], keyword=""
export function filterQuestions(questions, { years = [], types = [], keyword = '' } = {}) {
  const kw = keyword.trim().toLowerCase();
  return questions.filter((q) => {
    if (years.length > 0 && !years.includes(q.year)) return false;
    if (types.length > 0 && !types.includes(q.type)) return false;
    if (kw) {
      const inQuestion = q.question.toLowerCase().includes(kw);
      const inKeywords = q.keywords.some((k) => k.toLowerCase().includes(kw));
      if (!inQuestion && !inKeywords) return false;
    }
    return true;
  });
}

// 빈출문제: frequency 내림차순 topN
export function getFrequentQuestions(questions, topN = 20) {
  return [...questions]
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, topN);
}

// 유사문제: 키워드 Jaccard 유사도 기준
export function getSimilarQuestions(questions, targetId, topN = 5) {
  const target = questions.find((q) => q.id === targetId);
  if (!target || target.keywords.length === 0) return [];

  const setA = new Set(target.keywords);

  return questions
    .filter((q) => q.id !== targetId)
    .map((q) => {
      const setB = new Set(q.keywords);
      const intersection = [...setA].filter((k) => setB.has(k)).length;
      const union = new Set([...setA, ...setB]).size;
      const score = union === 0 ? 0 : intersection / union;
      return { ...q, _score: score };
    })
    .filter((q) => q._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, topN);
}

// 기존 단순 함수 유지
export function filterByYear(db, year) {
  return db.questions.filter((item) => item.year === Number(year));
}

export function filterByType(db, type) {
  return db.questions.filter((item) => item.type === type);
}

export function filterByRound(db, round) {
  return db.questions.filter((item) => item.round === Number(round));
}
