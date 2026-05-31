import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, FileText, Hash, Calendar, Layers, Award } from 'lucide-react';
import { loadDB, getStats } from '../utils/searcher';

const TYPE_COLORS = {
  '용어형': 'bg-blue-100 text-blue-700',
  '설명형': 'bg-green-100 text-green-700',
  '논술형': 'bg-purple-100 text-purple-700',
  '비교형': 'bg-orange-100 text-orange-700',
};

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-start gap-4 shadow-sm">
      <div
        className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: 'rgba(30,58,95,0.08)' }}
      >
        <Icon size={22} style={{ color: '#1e3a5f' }} />
      </div>
      <div>
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold mt-0.5" style={{ color: '#1e3a5f', fontFamily: 'JetBrains Mono, monospace' }}>
          {value}
        </p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function HomePage() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDB()
      .then((db) => {
        setStats(getStats(db));
        // 2026년 문제 최대 5개
        const latest = db.questions
          .filter((q) => q.year === Math.max(...db.meta.years))
          .slice(0, 5);
        setRecent(latest);
      })
      .catch(() => setError('DB 로드 실패 — python scripts/convert_xlsx.py를 먼저 실행하세요.'));
  }, []);

  return (
    <div className="space-y-10">
      {/* 히어로 */}
      <section
        className="rounded-2xl px-8 py-12 text-white text-center relative overflow-hidden"
        style={{ backgroundColor: '#1e3a5f' }}
      >
        {/* 배경 장식 */}
        <div
          className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #c9a227, transparent)', transform: 'translate(30%, -30%)' }}
        />
        <div
          className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #c9a227, transparent)', transform: 'translate(-30%, 30%)' }}
        />
        <div className="relative">
          <div
            className="inline-block text-xs font-semibold px-3 py-1 rounded-full mb-4 tracking-widest uppercase"
            style={{ backgroundColor: 'rgba(201,162,39,0.25)', color: '#c9a227' }}
          >
            AI 답안 생성기
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight mb-3">
            측량 및 지형공간정보기술사
            <br />
            <span style={{ color: '#c9a227' }}>기출문제 분석 시스템</span>
          </h1>
          <p className="text-white/70 text-sm sm:text-base max-w-xl mx-auto mb-8">
            18년간 35개 회차, 1,000+ 문제를 분석하여
            최적 답안을 생성합니다.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              to="/browser"
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#c9a227', color: '#1e3a5f' }}
            >
              <BookOpen size={16} />
              기출문제 보기
            </Link>
            <Link
              to="/answer"
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm border border-white/30 text-white hover:bg-white/10 transition-colors"
            >
              <FileText size={16} />
              답안 생성하기
            </Link>
          </div>
        </div>
      </section>

      {/* 오류 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          {error}
        </div>
      )}

      {/* 통계 카드 */}
      {stats && (
        <>
          <section>
            <h2 className="text-base font-semibold text-slate-700 mb-4">전체 현황</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={Hash}
                label="총 문제 수"
                value={stats.total.toLocaleString()}
                sub="기출문제 전체"
              />
              <StatCard
                icon={Calendar}
                label="수록 연도"
                value={`${stats.years[0]}~${stats.years[stats.years.length - 1]}`}
                sub={`${stats.years.length}개 연도`}
              />
              <StatCard
                icon={Layers}
                label="문제 유형"
                value="4가지"
                sub="용어·설명·논술·비교"
              />
              <StatCard
                icon={Award}
                label="최신 회차"
                value={`제${stats.maxRound}회`}
                sub="최고 회차 기준"
              />
            </div>
          </section>

          {/* 유형별 분포 */}
          <section>
            <h2 className="text-base font-semibold text-slate-700 mb-4">유형별 분포</h2>
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <div className="space-y-3">
                {Object.entries(stats.byType)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => {
                    const pct = ((count / stats.total) * 100).toFixed(1);
                    return (
                      <div key={type} className="flex items-center gap-3">
                        <span className="w-16 text-sm font-medium text-slate-600 shrink-0">{type}</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: type === '용어형' ? '#3b82f6'
                                : type === '설명형' ? '#22c55e'
                                : type === '논술형' ? '#a855f7'
                                : '#f97316',
                            }}
                          />
                        </div>
                        <span className="text-xs font-mono text-slate-500 w-28 text-right shrink-0">
                          {count}문제 ({pct}%)
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </section>
        </>
      )}

      {/* 최근 출제 문제 미리보기 */}
      {recent.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-700">
              최근 출제 문제
              <span className="ml-2 text-xs font-normal text-slate-400">
                ({recent[0]?.year}년)
              </span>
            </h2>
            <Link
              to="/browser"
              className="text-xs font-medium hover:underline"
              style={{ color: '#1e3a5f' }}
            >
              전체 보기 →
            </Link>
          </div>
          <div className="space-y-2">
            {recent.map((q) => (
              <div
                key={q.id}
                className="bg-white rounded-lg border border-slate-200 px-4 py-3 flex items-start gap-3 shadow-sm hover:border-slate-300 transition-colors"
              >
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${
                    TYPE_COLORS[q.type] || 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {q.type}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800 truncate">{q.question}</p>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">
                    {q.year}년 · 제{q.round}회 · {q.id}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {!stats && !error && (
        <div className="text-center py-20 text-slate-400 text-sm animate-pulse">
          DB 로딩 중...
        </div>
      )}
    </div>
  );
}
