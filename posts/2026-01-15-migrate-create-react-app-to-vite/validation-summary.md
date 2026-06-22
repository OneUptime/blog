# Validation Summary: How to Migrate from Create React App to Vite for Faster Development

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- React
- Vite (v5)
- Create React App / react-scripts
- Webpack (CRA's bundler, for comparison)
- Rollup and esbuild (Vite's bundlers)
- Vitest / Jest (testing)
- @vitejs/plugin-react
- vite-plugin-svgr
- vite-plugin-node-polyfills
- @vitejs/plugin-legacy
- rollup-plugin-visualizer
- TypeScript
- Environment variables (REACT_APP_ vs VITE_)

## Sources Consulted
- Vite official docs — Env Variables and Modes (https://vite.dev/guide/env-and-mode) — confirmed `VITE_` prefix requirement and the `MODE`/`DEV`/`PROD` constants
- Vite official docs — Getting Started / Migration from CRA guidance (https://vite.dev/guide/)
- vite-plugin-svgr README (https://github.com/pd4d10/vite-plugin-svgr) — confirmed `?react` suffix import, `svgrOptions`, and `include`/`exclude` options
- @vitejs/plugin-react and @vitejs/plugin-legacy plugin docs
- vite-plugin-node-polyfills documentation (`include` option API)

## Issues Found
1. **No-op `mv` command for the TypeScript entry point (fixed).** The post showed:
   ```bash
   mv src/index.tsx src/index.tsx  # Usually already correct
   ```
   This command moves a file onto itself and actually errors at runtime (`mv: 'src/index.tsx' and 'src/index.tsx' are the same file` on GNU coreutils). Replaced it with a plain-text note that TypeScript projects already use the correct `src/index.tsx` extension and need no rename. This was the only outright technical error.

## Review Notes
- **Env variable prefixing, `import.meta.env.MODE`/`DEV`/`PROD`, and the `VITE_` prefix** were all verified against the official Vite docs and are correct.
- **`vite-plugin-svgr` usage** (both the `?react` suffix import and the `exportType: 'default'` config that lets you import the component as the default export) is consistent and valid. The `svgo: false`, `ref`, `titleProp` svgrOptions are valid svgr core options.
- **`sed -i ''` migration scripts** use BSD/macOS sed syntax. On Linux/GNU the correct form is `sed -i` (no empty-string argument). This is a platform portability caveat rather than an outright error, so it was left as-is; readers on Linux will need to drop the `''`.
- **Version currency:** The post is written around Vite 5 ("VITE v5.x.x", "Vite 5+ requires Node 18+"). As of mid-2026, Vite 6 and Vite 7 have shipped (Vite 7 requires Node 20.19+ / 22.12+). The Vite 5 statements are accurate for that version, but readers starting fresh today would likely install a newer major. This is a dated-but-not-incorrect caveat.
- **`__dirname` in `vite.config.ts`** works because Vite pre-bundles the config with esbuild before execution; this matches official Vite examples even though `__dirname` is otherwise unavailable in native ESM.
- **`outDir: 'build'`** is correctly used to preserve CRA's `build` output directory (Vite defaults to `dist`); the post is internally consistent about this throughout.
- **Step 9's "uninstall then reinstall the testing libraries"** is redundant (the same packages are removed and re-added) but not technically wrong, so it was left untouched per the "fix only what is technically wrong" guidance.
- The performance comparison numbers (30-60x faster cold start, esbuild 10-100x, etc.) align with figures cited in Vite's own documentation and are presented as approximate ranges.
