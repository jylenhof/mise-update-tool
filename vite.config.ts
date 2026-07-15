import { builtinModules } from 'node:module';
import { defineConfig } from 'vite';

export default defineConfig({
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
