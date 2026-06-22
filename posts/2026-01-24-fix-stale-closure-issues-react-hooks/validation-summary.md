# Validation Summary: How to Fix 'Stale Closure' Issues in React Hooks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- React
- React Hooks
- JavaScript closures
- TypeScript / TSX
- ESLint React Hooks exhaustive-deps rule

## Sources Consulted
- React useEffect API reference: https://react.dev/reference/react/useEffect
- React useState API reference: https://react.dev/reference/react/useState
- React useRef API reference: https://react.dev/reference/react/useRef
- React useCallback API reference: https://react.dev/reference/react/useCallback
- React exhaustive-deps lint reference: https://react.dev/reference/eslint-plugin-react-hooks/lints/exhaustive-deps
- React 19 Upgrade Guide: https://react.dev/blog/2024/04/25/react-19-upgrade-guide

## Issues Found
- The React examples contained JSX but used `typescript` code fences. Changed those fences to `tsx` so the examples are accurately labeled for TypeScript with JSX.
- The custom `useLatest` hook returned `React.MutableRefObject<T>`, but React 19 deprecates the mutable ref type in favor of `RefObject`. Changed the return type to `React.RefObject<T>`.
- The `ComponentWithCustomHook` interval effect referenced `latestCount` but used an empty dependency array. Added `[latestCount]` to align the example with React's exhaustive-deps guidance. The returned ref object remains stable across renders, so this does not change the intended runtime behavior.

## Review Notes
The post's main guidance is technically correct: missing dependencies can cause stale closures, functional state updates are appropriate when deriving new state from previous state, and refs can hold mutable values across renders without triggering re-renders. For React 19.2 and later, `useEffectEvent` is also an official option for reading latest props or state from an Effect without making that code reactive, but the post's ref-based pattern remains a common valid approach.
