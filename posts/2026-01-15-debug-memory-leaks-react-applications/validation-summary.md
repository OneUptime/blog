# Validation Summary: How to Debug Memory Leaks in React Applications

## Status
validated

## Post Type
Tutorial / Guide (in-depth technical walkthrough with code examples)

## Technologies Covered
- React (function components, hooks: useState, useEffect, useRef, useCallback, useMemo, React.memo)
- TypeScript
- Chrome DevTools (Memory panel, heap snapshots, allocation timeline, retainers, Performance tab)
- React DevTools Profiler
- Web APIs: AbortController, IntersectionObserver, WebSocket, addEventListener/removeEventListener, setInterval, `performance.memory`
- react-dom/client (createRoot / Root)
- Redux Toolkit / Reselect (createSelector)
- Jest
- Playwright
- GitHub Actions (CI workflow YAML)

## Sources Consulted
- React documentation — Synchronizing with Effects & cleanup, useRef, useCallback, useMemo (https://react.dev/reference/react)
- React DOM client API — createRoot (https://react.dev/reference/react-dom/client/createRoot)
- MDN — AbortController (https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
- MDN — IntersectionObserver (https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver)
- MDN — EventTarget.addEventListener / removeEventListener (https://developer.mozilla.org/en-US/docs/Web/API/EventTarget)
- MDN — Performance.memory (non-standard, Chrome-only) (https://developer.mozilla.org/en-US/docs/Web/API/Performance/memory)
- Chrome DevTools — Fix memory problems / heap snapshots / allocation timeline (https://developer.chrome.com/docs/devtools/memory-problems)
- Redux Toolkit — createSelector (https://redux-toolkit.js.org/api/createSelector)
- Playwright — waitForLoadState (https://playwright.dev/docs/api/class-page)

## Issues Found
- **`useAbortController` hook did not actually abort the in-flight request (real bug).** The hook returned `abortControllerRef.current` (the initial controller, "A") during render, but its `useEffect` created a *brand new* `AbortController` ("B"), reassigned the ref to it, and aborted only B on cleanup. Because effect/ref reads during render capture A, the consuming component's `fetch(url, { signal: abortController.signal })` uses A.signal, while cleanup aborts B — so the request was never cancelled, defeating the hook's purpose (and also causing a spurious dependency change on re-render since `abortController.signal` would differ on the second render). Fixed by aborting the same controller that was returned to consumers (reading `abortControllerRef.current` inside the effect instead of constructing a new controller). This is the minimal correct fix and keeps the hook's API unchanged.

## Review Notes
- **React 18 removed the "Can't perform a React state update on an unmounted component" warning** referenced in the Section 12 summary table. The post otherwise targets modern React (uses `createRoot` from `react-dom/client`), so that specific console warning will not appear on React 18+. The `isMounted`/`useSafeState`/`AbortController` patterns are still valid for cancelling genuinely leaky work (timers, subscriptions, sockets, observers); the leak rationale is just weaker for plain `setState`-after-unmount on React 18+. Left as-is since it is contextual framing rather than incorrect code.
- **`performance.memory` is a non-standard, Chrome-only API** and is not implemented in jsdom or Node. In the Jest example it will be `undefined`, making `finalMemory - initialMemory` evaluate to `NaN` (and `expect(NaN).toBeLessThan(...)` fails). The post hedges with optional chaining and "if available", and these examples are explicitly illustrative, so they were left unchanged — but readers should treat the Jest/Playwright memory thresholds as starting points that require a real Chromium runtime (and `--expose-gc` for `global.gc`).
- **GitHub Actions versions** use `actions/checkout@v3` and `actions/setup-node@v3`; v4 is current. v3 still functions, so this was not changed (not an error, just slightly behind latest).
- `Countdown` fix calls `clearInterval` inside the `setRemaining` updater; this works but performs a side effect inside a state updater (runs twice under StrictMode). Harmless here. Not changed.
- `createSelector` from `@reduxjs/toolkit`, the `useEventListener`/`useInterval` "latest-ref" patterns, the IntersectionObserver cleanup, and all Chrome DevTools / Performance tab descriptions were verified and are accurate.
