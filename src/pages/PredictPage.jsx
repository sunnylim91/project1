import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Loader2, Sparkles } from 'lucide-react';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODEL = 'gemini-2.0-flash';

const SYSTEM_PROMPT =
  '당신은 측량 및 지형공간정보 기술사 출제경향 분석 전문가이다.\n' +
  '실제 기출문제 DB 분석을 기반으로 향후 출제 가능성이 높은 문제를 예측한다.\n' +
  '반드시 JSON 형식으로만 응답하라. 다른 텍스트 없이 JSON만 출력.';

const USER_PROMPT =
  '아래는 2009~2026년 실제 기출문제 DB 요약이다.\n\n' +
  '[기출 DB 요약]\n' +
  '- 총 문제 수: 1,084문제\n' +
  '- 수록 연도: 2009~2026 (36회차)\n' +
  '- 유형 분포: 용어형 456 / 설명형 456 / 논술형 129 / 비교형 43\n' +
  '- 최근 출제 키워드(2024~2026): G-VRS, 딥러닝, 정밀도로지도, BIM, 디지털트윈, 인공지능, 실내공간정보\n' +
  '- 빈출 주제: 원격탐사, 공간정보행정, GNSS/GPS, 기준점측량, LiDAR\n' +
  '- 최신 기출(2026 제138회):\n' +
  '  수치표고모형(DEM) 제작 방법,\n' +
  '  국토변화정보 탐지 방법,\n' +
  '  정밀도로지도 제작 과정,\n' +
  '  3차원 입체지도,\n' +
  '  G-VRS\n\n' +
  '다음 기준으로 출제예상문제 TOP 5를 선정하라:\n' +
  '1. 빈출도(30%): 핵심 기본이론, 반복 출제 주제\n' +
  '2. 출제주기(25%): 마지막 출제 후 재출제 주기 도달 여부\n' +
  '3. 최신성(20%): 최신 기술·법령 변화 반영\n' +
  '4. 확장성(15%): 변형·융합 출제 가능성\n' +
  '5. 기술사 중요도(10%): 실무 활용성, 심층 논술 가능성\n\n' +
  '규칙:\n' +
  '- 단순 랜덤 생성 금지\n' +
  '- 기술사 수준 답안 작성 가능한 문제만 선정\n\n' +
  '아래 JSON 형식으로만 응답:\n' +
  '{\n' +
  '  "generated_at": "오늘 날짜",\n' +
  '  "problems": [\n' +
  '    {\n' +
  '      "rank": 1,\n' +
  '      "question": "예상문제 전문",\n' +
  '      "type": "용어형/설명형/논술형/비교형",\n' +
  '      "keywords": ["키워드1", "키워드2", "키워드3"],\n' +
  '      "probability": 85,\n' +
  '      "reason": "선정 근거",\n' +
  '      "related": ["관련 기출문제1", "관련 기출문제2"],\n' +
  '      "points": ["답안 작성 포인트1", "답안 작성 포인트2", "답안 작성 포인트3"]\n' +
  '    }\n' +
  '  ]\n' +
  '}';

const CACHE_KEY = 'predict_cache';

function todayStr() {
  return new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (cached.date !== todayStr()) return null;
    return cached;
  } catch {
    return null;
  }
}

function saveCache(problems) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ date: todayStr(), problems }));
  } catch {}
}

const RANK_STYLE = {
  1: { border: '#c9a227', bg: 'rgba(201,162,39,0.05)', medal: '🥇', label: '1순위' },
  2: { border: '#9ca3af', bg: 'rgba(156,163,175,0.05)', medal: '🥈', label: '2순위' },
  3: { border: '#b45309', bg: 'rgba(180,83,9,0.05)',    medal: '🥉', label: '3순위' },
  4: { border: '#e2e8f0', bg: '#ffffff',                medal: '4위', label: '4순위' },
  5: { border: '#e2e8f0', bg: '#ffffff',                medal: '5위', label: '5순위' },
};

const TYPE_COLORS = {
  '용어형': 'bg-blue-100 text-blue-800',
  '설명형': 'bg-green-100 text-green-800',
  '논술형': 'bg-purple-100 text-purple-800',
  '비교형': 'bg-orange-100 text-orange-800',
};

async function fetchPredictions(apiKey) {
  const url = `${GEMINI_BASE}/${MODEL}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: USER_PROMPT }] }],
      generationConfig: { maxOutputTokens: 3000, temperature: 0.3, topP: 0.95 },
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `API 오류 (HTTP ${res.status})`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const jsonStr = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  return JSON.parse(jsonStr);
}

function ProbBar({ value }) {
  const color =
    value >= 80 ? '#c9a227' : value >= 65 ? '#22c55e' : '#94a3b8';
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-mono font-semibold" style={{ color }}>
        {value}%
      </span>
    </div>
  );
}

function PredictCard({ item, navigate }) {
  const style = RANK_STYLE[item.rank] ?? RANK_STYLE[5];
  return (
    <div
      className="rounded-2xl p-5 shadow-sm"
      style={{ border: `2px solid ${style.border}`, backgroundColor: style.bg }}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{style.medal}</span>
          <span className="text-sm font-semibold text-slate-600">{style.label}</span>
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              TYPE_COLORS[item.type] ?? 'bg-slate-100 text-slate-600'
            }`}
          >
            {item.type}
          </span>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">출제확률</p>
          <p className="text-sm font-bold" style={{ color: style.border }}>
            {item.probability}%
          </p>
        </div>
      </div>

      {/* 확률 바 */}
      <ProbBar value={item.probability} />

      {/* 문제 */}
      <p className="mt-4 text-sm font-semibold text-slate-800 leading-relaxed">
        {item.question}
      </p>

      {/* 키워드 */}
      {item.keywords?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {item.keywords.map((kw) => (
            <span
              key={kw}
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: 'rgba(30,58,95,0.08)', color: '#1e3a5f' }}
            >
              {kw}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {/* 선정 근거 */}
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-1">선정 근거</p>
          <p className="text-xs text-slate-600 leading-relaxed">{item.reason}</p>
        </div>

        {/* 관련 기출 */}
        {item.related?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1">관련 기출</p>
            <ul className="space-y-0.5">
              {item.related.map((r) => (
                <li key={r} className="text-xs text-slate-600 before:content-['·'] before:mr-1">
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 답안 포인트 */}
        {item.points?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1">답안 포인트</p>
            <ul className="space-y-0.5">
              {item.points.map((pt) => (
                <li key={pt} className="text-xs text-slate-600 before:content-['·'] before:mr-1">
                  {pt}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 답안 생성 버튼 */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={() => navigate(`/answer?q=${encodeURIComponent(item.question)}`)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#1e3a5f' }}
        >
          <FileText size={13} />
          답안 생성
        </button>
      </div>
    </div>
  );
}

export default function PredictPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [fromCache, setFromCache] = useState(false);

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY ?? '';

  // 마운트 시 오늘 캐시가 있으면 바로 표시
  useEffect(() => {
    const cached = loadCache();
    if (cached) {
      setResult({ generated_at: cached.date, problems: cached.problems });
      setFromCache(true);
      setStatus('done');
    }
  }, []);

  async function handleAnalyze(force = false) {
    if (!apiKey || apiKey.includes('여기에')) {
      setErrorMsg('.env 파일의 VITE_GEMINI_API_KEY를 설정하세요.');
      setStatus('error');
      return;
    }
    // 강제 새로고침이 아니면 캐시 우선
    if (!force) {
      const cached = loadCache();
      if (cached) {
        setResult({ generated_at: cached.date, problems: cached.problems });
        setFromCache(true);
        setStatus('done');
        return;
      }
    }
    setStatus('loading');
    setErrorMsg('');
    setFromCache(false);
    try {
      const data = await fetchPredictions(apiKey);
      saveCache(data.problems);
      setResult(data);
      setStatus('done');
    } catch (e) {
      setErrorMsg(e.message ?? '알 수 없는 오류');
      setStatus('error');
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="text-center space-y-2 pt-2">
        <div className="flex items-center justify-center gap-2">
          <Sparkles size={22} style={{ color: '#c9a227' }} />
          <h1 className="text-2xl font-bold" style={{ color: '#1e3a5f' }}>
            오늘의 출제예상 TOP 5
          </h1>
        </div>
        <p className="text-sm text-slate-500">기출 DB 분석 기반 AI 예측</p>
      </div>

      {/* 시작 버튼 */}
      {status !== 'done' && (
        <div className="flex justify-center">
          <button
            onClick={handleAnalyze}
            disabled={status === 'loading'}
            className="flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#1e3a5f', color: '#fff' }}
          >
            {status === 'loading' ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                기출 DB 분석 중...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                예상문제 분석 시작
              </>
            )}
          </button>
        </div>
      )}

      {/* 로딩 */}
      {status === 'loading' && (
        <div className="text-center py-8 space-y-3">
          <Loader2 size={36} className="animate-spin mx-auto" style={{ color: '#1e3a5f' }} />
          <p className="text-sm text-slate-500">기출 DB 분석 중...</p>
          <p className="text-xs text-slate-400">예상 소요시간 10~15초</p>
        </div>
      )}

      {/* 에러 */}
      {status === 'error' && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          {errorMsg}
        </div>
      )}

      {/* 결과 카드 */}
      {status === 'done' && result && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              분석일: {result.generated_at}
              {fromCache && (
                <span className="ml-2 text-xs text-green-600 font-medium">· 캐시</span>
              )}
            </p>
            <button
              onClick={() => handleAnalyze(true)}
              className="text-xs text-slate-500 hover:underline"
            >
              다시 분석
            </button>
          </div>

          <div className="space-y-4">
            {result.problems?.map((item) => (
              <PredictCard key={item.rank} item={item} navigate={navigate} />
            ))}
          </div>

          {/* 면책 안내 */}
          <p className="text-center text-xs text-slate-400 leading-relaxed pb-4">
            본 예상문제는 기출 DB 분석 및 AI 예측 결과이며,<br />
            실제 출제를 보장하지 않습니다.
          </p>
        </>
      )}
    </div>
  );
}
