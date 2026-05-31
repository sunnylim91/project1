import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Cell, ResponsiveContainer,
} from 'recharts';
import { FileText, Sparkles, TrendingUp, Star, X } from 'lucide-react';
import { loadDB, getStats } from '../utils/searcher';

// ── 색상 팔레트 ───────────────────────────────────────────────
const NAVY = '#1e3a5f';
const GOLD = '#c9a227';

// ── 주제별 키워드 맵 ──────────────────────────────────────────
const TOPIC_MAP = [
  { name: 'GNSS/GPS',    keywords: ['GNSS', 'GPS', 'RTK', '위성측량', '네트워크 RTK'] },
  { name: 'LiDAR',       keywords: ['LiDAR', '라이다', '레이저스캐닝', '항공 LiDAR', '지상레이저'] },
  { name: '드론/UAV',    keywords: ['드론', 'UAV', '무인항공', '무인기'] },
  { name: '원격탐사',    keywords: ['원격탐사', '위성영상', '항공사진', '위성측량', '위성'] },
  { name: 'GIS',         keywords: ['GIS', '지리정보시스템', '공간분석'] },
  { name: '수치지도',    keywords: ['수치지도', '수치지형도', '전자지도', '수치지적도'] },
  { name: '기준점측량',  keywords: ['기준점', '삼각점', '수준점', '통합기준점', '국가기준점'] },
  { name: '지적측량',    keywords: ['지적측량', '지적도', '지적재조사', '토지등록'] },
  { name: '디지털트윈',  keywords: ['디지털트윈', '디지털 트윈', 'Digital Twin'] },
  { name: '공간정보행정', keywords: ['공간정보', '브이월드', 'NSDI', '국가공간정보포털'] },
];

// ── 최신 기술 키워드 (신규 트렌드 탐지용) ────────────────────
const MODERN_TECH = [
  '디지털트윈', '자율주행', '스마트시티', '정밀도로지도',
  'G-VRS', '포인트클라우드', '실내공간정보', '인공지능',
  '딥러닝', '머신러닝', '빅데이터', 'BIM', '메타버스',
  '실감형', 'XR', '블록체인', '5G', '클라우드',
];

// ── 예상문제 10선 ─────────────────────────────────────────────
const PREDICTED_QUESTIONS = [
  'G-VRS(격자형 측위보정정보)의 개념 및 기존 기술과의 차이점을 비교하여 설명하시오.',
  '디지털트윈 국토 구현을 위한 공간정보 구축 방안에 대하여 논하시오.',
  '드론 측량의 정확도 향상 방안 및 관련 규정에 대하여 설명하시오.',
  'AI 기반 변화탐지 기술의 공간정보 적용 방안에 대하여 논하시오.',
  '정밀도로지도 제작 기준 및 자율주행 활용에 대하여 설명하시오.',
  '국가기준점 현대화 및 GNSS 상시관측소 운영 방안에 대하여 논하시오.',
  '3차원 공간정보 구축을 위한 LiDAR 활용 기술에 대하여 설명하시오.',
  '스마트시티 구현을 위한 공간정보 플랫폼 구축 방안에 대하여 논하시오.',
  '해양공간정보 구축 및 활용 현황에 대하여 설명하시오.',
  '공간정보 오픈플랫폼(브이월드) 고도화 방안에 대하여 논하시오.',
];

// ── 툴팁 ──────────────────────────────────────────────────────
function TopicTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-bold text-slate-800">{payload[0].payload.name}</p>
      <p className="text-slate-600">출제 횟수: <span className="font-mono font-bold">{payload[0].value}회</span></p>
      <p className="text-slate-400 mt-0.5">클릭하면 기출문제 목록 보기</p>
    </div>
  );
}

// ── 섹션 카드 래퍼 ────────────────────────────────────────────
function ChartCard({ title, sub, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <p className="text-sm font-bold mb-0.5" style={{ color: NAVY }}>{title}</p>
      {sub && <p className="text-xs text-slate-400 mb-4">{sub}</p>}
      {!sub && <div className="mb-4" />}
      {children}
    </div>
  );
}

// ── 기출문제 모달 ─────────────────────────────────────────────
const TYPE_COLORS = {
  '용어형': 'bg-blue-100 text-blue-800',
  '설명형': 'bg-green-100 text-green-800',
  '논술형': 'bg-purple-100 text-purple-800',
  '비교형': 'bg-orange-100 text-orange-800',
};

function QuestionModal({ modal, onClose, navigate }) {
  if (!modal.open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col"
        style={{ maxHeight: '70vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <p className="font-semibold text-slate-800">
              "{modal.keyword}" 관련 기출문제
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{modal.results.length}건</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X size={18} />
          </button>
        </div>

        {/* 목록 */}
        <div className="overflow-y-auto flex-1 divide-y divide-slate-50">
          {modal.results.length === 0 && (
            <p className="text-center py-10 text-sm text-slate-400">관련 기출문제 없음</p>
          )}
          {modal.results.map((q) => (
            <div key={q.id} className="px-5 py-3 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-slate-400">{q.year}년 · 제{q.round}회</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[q.type] ?? 'bg-slate-100 text-slate-600'}`}>
                  {q.type}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-slate-800 flex-1 leading-relaxed">{q.question}</p>
                <button
                  onClick={() => { navigate(`/answer?q=${encodeURIComponent(q.question)}`); onClose(); }}
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium text-white shrink-0"
                  style={{ backgroundColor: NAVY }}
                >
                  <Sparkles size={11} />
                  답안생성
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 메인 ─────────────────────────────────────────────────────
export default function TrendPage() {
  const navigate = useNavigate();
  const [db, setDb] = useState(null);
  const [stats, setStats] = useState(null);
  const [modal, setModal] = useState({ open: false, keyword: '', results: [] });

  useEffect(() => {
    loadDB().then((data) => { setDb(data); setStats(getStats(data)); });
  }, []);

  // 주제별 빈출 TOP 10
  const topicData = useMemo(() => {
    if (!db) return [];
    return TOPIC_MAP
      .map(({ name, keywords }) => ({
        name,
        count: db.questions.filter((q) =>
          keywords.some((kw) => q.question.includes(kw) || q.keywords.includes(kw))
        ).length,
      }))
      .sort((a, b) => b.count - a.count);
  }, [db]);

  // 최근 5개년 신규 키워드
  const newKeywords = useMemo(() => {
    if (!db) return [];
    const recentYears = new Set([2022, 2023, 2024, 2025, 2026]);
    const recentTexts = db.questions
      .filter((q) => recentYears.has(q.year))
      .map((q) => q.question);
    const oldTexts = db.questions
      .filter((q) => !recentYears.has(q.year))
      .map((q) => q.question)
      .join(' ');

    return MODERN_TECH
      .map((kw) => {
        const recentCount = recentTexts.filter((t) => t.includes(kw)).length;
        const inOld = oldTexts.includes(kw);
        return { keyword: kw, recentCount, isNew: !inOld && recentCount > 0 };
      })
      .filter((k) => k.isNew || k.recentCount > 0)
      .sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0) || b.recentCount - a.recentCount)
      .slice(0, 12);
  }, [db]);

  // 주제 클릭 → 모달
  function handleTopicClick(topicName) {
    const topic = TOPIC_MAP.find((t) => t.name === topicName);
    if (!topic || !db) return;
    const results = db.questions
      .filter((q) =>
        topic.keywords.some((kw) => q.question.includes(kw) || q.keywords.includes(kw))
      )
      .sort((a, b) => b.year - a.year || b.round - a.round);
    setModal({ open: true, keyword: topicName, results });
  }

  if (!db || !stats) {
    return (
      <div className="text-center py-24 text-slate-400 text-sm animate-pulse">
        DB 로딩 중...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: NAVY }}>출제경향 분석</h1>
        <p className="text-sm text-slate-500 mt-1">
          {stats.years[0]}~{stats.years[stats.years.length - 1]}년 총 {stats.total.toLocaleString()}문제 기반 분석
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── 주제별 빈출 TOP 10 (클릭 가능) ── */}
        <ChartCard
          title="주제별 빈출 TOP 10"
          sub="막대 클릭 시 관련 기출문제 목록 표시"
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              layout="vertical"
              data={topicData}
              margin={{ top: 0, right: 16, left: 16, bottom: 0 }}
              style={{ cursor: 'pointer' }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: '#374151' }}
                tickLine={false}
                width={72}
              />
              <Tooltip content={<TopicTooltip />} />
              <Bar
                dataKey="count"
                radius={[0, 3, 3, 0]}
                onClick={(data) => handleTopicClick(data.name)}
              >
                {topicData.map((entry, i) => (
                  <Cell key={i} fill={i === 0 ? GOLD : i < 3 ? '#2a4f7c' : NAVY} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-slate-400 text-center mt-1">막대를 클릭하면 해당 주제 기출문제를 볼 수 있습니다</p>
        </ChartCard>

        {/* ── 최근 5개년 주목 키워드 ── */}
        <ChartCard
          title="최근 5개년 주목 키워드"
          sub="2022~2026년 처음 등장 또는 급증 키워드"
        >
          <div className="flex flex-wrap gap-2">
            {newKeywords.map(({ keyword, recentCount, isNew }) => (
              <div
                key={keyword}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border"
                style={
                  isNew
                    ? { backgroundColor: 'rgba(201,162,39,0.12)', borderColor: GOLD, color: '#92600d' }
                    : { backgroundColor: 'rgba(30,58,95,0.07)', borderColor: '#c7d2e0', color: NAVY }
                }
              >
                {isNew && <Star size={10} fill={GOLD} stroke={GOLD} />}
                {keyword}
                <span className="font-mono opacity-70">×{recentCount}</span>
              </div>
            ))}
            {newKeywords.length === 0 && (
              <p className="text-sm text-slate-400">분석 결과 없음</p>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-3">
            <Star size={10} fill={GOLD} stroke={GOLD} className="inline mr-1" />
            표시 = 2022년 이전 미출제 신규 키워드
          </p>
        </ChartCard>
      </div>

      {/* ── 예상문제 10선 ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} style={{ color: NAVY }} />
          <h2 className="text-base font-bold" style={{ color: NAVY }}>예상문제 10선</h2>
          <span className="text-xs text-slate-400">— 최근 5개년 미출제 주요 키워드 기반</span>
        </div>

        <div className="space-y-2">
          {PREDICTED_QUESTIONS.map((q, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4 flex items-start gap-4 hover:border-slate-300 transition-colors group"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                style={{ backgroundColor: i < 3 ? GOLD : 'rgba(30,58,95,0.1)', color: i < 3 ? '#fff' : NAVY }}
              >
                {i + 1}
              </div>
              <p className="flex-1 text-sm text-slate-800 leading-relaxed">{q}</p>
              <button
                onClick={() => navigate(`/answer?q=${encodeURIComponent(q)}`)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium text-white shrink-0 transition-opacity hover:opacity-80 opacity-0 group-hover:opacity-100"
                style={{ backgroundColor: NAVY }}
              >
                <Sparkles size={12} />
                답안 생성
              </button>
            </div>
          ))}
        </div>

        <div
          className="mt-4 rounded-xl px-5 py-4 text-sm border"
          style={{ backgroundColor: 'rgba(201,162,39,0.08)', borderColor: 'rgba(201,162,39,0.3)' }}
        >
          <div className="flex items-start gap-2">
            <FileText size={15} style={{ color: GOLD }} className="shrink-0 mt-0.5" />
            <p className="text-slate-600 text-xs leading-relaxed">
              예상문제는 최근 5개년(2022~2026) 미출제 키워드 및 공간정보 정책 동향을 기반으로 선정되었습니다.
              각 문제의 [답안 생성] 버튼을 클릭하면 AI 모범답안을 즉시 생성할 수 있습니다.
            </p>
          </div>
        </div>
      </section>

      {/* ── 기출문제 모달 ── */}
      <QuestionModal
        modal={modal}
        onClose={() => setModal({ open: false, keyword: '', results: [] })}
        navigate={navigate}
      />
    </div>
  );
}
