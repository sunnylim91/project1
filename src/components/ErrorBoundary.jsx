import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

// ── API 오류 코드 → 한국어 메시지 ────────────────────────────
export function getApiErrorMessage(statusOrCode) {
  const MAP = {
    401:       'API 키를 확인해주세요.',
    403:       'API 접근 권한이 없습니다.',
    429:       '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
    500:       'AI 서버 오류입니다. 잠시 후 다시 시도해주세요.',
    503:       'AI 서버가 일시적으로 사용 불가합니다. 잠시 후 다시 시도해주세요.',
    network:   '네트워크 연결을 확인해주세요.',
    overloaded:'AI 서버가 과부하 상태입니다. 잠시 후 다시 시도해주세요.',
  };
  return MAP[statusOrCode] ?? `오류가 발생했습니다. (코드: ${statusOrCode})`;
}

// ── 에러 UI ───────────────────────────────────────────────────
function ErrorUI({ error, onRetry }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-slate-50">
      <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-8 max-w-md w-full text-center">
        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={28} className="text-red-500" />
        </div>
        <h2 className="text-lg font-bold text-slate-800 mb-2">오류가 발생했습니다</h2>
        <p className="text-sm text-slate-500 mb-1">
          {error?.message ?? '알 수 없는 오류'}
        </p>
        {error?.stack && (
          <details className="text-left mt-3 mb-4">
            <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">
              상세 정보 보기
            </summary>
            <pre className="mt-2 text-xs bg-slate-50 p-3 rounded overflow-auto max-h-32 text-slate-600">
              {error.stack}
            </pre>
          </details>
        )}
        <button
          onClick={onRetry}
          className="flex items-center gap-2 mx-auto px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
          style={{ backgroundColor: '#1e3a5f' }}
        >
          <RefreshCw size={14} />
          다시 시도
        </button>
      </div>
    </div>
  );
}

// ── React 에러 바운더리 클래스 컴포넌트 ──────────────────────
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.handleRetry = this.handleRetry.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleRetry() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (this.state.hasError) {
      return <ErrorUI error={this.state.error} onRetry={this.handleRetry} />;
    }
    return this.props.children;
  }
}
