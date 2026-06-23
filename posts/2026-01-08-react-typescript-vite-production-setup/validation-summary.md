# Validation Summary: How to Set Up a Production-Ready React Project with TypeScript and Vite

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- React 18
- TypeScript (~5.6)
- Vite 6
- ESLint 9 (flat config) + typescript-eslint 8
- Prettier 3
- Docker (multi-stage) + nginx
- GitHub Actions CI/CD
- Vitest

## Sources Consulted
- Vite documentation — scaffolding, env variables, build/rollup options, server/preview config (https://vite.dev/guide/, https://vite.dev/config/)
- TypeScript handbook — tsconfig compiler options, project references, build mode (`tsc -b`), UMD globals error TS2686 (https://www.typescriptlang.org/tsconfig)
- React TypeScript usage / `@types/react` — `ReactElement`, automatic JSX runtime (`react-jsx`) (https://react.dev/, DefinitelyTyped)
- typescript-eslint flat config — `strictTypeChecked`, `stylisticTypeChecked`, `tseslint.config()` helper (https://typescript-eslint.io/)
- Prettier configuration & plugins documentation (https://prettier.io/docs/en/options.html, /plugins)
- nginx documentation — `gzip_static`, `try_files`, caching headers (https://nginx.org/en/docs/)
- Docker / docker-compose reference, official `node` and `nginx` images
- GitHub Actions — checkout@v4, setup-node@v4, docker build-push-action@v5, metadata-action@v5

## Issues Found
1. **`Button.tsx` — invalid return type annotation (`React.ReactElement`).** The component file imports only named types (`ButtonHTMLAttributes`, `ReactNode`) from `react` and does not import the `React` namespace. Because the file is a module with imports, annotating the return type as `React.ReactElement` references the UMD global and fails to compile under the post's own `strict` config (TypeScript error TS2686). Fixed by importing `ReactElement` directly (`import { type ButtonHTMLAttributes, type ReactElement, type ReactNode } from 'react';`) and changing the return type to `ReactElement`.

2. **`.prettierrc` — references an uninstalled plugin.** The config listed `"plugins": ["prettier-plugin-tailwindcss"]`, but that plugin is never installed (it appears in no `npm install` command and is absent from the final `package.json` devDependencies), and Tailwind is not part of this base setup. Running the documented `npm run format` / `format:check` would fail with "Cannot find package 'prettier-plugin-tailwindcss'". Removed the unused `plugins` entry (and the now-trailing comma) so the formatting scripts work as documented.

## Review Notes
- The combined `tsconfig.json` (app options + `references` to `tsconfig.node.json`) with `"build": "tsc -b && vite build"` matches the structure Vite's `react-ts` scaffold uses and is valid; `noEmit: true` is permitted alongside `allowImportingTsExtensions`.
- The Dockerfile creates a non-root user (`nextjs`) and `chown`s nginx directories but never issues a `USER` directive, so nginx still runs as root. This is functional (and works without modification) but the "non-root for security" comment is aspirational rather than enforced — a future improvement, not a correctness bug.
- The example project structure lists `Button.styles.ts` while `Button.tsx` imports `./Button.module.css`. This is a cosmetic naming inconsistency in illustrative trees, not a functional error, so it was left as-is.
- `gzip_static on;` relies on the `ngx_http_gzip_static_module`, which is compiled into the official `nginx` Docker image, so the nginx config works as written.
- `docker-compose.yml` retains the top-level `version: '3.8'` key, which newer Compose versions ignore (with a warning) but still accept — not an error.
- Dependency versions referenced (React 18.3, Vite 6, ESLint 9, typescript-eslint 8, TypeScript 5.6) are mutually compatible and current for the early-2026 timeframe of the post.
