import { lazy, Suspense, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';

// ── 페이지별 lazy import (코드 스플리팅) ────────────────────
const HomePage    = lazy(() => import('./pages/HomePage'));
const BrowserPage = lazy(() => import('./pages/BrowserPage'));
const AnswerPage  = lazy(() => import('./pages/AnswerPage'));
const TrendPage   = lazy(() => import('./pages/TrendPage'));
const PredictPage = lazy(() => import('./pages/PredictPage'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24 text-slate-400 text-sm animate-pulse">
      페이지 로딩 중...
    </div>
  );
}

export default function App() {
  const [apiKey, setApiKey] = useState(
    localStorage.getItem('GEMINI_API_KEY') || ''
  );
  const [inputKey, setInputKey] = useState('');
  const [error, setError] = useState('');

  if (!apiKey) return (
    <div className="min-h-screen bg-[#1e3a5f] flex items-center justify-center px-6">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <h1 className="text-lg font-bold text-[#1e3a5f] mb-1">
          측지기술사 AI 답안 생성기
        </h1>
        <p className="text-xs text-gray-500 mb-4">
          사용을 위해 본인의 Gemini API 키를 입력하세요.
        </p>
        <div className="bg-blue-50 rounded-lg p-3 mb-4 text-xs text-blue-700">
          🔑 무료 키 발급: aistudio.google.com<br />
          Google 계정으로 로그인 → Get API Key
        </div>
        <input
          type="password"
          placeholder="AIza로 시작하는 키 입력"
          className="w-full border rounded-lg px-3 py-2 text-sm mb-2"
          value={inputKey}
          onChange={(e) => setInputKey(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && document.getElementById('btn-start').click()}
        />
        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
        <button
          id="btn-start"
          onClick={() => {
            if (!inputKey.startsWith('AIza')) {
              setError('올바른 키 형식이 아닙니다. AIza로 시작해야 합니다.');
              return;
            }
            localStorage.setItem('GEMINI_API_KEY', inputKey);
            setApiKey(inputKey);
          }}
          className="w-full py-2.5 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium"
        >
          시작하기
        </button>
        <p className="text-xs text-gray-400 text-center mt-3">
          키는 브라우저에만 저장되며 서버로 전송되지 않습니다.
        </p>
      </div>
    </div>
  );

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Layout>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/"        element={<HomePage />} />
              <Route path="/browser" element={<BrowserPage />} />
              <Route path="/answer"  element={<AnswerPage />} />
              <Route path="/trend"   element={<TrendPage />} />
              <Route path="/predict" element={<PredictPage />} />
            </Routes>
          </Suspense>
        </Layout>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
