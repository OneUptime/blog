# Validation Summary: How to Use Inertia.js with Laravel

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Inertia.js (v2)
- Laravel (11+)
- PHP
- Vue 3 (`@inertiajs/vue3`)
- React (mentioned as alternative)
- Vite / `laravel-vite-plugin`
- Composer
- npm
- `@vue/server-renderer` (for SSR)
- Tailwind CSS (used in template examples)

## Sources Consulted
- Inertia.js official documentation: https://inertiajs.com/
- Inertia.js server-side setup: https://inertiajs.com/server-side-setup
- Inertia.js client-side setup: https://inertiajs.com/client-side-setup
- Inertia.js responses: https://inertiajs.com/responses
- Inertia.js forms / `useForm`: https://inertiajs.com/forms
- Inertia.js shared data: https://inertiajs.com/shared-data
- Inertia.js partial reloads: https://inertiajs.com/partial-reloads
- Inertia.js deferred props: https://inertiajs.com/deferred-props
- Inertia.js merging props / `optional`: https://inertiajs.com/merging-props
- Inertia.js upgrade guide (v1 → v2): https://inertiajs.com/upgrade-guide
- Inertia.js server-side rendering: https://inertiajs.com/server-side-rendering
- Inertia.js progress bar: https://inertiajs.com/progress-indicators
- Inertia.js manual visits / `router.visit`: https://inertiajs.com/manual-visits
- Laravel 11+ middleware registration docs: https://laravel.com/docs/11.x/middleware

## Issues Found

1. **Incorrect SSR install command** (Step in "Enable SSR" section).
   - Before: `npm install @inertiajs/vue3` — this package was already installed in the client-side setup step, so the command was a no-op. The actual missing dependency for Vue 3 SSR is `@vue/server-renderer`, which the very next code block imports via `import { renderToString } from '@vue/server-renderer'`.
   - After: `npm install @vue/server-renderer` — matches what the SSR entry file imports and what the official Inertia/Vue SSR docs recommend installing for the Vue adapter.

2. **Use of deprecated `Inertia::lazy()`** (Lazy Loading Props section).
   - Before: `Inertia::lazy(fn () => ...)` with a comment saying "Use Inertia::lazy() for expensive operations".
   - After: `Inertia::optional(fn () => ...)` with a comment noting it replaces the deprecated `Inertia::lazy()` in Inertia v2. Per the Inertia v2 upgrade guide, `Inertia::lazy()` is deprecated in v2 (and removed in v3); `Inertia::optional()` is the modern equivalent that provides the same on-demand partial-reload behavior.

## Review Notes

- The Blade directives `@inertia` and `@inertiaHead` used in the root template remain valid in v2, although newer docs additionally recommend the `<x-inertia::app />` and `<x-inertia::head />` Blade components. The legacy directives still work and were left as-is.
- The Laravel 11 middleware registration syntax (`->withMiddleware(... $middleware->web(append: [HandleInertiaRequests::class]) ...)`) matches the official Inertia setup guide for Laravel 11+.
- The progress bar configuration keys (`delay`, `color`, `includeCSS`, `showSpinner`) are valid options for `createInertiaApp`'s `progress` setting; defaults differ slightly from the post's example values (the post uses `#4B5563` instead of the Inertia default `#29d`, and `showSpinner: true` instead of the default `false`), but these are user-customizable.
- The Vite SSR config uses `laravel-vite-plugin`'s `ssr: 'resources/js/ssr.js'` option, which is the Laravel-recommended way to wire up SSR; this is correct and current.
- `Inertia::defer()` is correctly used as a Inertia v2 feature for post-render data loading.
- The `useForm` API (`form.post`, `form.processing`, `form.errors`, `form.reset`, `onSuccess` callback) matches the current `@inertiajs/vue3` API.
- The `defineOptions({ layout: AppLayout })` pattern for persistent layouts is current and correct for Vue 3 + Inertia.
- Pagination assumes Laravel's default paginator output (`users.data`, `users.links` with `label`, `url`, `active`), which is accurate.
