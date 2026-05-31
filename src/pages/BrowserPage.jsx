import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { loadDB, filterQuestions } from '../utils/searcher';

const PAGE_SIZE = 20;

const TYPE_COLORS = {
  '용어형': 'bg-blue-100 text-blue-800',
  '설명형': 'bg-green-100 text-green-800',
  '논술형': 'bg-purple-100 text-purple-800',
  '비교형': 'bg-orange-100 text-orange-800',
};
const ALL_TYPES = ['용어형', '설명형', '논술형', '비교형'];

// ── 서브 컴포넌트 ─────────────────────────────────────────────

function TypeBadge({ type }) {
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[type] || 'bg-slate-100 text-slate-600'}`}>
      {type}
    </span>
  );
}

function Pagination({ page, total, pageSize, onChange }) {
  const maxPage = Math.max(1, Math.ceil(total / pageSize));
  const pages = [];

  // 표시할 페이지 번호 계산
  let start = Math.max(1, page - 2);
  let end = Math.min(maxPage, page + 2);
  if (end - start < 4) {
    start = Math.max(1, end - 4);
    end = Math.min(maxPage, start + 4);
  }
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-xs text-slate-500">
        전체 <span className="font-mono font-semibold">{total}</span>문제 중{' '}
        <span className="font-mono font-semibold">
          {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)}
        </span>
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={16} />
        </button>
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className="w-8 h-8 rounded text-sm font-medium transition-colors"
            style={
              p === page
                ? { backgroundColor: '#1e3a5f', color: '#fff' }
                : { color: '#475569' }
            }
            onMouseEnter={(e) => { if (p !== page) e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
            onMouseLeave={(e) => { if (p !== page) e.currentTarget.style.backgroundColor = ''; }}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= maxPage}
          className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function QuestionModal({ question, onClose }) {
  const navigate = useNavigate();
  if (!question) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <TypeBadge type={question.type} />
          <span className="text-xs font-mono text-slate-400">
            {question.year}년 · 제{question.round}회 · {question.id}
          </span>
        </div>

        <p className="text-slate-800 text-base leading-relaxed mb-6">
          {question.question}
        </p>

        {question.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            {question.keywords.map((kw) => (
              <span key={kw} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                #{kw}
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-2 justify-end border-t border-slate-100 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg"
          >
            닫기
          </button>
          <button
            onClick={() => navigate(`/answer?id=${question.id}`)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            <FileText size={14} />
            답안 생성
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────

export default function BrowserPage() {
  const navigate = useNavigate();
  const [db, setDb] = useState(null);
  const [error, setError] = useState(null);

  // 필터 상태
  const [selectedYears, setSelectedYears] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [keyword, setKeyword] = useState('');

  // UI 상태
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);

  useEffect(() => {
    loadDB()
      .then(setDb)
      .catch(() => setError('DB 로드 실패'));
  }, []);

  // 필터 변경 시 페이지 초기화
  const resetPage = () => setPage(1);

  const allYears = db ? db.meta.years : [];

  const filtered = useMemo(() => {
    if (!db) return [];
    return filterQuestions(db.questions, {
      years: selectedYears,
      types: selectedTypes,
      keyword,
    });
  }, [db, selectedYears, selectedTypes, keyword]);

  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  function toggleYear(year) {
    setSelectedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]
    );
    resetPage();
  }

  function toggleType(type) {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
    resetPage();
  }

  function clearAll() {
    setSelectedYears([]);
    setSelectedTypes([]);
    setKeyword('');
    resetPage();
  }

  const hasFilter = selectedYears.length > 0 || selectedTypes.length > 0 || keyword;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#1e3a5f' }}>기출문제 브라우저</h1>
        <p className="text-sm text-slate-500 mt-1">연도·유형·키워드로 문제를 검색하세요.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          {error}
        </div>
      )}

      {db && (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* ── 필터 패널 ── */}
          <aside className="lg:w-56 shrink-0 space-y-5">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">필터</p>
                {hasFilter && (
                  <button
                    onClick={clearAll}
                    className="text-xs text-red-500 hover:underline"
                  >
                    초기화
                  </button>
                )}
              </div>

              {/* 키워드 검색 */}
              <div className="relative mb-4">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="키워드 검색..."
                  value={keyword}
                  onChange={(e) => { setKeyword(e.target.value); resetPage(); }}
                  className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* 유형 필터 */}
              <p className="text-xs font-medium text-slate-500 mb-2">문제 유형</p>
              <div className="space-y-1.5 mb-4">
                {ALL_TYPES.map((type) => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(type)}
                      onChange={() => toggleType(type)}
                      className="rounded"
                    />
                    <TypeBadge type={type} />
                  </label>
                ))}
              </div>

              {/* 연도 필터 */}
              <p className="text-xs font-medium text-slate-500 mb-2">연도 선택</p>
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => { setSelectedYears([]); resetPage(); }}
                  className="text-xs py-1 px-2 rounded border transition-colors"
                  style={
                    selectedYears.length === 0
                      ? { borderColor: '#1e3a5f', backgroundColor: '#1e3a5f', color: '#fff' }
                      : { borderColor: '#e2e8f0', color: '#64748b' }
                  }
                >
                  전체
                </button>
                {allYears.map((year) => (
                  <button
                    key={year}
                    onClick={() => toggleYear(year)}
                    className="text-xs py-1 px-2 rounded border transition-colors font-mono"
                    style={
                      selectedYears.includes(year)
                        ? { borderColor: '#1e3a5f', backgroundColor: '#1e3a5f', color: '#fff' }
                        : { borderColor: '#e2e8f0', color: '#64748b' }
                    }
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* ── 문제 목록 ── */}
          <div className="flex-1 min-w-0">

            {/* 모바일: 카드형 */}
            <div className="md:hidden space-y-3">
              {paginated.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">검색 결과가 없습니다.</div>
              ) : paginated.map((q) => (
                <div key={q.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-slate-400">{q.year}년 · 제{q.round}회</span>
                    <TypeBadge type={q.type} />
                  </div>
                  <p
                    className="text-sm text-slate-800 leading-relaxed mb-3 cursor-pointer"
                    onClick={() => setModal(q)}
                  >
                    {q.question}
                  </p>
                  <button
                    onClick={() => navigate(`/answer?id=${q.id}`)}
                    className="w-full py-2 rounded-lg text-xs font-semibold text-white"
                    style={{ backgroundColor: '#1e3a5f' }}
                  >
                    답안 생성
                  </button>
                </div>
              ))}
            </div>

            {/* 데스크톱: 테이블형 */}
            <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="grid grid-cols-[60px_60px_80px_1fr_80px] gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <span>연도</span>
                <span>회차</span>
                <span>유형</span>
                <span>문제</span>
                <span className="text-center">액션</span>
              </div>
              {paginated.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-sm">검색 결과가 없습니다.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {paginated.map((q) => (
                    <div
                      key={q.id}
                      className="grid grid-cols-[60px_60px_80px_1fr_80px] gap-2 px-4 py-3 items-center hover:bg-slate-50 transition-colors group"
                    >
                      <span className="text-xs font-mono text-slate-500">{q.year}</span>
                      <span className="text-xs font-mono text-slate-500">제{q.round}회</span>
                      <span><TypeBadge type={q.type} /></span>
                      <button
                        className="text-sm text-slate-800 text-left truncate hover:text-blue-600 transition-colors"
                        onClick={() => setModal(q)}
                        title={q.question}
                      >
                        {q.question}
                      </button>
                      <div className="flex justify-center">
                        <button
                          onClick={() => setModal(q)}
                          className="text-xs px-2.5 py-1 rounded-md border border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          보기
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Pagination
              page={page}
              total={filtered.length}
              pageSize={PAGE_SIZE}
              onChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            />
          </div>
        </div>
      )}

      {!db && !error && (
        <div className="text-center py-20 text-slate-400 text-sm animate-pulse">
          DB 로딩 중...
        </div>
      )}

      <QuestionModal question={modal} onClose={() => setModal(null)} />
    </div>
  );
}
