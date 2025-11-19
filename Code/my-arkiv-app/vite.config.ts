import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    nodePolyfills({
      polyfills: {
        zlib: true,
        buffer: true,
        process: true,
        util: true,
        events: true,
        stream: true,
        path: true,
        assert: true,
      },
      protocolImports: true,
    }),
  ],
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    exclude: ['brotli-wasm'],
  },
  assetsInclude: ['**/*.wasm'],
});

