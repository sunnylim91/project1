import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Loader2, Copy, Printer, Sparkles, BookOpen, X,
  ChevronDown, Search, CheckCircle2, AlertCircle,
  ShieldCheck, Wand2,
} from 'lucide-react';
import { loadDB } from '../utils/searcher';
import { detectType, findSimilarByText, generateAnswer, formatAnswer } from '../utils/answerEngine';
import { validateAnswer, needsAutoFix } from '../utils/validator';

const ALL_TYPES = ['용어형', '설명형', '논술형', '비교형'];

const TYPE_COLORS = {
  '용어형': 'bg-blue-100 text-blue-800',
  '설명형': 'bg-green-100 text-green-800',
  '논술형': 'bg-purple-100 text-purple-800',
  '비교형': 'bg-orange-100 text-orange-800',
};

const API_KEY = localStorage.getItem('GEMINI_API_KEY') ?? '';

// ── 검증 항목 레이블 ──────────────────────────────────────────
const SCORE_LABELS = {
  '법령적합성':    '법령 적합성',
  '최신성':        '최신성',
  '기술정확성':    '기술 정확성',
  '논리성':        '논리성',
  '출제의도부합성':'출제의도 부합',
  '답안구성':      '답안 구성',
  '분량적정성':    '분량 적정성',
  '채점관가독성':  '채점관 가독성',
};

function scoreColor(s) {
  if (s >= 95) return '#16a34a';
  if (s >= 85) return '#2563eb';
  return '#dc2626';
}
function scoreIcon(s) { return s >= 85 ? '✅' : '⚠️'; }
function overallGrade(s) {
  if (s >= 95) return '🏆 최우수';
  if (s >= 90) return '🏆 우수';
  if (s >= 85) return '✅ 양호';
  if (s >= 80) return '⚠️ 보통';
  return '❌ 미흡';
}

// ── 검증 결과 패널 ────────────────────────────────────────────
function ValidationPanel({ validation, isValidating }) {
  if (isValidating) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex items-center gap-3 text-sm text-slate-500">
        <Loader2 size={16} className="animate-spin text-blue-500" />
        품질 검증 중... (로컬 분석)
      </div>
    );
  }
  if (!validation) return null;

  const total = validation['종합점수'] ?? 0;
  const canFix = needsAutoFix(validation);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div
        className="px-5 py-3 border-b border-slate-100 flex items-center justify-between"
        style={{ backgroundColor: 'rgba(30,58,95,0.04)' }}
      >
        <p className="text-sm font-semibold text-slate-700">검증 결과</p>
      </div>

      {/* 항목별 점수 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
              <th className="text-left px-5 py-2.5 font-semibold">항목</th>
              <th className="text-center px-4 py-2.5 font-semibold">점수</th>
              <th className="text-center px-4 py-2.5 font-semibold">평가</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {Object.entries(SCORE_LABELS).map(([key, label]) => {
              const score = validation[key] ?? 0;
              return (
                <tr key={key} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-2.5 text-slate-700">{label}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span
                      className="font-mono font-bold text-base"
                      style={{ color: scoreColor(score) }}
                    >
                      {score}
                    </span>
                    <span className="text-xs text-slate-400"> / 100</span>
                  </td>
                  <td className="px-4 py-2.5 text-center text-base">{scoreIcon(score)}</td>
                </tr>
              );
            })}
            {/* 종합 점수 행 */}
            <tr style={{ backgroundColor: 'rgba(30,58,95,0.06)' }}>
              <td className="px-5 py-3 font-bold text-slate-800">종합 점수</td>
              <td className="px-4 py-3 text-center">
                <span
                  className="font-mono font-bold text-xl"
                  style={{ color: scoreColor(total) }}
                >
                  {total}
                </span>
                <span className="text-xs text-slate-400"> / 100</span>
              </td>
              <td className="px-4 py-3 text-center font-semibold text-sm">
                {overallGrade(total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 개선사항 + 재생성 안내 */}
      {validation['개선사항']?.length > 0 && (
        <div className="px-5 py-4 border-t border-slate-100 space-y-3">
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1.5">개선사항</p>
            <ul className="space-y-1">
              {validation['개선사항'].map((item, i) => (
                <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                  <span className="text-amber-500 shrink-0 mt-0.5">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          {canFix && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <Wand2 size={14} className="shrink-0 mt-0.5 text-amber-600" />
              <p className="text-xs text-amber-800">
                분량과 법령 근거를 보강하여 답안을 다시 생성해주세요.
                위 <strong>[모범답안 생성]</strong> 버튼을 다시 클릭하면 새 답안이 생성됩니다.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── 기출문제 선택 모달 ────────────────────────────────────────
function QuestionPickerModal({ questions, onSelect, onClose }) {
  const [kw, setKw] = useState('');
  const filtered = useMemo(() => {
    if (!kw.trim()) return questions.slice(0, 80);
    const lower = kw.toLowerCase();
    return questions
      .filter(
        (q) =>
          q.question.toLowerCase().includes(lower) ||
          q.keywords.some((k) => k.toLowerCase().includes(lower))
      )
      .slice(0, 80);
  }, [questions, kw]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col"
        style={{ maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <p className="font-semibold text-slate-800">기출문제 선택</p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              type="text"
              placeholder="문제 키워드 검색..."
              value={kw}
              onChange={(e) => setKw(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>
        <div className="overflow-y-auto flex-1 divide-y divide-slate-50">
          {filtered.map((q) => (
            <button
              key={q.id}
              className="w-full text-left px-5 py-3 hover:bg-slate-50 transition-colors"
              onClick={() => { onSelect(q); onClose(); }}
            >
              <div className="flex items-start gap-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${TYPE_COLORS[q.type] || 'bg-slate-100 text-slate-600'}`}>
                  {q.type}
                </span>
                <div>
                  <p className="text-sm text-slate-800">{q.question}</p>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{q.year}년 · 제{q.round}회</p>
                </div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-center py-10 text-sm text-slate-400">검색 결과 없음</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 답안 출력 ─────────────────────────────────────────────────
function AnswerMarkdown({ text }) {
  return (
    <div
      className="answer-content"
      style={{
        whiteSpace: 'pre-wrap',
        fontFamily: 'Noto Sans KR, sans-serif',
        fontSize: '12px',
        lineHeight: '1.9',
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
        width: '100%',
        height: 'auto',
        overflow: 'visible',
      }}
    >
      {formatAnswer(text)}
    </div>
  );
}

// ── 메인 페이지 ───────────────────────────────────────────────
export default function AnswerPage() {
  const [searchParams] = useSearchParams();
  const questionId = searchParams.get('id');
  const questionText = searchParams.get('q'); // TrendPage 예상문제에서 전달

  const [db, setDb] = useState(null);
  const [question, setQuestion] = useState('');
  const [questionType, setQuestionType] = useState('용어형');
  const [typeOverridden, setTypeOverridden] = useState(false);
  const [showTypeDrop, setShowTypeDrop] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [answerText, setAnswerText] = useState('');
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const [similarQuestions, setSimilarQuestions] = useState([]);

  // 검증 상태
  const [validation, setValidation] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validateError, setValidateError] = useState(null);

  const answerRef = useRef(null);
  const validationRef = useRef(null);

  // DB 로드 + URL 파라미터 처리
  useEffect(() => {
    loadDB().then((data) => {
      setDb(data);
      if (questionId) {
        const found = data.questions.find((q) => q.id === questionId);
        if (found) {
          setQuestion(found.question);
          setQuestionType(found.type);
          setTypeOverridden(true);
        }
      } else if (questionText) {
        const decoded = decodeURIComponent(questionText);
        setQuestion(decoded);
        setQuestionType(detectType(decoded));
        setTypeOverridden(false);
      }
    });
  }, [questionId, questionText]);

  // 질문 변경 → 유형 자동감지 + 유사문제
  useEffect(() => {
    if (!question.trim()) { setSimilarQuestions([]); return; }
    if (!typeOverridden) setQuestionType(detectType(question));
    if (db) setSimilarQuestions(findSimilarByText(db.questions, question, 3));
  }, [question, db, typeOverridden]);

  const resetValidation = () => {
    setValidation(null);
    setValidateError(null);
  };

  const handleGenerate = useCallback(async () => {
    if (!question.trim()) return;
    setIsGenerating(true);
    setAnswerText('');
    setError(null);
    resetValidation();

    let accumulated = '';
    await generateAnswer({
      question: question.trim(),
      type: questionType,
      similarQuestions,
      apiKey: API_KEY,
      onChunk: (chunk) => { accumulated += chunk; setAnswerText(accumulated); },
      onDone: () => {
        const lines = accumulated.split('\n').filter(Boolean);
        console.log('[UI] 최종 답안 길이:', accumulated.length, '자 /총', lines.length, '줄');
        console.log('[UI] 마지막 줄:', lines[lines.length - 1] ?? '(없음)');
        setIsGenerating(false);
        setTimeout(() => answerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      },
      onError: (msg) => { setError(msg); setIsGenerating(false); },
    });
  }, [question, questionType, similarQuestions]);

  const handleValidate = useCallback(() => {
    if (!answerText || isGenerating) return;
    setIsValidating(true);
    setValidateError(null);
    setValidation(null);
    const result = validateAnswer(question, answerText, questionType);
    setValidation(result);
    setIsValidating(false);
    setTimeout(() => validationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }, [answerText, question, questionType, isGenerating]);

  const handleCopy = useCallback(async () => {
    if (!answerText) return;
    await navigator.clipboard.writeText(answerText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [answerText]);

  const handleSelectQuestion = useCallback((q) => {
    setQuestion(q.question);
    setQuestionType(q.type);
    setTypeOverridden(true);
  }, []);

  const isWorking = isGenerating;

  return (
    <>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* 헤더 */}
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1e3a5f' }}>AI 답안 생성</h1>
          <p className="text-sm text-slate-500 mt-1">문제를 입력하거나 기출문제를 선택하면 모범답안을 생성합니다.</p>
        </div>

        {/* 문제 입력 영역 */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">문제 입력</p>
            <button
              onClick={() => setShowPicker(true)}
              disabled={!db}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <BookOpen size={13} />
              기출문제 선택
            </button>
          </div>

          <textarea
            value={question}
            onChange={(e) => { setQuestion(e.target.value); setTypeOverridden(false); }}
            placeholder="예) 네트워크 RTK"
            rows={4}
            className="w-full resize-none text-sm border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-100 text-slate-800 placeholder:text-slate-300 min-h-[120px] md:min-h-[80px]"
          />

          {/* 유형 선택 */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 shrink-0">자동감지 유형</span>
            <div className="relative">
              <button
                onClick={() => setShowTypeDrop((v) => !v)}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${TYPE_COLORS[questionType] || 'bg-slate-100 text-slate-600'}`}
              >
                {questionType}
                <ChevronDown size={12} />
              </button>
              {showTypeDrop && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-lg border border-slate-200 shadow-lg z-10 py-1 min-w-28">
                  {ALL_TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => { setQuestionType(t); setTypeOverridden(true); setShowTypeDrop(false); }}
                      className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50"
                    >
                      <span className={`font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[t]}`}>{t}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {typeOverridden && <span className="text-xs text-amber-600">수동 설정됨</span>}
          </div>
        </div>

        {/* 생성 버튼 */}
        <button
          onClick={handleGenerate}
          disabled={isWorking || !question.trim()}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm text-white transition-opacity disabled:opacity-50"
          style={{ backgroundColor: '#1e3a5f' }}
        >
          {isGenerating ? (
            <><Loader2 size={17} className="animate-spin" />답안 생성 중...</>
          ) : (
            <><Sparkles size={17} />모범답안 생성</>
          )}
        </button>

        {/* API 에러 */}
        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* 유사 기출문제 */}
        {similarQuestions.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-amber-700 mb-2">유사 기출문제 TOP {similarQuestions.length}</p>
            <div className="space-y-2">
              {similarQuestions.map((q) => (
                <div key={q.id} className="flex items-start gap-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${TYPE_COLORS[q.type] || 'bg-slate-100 text-slate-600'}`}>
                    {q.type}
                  </span>
                  <div>
                    <p className="text-xs text-slate-700">{q.question}</p>
                    <p className="text-xs text-slate-400 font-mono">{q.year}년 · 제{q.round}회</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 답안 출력 */}
        {(answerText || isWorking) && (
          <div ref={answerRef} className="bg-white rounded-xl border border-slate-200 shadow-sm print-target">
            <div
              className="flex items-center justify-between px-5 py-3 border-b border-slate-100 no-print"
              style={{ backgroundColor: 'rgba(30,58,95,0.04)' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">모범답안</span>
                {isWorking && (
                  <span className="flex items-center gap-1 text-xs text-blue-500">
                    <Loader2 size={11} className="animate-spin" />
                    생성 중...
                  </span>
                )}
              </div>
              {!isWorking && answerText && (
                <div className="flex flex-wrap gap-2 justify-end">
                  {/* 품질 검증 버튼 */}
                  <button
                    onClick={handleValidate}
                    disabled={isValidating}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border text-white font-medium transition-opacity disabled:opacity-60"
                    style={{ backgroundColor: '#1e3a5f', borderColor: '#1e3a5f' }}
                  >
                    <ShieldCheck size={13} />
                    품질 검증
                  </button>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    {copied
                      ? <><CheckCircle2 size={13} className="text-green-500" />복사됨</>
                      : <><Copy size={13} />복사</>}
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <Printer size={13} />인쇄
                  </button>
                </div>
              )}
            </div>

            <div className="px-6 py-5" style={{ height: 'auto', overflow: 'visible' }}>
              <div className="hidden print-show mb-4 pb-3 border-b border-slate-200">
                <p className="text-lg font-bold" style={{ color: '#1e3a5f' }}>측량 및 지형공간정보기술사 모범답안</p>
                <p className="text-sm text-slate-500 mt-1">문제: {question}</p>
              </div>
              {answerText
                ? <AnswerMarkdown text={answerText} />
                : (
                  <div className="flex items-center gap-2 py-8 justify-center text-slate-400 text-sm">
                    <Loader2 size={16} className="animate-spin" />답안을 생성하고 있습니다...
                  </div>
                )}
            </div>
          </div>
        )}

        {/* 검증 결과 */}
        <div ref={validationRef}>
          {validateError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>검증 오류: {validateError}</span>
            </div>
          )}
          <ValidationPanel
            validation={validation}
            isValidating={isValidating}
          />
        </div>
      </div>

      {/* 기출문제 선택 모달 */}
      {showPicker && db && (
        <QuestionPickerModal
          questions={db.questions}
          onSelect={handleSelectQuestion}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  );
}
