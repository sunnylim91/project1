import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // gzip 압축: Nginx/Caddy 등 서버에서 처리하거나
    // vite-plugin-compression2 패키지로 빌드 시 .gz 생성 가능
    // npm install -D vite-plugin-compression2
    // import compression from 'vite-plugin-compression2'
    // compression({ algorithm: 'gzip' }),
  ],

  build: {
    // 압축 크기 리포트 활성화
    reportCompressedSize: true,

    // 청크 크기 경고 임계값 (kb)
    chunkSizeWarningLimit: 600,

    rollupOptions: {
      output: {
        // ── 페이지별 코드 스플리팅 + 라이브러리 청크 분리 ───
        manualChunks(id) {
          // recharts + D3 — 차트 전용 청크
          if (
            id.includes('recharts') ||
            id.includes('/d3-') ||
            id.includes('d3-shape') ||
            id.includes('d3-scale')
          ) return 'vendor-recharts';

          // react-markdown + remark/unified 생태계
          if (
            id.includes('react-markdown') ||
            id.includes('remark') ||
            id.includes('micromark') ||
            id.includes('mdast') ||
            id.includes('hast') ||
            id.includes('unified') ||
            id.includes('vfile')
          ) return 'vendor-markdown';

          // React 코어 + 라우터
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('react-router') ||
            id.includes('scheduler')
          ) return 'vendor-react';
        },
      },
    },
  },
})
