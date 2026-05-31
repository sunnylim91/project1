import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';

// ── 페이지별 lazy import (코드 스플리팅) ────────────────────
const HomePage    = lazy(() => import('./pages/HomePage'));
const BrowserPage = lazy(() => import('./pages/BrowserPage'));
const AnswerPage  = lazy(() => import('./pages/AnswerPage'));
const TrendPage   = lazy(() => import('./pages/TrendPage'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24 text-slate-400 text-sm animate-pulse">
      페이지 로딩 중...
    </div>
  );
}

export default function App() {
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
            </Routes>
          </Suspense>
        </Layout>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
