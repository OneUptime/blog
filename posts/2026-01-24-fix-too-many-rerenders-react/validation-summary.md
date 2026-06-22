# Validation Summary: How to Fix 'Too Many Re-Renders' Errors in React

## Status
validated

## Post Type
Tutorial / debugging guide

## Technologies Covered
- React
- JavaScript
- React Hooks: useState, useEffect, useMemo, useCallback, useRef
- React DevTools
- React Profiler
- eslint-plugin-react-hooks

## Sources Consulted
- React useState troubleshooting: https://react.dev/reference/react/useState
- React eslint-plugin-react-hooks set-state-in-render lint: https://react.dev/reference/eslint-plugin-react-hooks/lints/set-state-in-render
- React useEffect reference and dependency behavior: https://react.dev/reference/react/useEffect
- React Removing Effect Dependencies guide: https://react.dev/learn/removing-effect-dependencies
- React Lifecycle of Reactive Effects guide: https://react.dev/learn/lifecycle-of-reactive-effects
- React exhaustive-deps lint documentation: https://react.dev/reference/eslint-plugin-react-hooks/lints/exhaustive-deps
- React useMemo reference: https://react.dev/reference/react/useMemo
- React useCallback reference: https://react.dev/reference/react/useCallback
- React Profiler reference: https://react.dev/reference/react/Profiler
- React preserving and resetting state with keys: https://react.dev/learn/preserving-and-resetting-state
- React StrictMode reference: https://react.dev/reference/react/StrictMode
- React Developer Tools guide: https://react.dev/learn/react-developer-tools

## Issues Found
- The inline event handler example incorrectly labeled `onClick={() => setSelected(todo.id)}` as a cause of "too many re-renders." Inline event handlers are valid React. I changed the section to show the actual problematic pattern: a newly-created function used as an Effect dependency while the Effect updates state.
- The keyed reset example passed `initialValue` to `SyncedInput`, but the component reads `externalValue`. I changed the prop to `externalValue={externalValue}` so the example works as shown.
- The Profiler callback included the obsolete `interactions` parameter and described `phase` as only `"mount"` or `"update"`. I removed `interactions` and added `"nested-update"` to match the current React Profiler reference.
- The post and checklist said or implied that any render-time state update is invalid. React's lint and docs specifically warn against unconditional state updates during render, while guarded render-time updates are a rare supported pattern. I changed the wording to focus on unconditional render-time updates.
- The guidance said to use `useCallback` for functions passed as props or dependencies. I narrowed this to cases where stable identity matters, matching React's guidance that memoization should be used for specific dependency or memoization needs.

## Review Notes
The post is technically relevant and broadly accurate after the corrections. Some examples remain simplified for teaching purposes, such as fetch handling without cancellation or error handling, but those omissions do not make the guidance technically incorrect for the topic.
