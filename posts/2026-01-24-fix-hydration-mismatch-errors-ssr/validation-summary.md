# Validation Summary: How to Fix 'Hydration Mismatch' Errors in SSR

## Status
validated

## Post Type
Guide

## Technologies Covered
- React
- React DOM hydration
- React Hooks
- Next.js
- Server-side rendering
- TypeScript/TSX

## Sources Consulted
- React hydrateRoot documentation: https://react.dev/reference/react-dom/client/hydrateRoot
- React useId documentation: https://react.dev/reference/react/useId
- React Rules of Hooks documentation: https://react.dev/reference/rules/rules-of-hooks
- React Components and Hooks purity rules: https://react.dev/reference/rules/components-and-hooks-must-be-pure
- Next.js hydration error documentation: https://nextjs.org/docs/messages/react-hydration-error

## Issues Found
- The random value example called `useId()` at module scope. React Hooks must be called from React function components or custom Hooks, so the example was changed to show `useId()` inside `GoodComponent`.
- The date/time example called `useState()` and `useEffect()` at module scope. These Hooks were moved into `GoodComponent`, and the example now returns a `<time>` element.
- Code blocks containing JSX were marked as `typescript`. They were changed to `tsx` so the examples match their actual syntax.
- The `ClientOnly` example imported `ReactNode` as a runtime import. It was changed to `import type { ReactNode } from 'react';`, which is safer for TypeScript projects using type-only import enforcement.

## Review Notes
The main guidance is consistent with current React and Next.js documentation: server and initial client output should match; browser-only APIs, time-dependent values, and random values in render logic can cause hydration mismatches; and `useEffect` can be used to render client-only differences after hydration. Future improvements could mention other documented causes, such as invalid HTML nesting, CSS-in-JS SSR configuration, CDN/extension HTML mutation, or `dynamic(..., { ssr: false })` for Next.js-specific client-only components.
