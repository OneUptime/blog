# Validation Summary: How to Handle Async Components in Vue

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Vue 3
- Vue async components
- Vue Suspense
- Vue Router lazy-loaded routes
- TypeScript
- Dynamic imports and code splitting
- KeepAlive

## Sources Consulted
- Vue official docs: Async Components - https://vuejs.org/guide/components/async
- Vue official API: defineAsyncComponent - https://vuejs.org/api/general.html#defineasynccomponent
- Vue official docs: Suspense - https://vuejs.org/guide/built-ins/suspense
- Vue official API: onErrorCaptured - https://vuejs.org/api/composition-api-lifecycle.html#onerrorcaptured
- Vue official docs: KeepAlive - https://vuejs.org/guide/built-ins/keep-alive.html
- Vue Router official docs: Lazy Loading Routes - https://router.vuejs.org/guide/advanced/lazy-loading.html

## Issues Found
- The router example labeled the home route as "Eagerly loaded" while using `component: () => import(...)`, which is lazy-loaded. Changed it to a static `Home` import and kept dynamic imports for lazy routes.
- The same router example mixed `defineAsyncComponent` into a route-level lazy-loading example. Vue Router documents route lazy loading as distinct from Vue async components and says route components should be plain dynamic-import functions. Moved the `defineAsyncComponent` example into a separate non-route snippet.
- Removed unused imports (`h` and `shallowRef`) that would fail or warn in stricter TypeScript / linted projects.
- Updated `Component` imports to `import type` in TypeScript examples so they work cleanly with modern TypeScript settings such as `verbatimModuleSyntax`.
- Clarified that async component loading, error, delay, and timeout options are ignored when a parent Suspense controls the async component.
- Clarified that Suspense is still marked experimental in Vue's official documentation.
- Updated the Suspense error-boundary example to state that Suspense does not catch errors by itself, normalize the `unknown` error received by `onErrorCaptured`, and actually render an error fallback.
- Added a Vue 3.3+ caveat for nested Suspense boundaries.

## Review Notes
The remaining examples are illustrative snippets rather than a complete runnable application. The preloading helper demonstrates the pattern of triggering the dynamic import before navigation; production implementations may also cache the loader promise explicitly to avoid duplicate concurrent imports.
