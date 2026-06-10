# Validation Summary: How to Use Fresh Framework with Deno

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Deno (runtime)
- Fresh framework (1.x)
- Preact / preact/hooks
- TypeScript
- Tailwind CSS
- File-based routing, SSR, Islands architecture, Middleware

## Sources Consulted
- Fresh 1.x routing documentation: https://github.com/denoland/fresh/blob/1.x/docs/latest/concepts/routing.md
- Fresh 1.x getting started: https://github.com/denoland/fresh/blob/1.x/docs/latest/getting-started/create-a-project.md
- Fresh 1.x README: https://github.com/denoland/fresh/blob/1.x/README.md
- Fresh init endpoint behavior: `deno run -A -r https://fresh.deno.dev`
- Preact JSX attribute conventions (`class`, `for` supported as HTML-style aliases)

## Issues Found
1. **Catch-all route syntax description** — The post stated "use the spread syntax with double brackets" for catch-all routes, but in Fresh 1.x catch-all routes use **single** brackets with the spread operator (e.g. `[...slug].tsx`). Double brackets (e.g. `[[version]]`) are reserved for **optional** route segments, which is a different feature. The code sample itself was correct (`[...slug].tsx`); only the prose was wrong. Updated the prose to read "use the spread syntax inside square brackets".
2. **Deno version requirement** — The post recommended "Deno 1.25 or later", which is below the minimum needed by Fresh 1.x. Fresh 1.x requires at least Deno 1.31 (Fresh's own README directs users to install the latest Deno). Updated to "Deno 1.31 or later is recommended; the latest stable Deno release is preferred".

## Review Notes
- The Tailwind CSS section shows a partial setup (deno.json imports and a `tailwind.config.ts`) but does not include a `fresh.config.ts` registering the official `$fresh/plugins/tailwind.ts` plugin, which is the standard Fresh 1.6 integration path. Tailwind classes will not actually be compiled without that plugin wiring. This is an incompleteness rather than a strictly incorrect statement — the imports shown are syntactically valid — so it was left as-is per the "no new sections / no restructuring" directive.
- The post targets Fresh 1.x. Fresh 2.x (currently in alpha) introduces significant changes (different routing primitives such as `/foo/*`, an updated app/middleware API, and different project layout). Readers landing on this post after Fresh 2.x stabilizes should be aware that several APIs (e.g. `PageProps`, `Handlers`, `AppProps`, `FreshContext` from `$fresh/server.ts`, the `routes/_middleware.ts` convention) are Fresh 1.x conventions.
- Preact-specific JSX (`class` instead of `className`, `for` instead of `htmlFor`, `<textarea>{value}</textarea>` instead of using `value` prop) is correct for Preact and works inside Fresh, even though it would not work in React.
- The init command `deno run -A -r https://fresh.deno.dev my-fresh-app`, the `deno task start` command, and the default project directory layout are accurate for Fresh 1.x scaffolding.
