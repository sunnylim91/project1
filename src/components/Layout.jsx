import { Link, useLocation } from 'react-router-dom';
import { BookOpen, FileText, TrendingUp, Cpu, Menu, X, Sparkles } from 'lucide-react';
import { useState } from 'react';

const NAV_ITEMS = [
  { path: '/',        label: '대시보드',   icon: Cpu },
  { path: '/browser', label: '기출문제',   icon: BookOpen },
  { path: '/answer',  label: '답안 생성',  icon: FileText },
  { path: '/trend',   label: '출제경향',   icon: TrendingUp },
  { path: '/predict', label: '예상문제',   icon: Sparkles },
];

export default function Layout({ children }) {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* 네비게이션 */}
      <header style={{ backgroundColor: '#1e3a5f' }} className="shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* 로고 */}
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <div
                className="w-8 h-8 rounded flex items-center justify-center font-bold text-sm"
                style={{ backgroundColor: '#c9a227', color: '#1e3a5f' }}
              >
                지
              </div>
              <span className="text-white font-semibold text-sm sm:text-base leading-tight">
                측지기술사<br className="hidden sm:block" />
                <span className="hidden sm:inline text-xs font-normal opacity-70">기출문제 분석</span>
              </span>
            </Link>

            {/* 데스크톱 메뉴 */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
                const active = pathname === path;
                return (
                  <Link
                    key={path}
                    to={path}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    style={
                      active
                        ? { backgroundColor: '#c9a227', color: '#1e3a5f' }
                        : { color: 'rgba(255,255,255,0.8)' }
                    }
                    onMouseEnter={(e) => {
                      if (!active) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      if (!active) e.currentTarget.style.backgroundColor = '';
                    }}
                  >
                    <Icon size={15} />
                    {label}
                  </Link>
                );
              })}
            </nav>

            {/* API 키 초기화 */}
            <button
              onClick={() => {
                if (window.confirm('API 키를 초기화하시겠습니까?')) {
                  localStorage.removeItem('GEMINI_API_KEY');
                  window.location.reload();
                }
              }}
              className="text-white text-sm px-2 opacity-70 hover:opacity-100"
              title="API 키 초기화"
            >
              ⚙️
            </button>

            {/* 모바일 햄버거 */}
            <button
              className="md:hidden text-white p-2"
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* 모바일 메뉴 */}
        {mobileOpen && (
          <div className="md:hidden border-t border-white/10 px-4 pb-3">
            {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
              const active = pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium mt-1"
                  style={
                    active
                      ? { backgroundColor: '#c9a227', color: '#1e3a5f' }
                      : { color: 'rgba(255,255,255,0.85)' }
                  }
                >
                  <Icon size={16} />
                  {label}
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* 콘텐츠 */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* 푸터 */}
      <footer style={{ backgroundColor: '#1e3a5f' }} className="mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-white/50 text-xs">
          측량 및 지형공간정보기술사 기출문제 DB · 2026
        </div>
      </footer>
    </div>
  );
}
