# Validation Summary: How to Fix 'useEffect Dependencies' Warnings

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- React
- React Hooks: useEffect, useCallback, useRef, useLayoutEffect
- eslint-plugin-react-hooks exhaustive-deps rule
- TypeScript
- JavaScript timers
- AbortController
- JSON.stringify and JSON.parse

## Sources Consulted
- React exhaustive-deps lint documentation: https://react.dev/reference/eslint-plugin-react-hooks/lints/exhaustive-deps
- React useEffect reference: https://react.dev/reference/react/useEffect
- React Removing Effect Dependencies guide: https://react.dev/learn/removing-effect-dependencies
- React Synchronizing with Effects guide: https://react.dev/learn/synchronizing-with-effects
- React useCallback reference: https://react.dev/reference/react/useCallback
- React useState reference: https://react.dev/reference/react/useState
- React useLayoutEffect reference: https://react.dev/reference/react/useLayoutEffect
- MDN AbortController documentation: https://developer.mozilla.org/en-US/docs/Web/API/AbortController
- MDN JSON.stringify documentation: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify

## Issues Found
- The object dependency example stated that the effect runs every render because `options` is a new object. Since `options` is a prop, that only happens when the parent passes a new object reference. Updated the wording to say the effect runs whenever the object reference changes.
- The JSON.stringify example and decision tree presented stringification broadly for complex objects. Updated the wording to limit this pattern to JSON-serializable values.
- The section titled "Use useCallback for Handlers" used a functional state update rather than `useCallback`. Updated the heading and introductory comment to match the code.
- The `useEvent` example said there were "no re-runs" even though the effect still re-runs when `query` changes. Updated the comment to say it re-runs when `query` changes.
- The debounced effect hook used `NodeJS.Timeout`, which is not portable in browser-only TypeScript projects. Changed it to `ReturnType<typeof setTimeout>`.
- The debounced effect hook could call a stored cleanup more than once because `cleanupRef.current` was not cleared after invocation. Updated the cleanup handling to reset the ref after calling it and to store `null` when the effect returns no cleanup.

## Review Notes
The post is technically relevant and accurate after the fixes. The custom `useEvent` pattern is still an escape-hatch style pattern; React's official docs now also document Effect Events for separating reactive and non-reactive effect logic, but the existing custom hook remains a valid pattern for the article's scope.
