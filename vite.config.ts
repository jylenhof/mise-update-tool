import fs from 'node:fs';
import { builtinModules, createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const undiciShim = path.join(rootDir, 'src/shims/undici-action-exports.ts');

function resolveUndiciRoot(): string {
  const actionsCorePkg = path.join(rootDir, 'node_modules/@actions/core/package.json');
  const undiciMain = createRequire(fs.realpathSync(actionsCorePkg)).resolve('undici');
  return path.dirname(undiciMain);
}

export default defineConfig({
  resolve: {
    alias: [
      // `@actions/http-client` / `@actions/github` only need ProxyAgent + fetch.
      // undici's main entry eagerly loads WebSocket (RFC 6455 SHA-1 handshake),
      // which must not ship in the action bundle.
      {
        find: /^undici$/,
        replacement: undiciShim,
      },
      {
        find: /^undici\/(.*)/,
        replacement: `${resolveUndiciRoot()}/$1`,
      },
    ],
  },
  build: {
    lib: {
      entry: './src/index.ts',
      formats: ['cjs'], // GitHub Actions entry point; .cjs avoids ESM/CJS clash with "type": "module"
      fileName: () => 'index.cjs',
    },
    outDir: 'dist',
    minify: false, // Optional: easier to debug on GitHub when not minified
    rollupOptions: {
      // Exclude Node built-in modules from the final bundle
      external: [...builtinModules, ...builtinModules.map((m) => `node:${m}`)],
    },
  },
});
