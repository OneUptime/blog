# Validation Summary: How to Build Custom Hooks in React

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- React (hooks: useState, useEffect, useCallback, useMemo, useRef)
- JavaScript / TypeScript
- Browser APIs: `window.addEventListener`, `localStorage`, `storage` events, `setTimeout`
- `fetch` API for HTTP requests
- React Testing Library (`renderHook`, `act`, `waitFor`)
- Jest (test runner / mocking)

## Sources Consulted
- React docs — Reusing Logic with Custom Hooks: https://react.dev/learn/reusing-logic-with-custom-hooks
- React docs — Rules of Hooks: https://react.dev/reference/rules/rules-of-hooks
- React docs — `useState`, `useEffect`, `useCallback`, `useMemo`, `useRef` reference pages: https://react.dev/reference/react
- React Testing Library API — `renderHook`: https://testing-library.com/docs/react-testing-library/api/#renderhook
- React Testing Library v13 release notes (renderHook moved into `@testing-library/react` for React 18+): https://github.com/testing-library/react-testing-library/releases
- MDN — `Window: resize` event: https://developer.mozilla.org/en-US/docs/Web/API/Window/resize_event
- MDN — `ResizeObserver`: https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver
- MDN — `Window: storage` event: https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event
- MDN — `Window.localStorage`: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage

## Issues Found

1. **`useAsync` never reset `mountedRef` on unmount.** The hook initialized `mountedRef = useRef(true)` and gated state updates behind `mountedRef.current`, but there was no `useEffect` cleanup to flip it to `false`. Result: the "prevent updates after unmount" check was a no-op. Added a `useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, [])` and added `useEffect` to the import line.

2. **`useWindowSize` prose claimed it used a "resize observer".** The implementation listens to the `window` `resize` event, which is the standard DOM event API — not `ResizeObserver` (a distinct Web API for observing element size changes). Rewrote the sentence to accurately describe the resize event listener.

3. **`useWindowSize` prose claimed "It includes debouncing".** The code contains no debouncing — it updates state on every resize event. Rewrote the sentence to note that callers can compose the earlier `useDebounce` hook if they need throttled updates, so the prose matches the code.

4. **Testing section recommended the wrong package.** The prose said "The @testing-library/react-hooks package provides utilities for this", but the code imports from `@testing-library/react`. `@testing-library/react-hooks` was the standalone package used with React ≤ 17; for React 18+, `renderHook` is exported directly from `@testing-library/react` (the standalone package is unmaintained for React 18). Rewrote the sentence to explain both cases, keeping the existing import (which is correct for React 18+).

5. **Tests used `waitFor` without importing it.** The `useFetch` tests called `await waitFor(...)` but only imported `renderHook, act`. Added `waitFor` to the import from `@testing-library/react`.

## Review Notes

- The `useFetch` hook uses `JSON.stringify(options)` inside the `useEffect`/`useCallback` dependency arrays. This works for serializable options but will produce surprising results if `options` contains functions or non-serializable values (e.g., `AbortSignal`). Acceptable for an introductory example, but real-world code typically stabilizes the options object with `useMemo` or via the caller.
- `useFetch`'s `refetch` callback does not consult an `isMounted` flag and may call `setState` after the consumer unmounts. The inline `useEffect` does, so this is only an edge case when the user manually calls `refetch` near unmount.
- `useLocalStorage`'s `setValue` callback closes over `storedValue` and is in its own dependency list. The function-form caller (`setValue(prev => ...)`) gets the closure value, not necessarily the latest state. For most consumer code this is fine because React batches updates, but a strictly correct implementation would pull the latest value via `useRef` or pass the updater directly to `setStoredValue`. Not a bug, but worth knowing.
- `usePrevious` uses `useRef()` with no initial value. Under React 19's stricter `useRef` typings in TypeScript, you would need to pass `useRef<T | undefined>(undefined)` explicitly. The JavaScript version shown here is fine.
- The `useForm` `handleChange` reads `event.target` synchronously and is therefore safe with React 17+ (event pooling was removed). No fix needed; just noting it for readers maintaining older codebases.
- The mermaid diagrams render fine in standard markdown renderers that support mermaid.
