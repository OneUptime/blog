# Validation Summary: How to Fix 'Maximum Update Depth' Errors in React

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- React
- JavaScript
- React Hooks
- React DevTools
- ESLint React Hooks plugin
- why-did-you-render

## Sources Consulted
- React docs, Components and Hooks must be pure: https://react.dev/reference/rules/components-and-hooks-must-be-pure
- React docs, Responding to Events: https://react.dev/learn/responding-to-events
- React docs, useEffect: https://react.dev/reference/react/useEffect
- React docs, useCallback: https://react.dev/reference/react/useCallback
- React docs, useMemo: https://react.dev/reference/react/useMemo
- React docs, eslint-plugin-react-hooks exhaustive-deps lint: https://react.dev/reference/eslint-plugin-react-hooks/lints/exhaustive-deps
- React docs, React Developer Tools: https://react.dev/learn/react-developer-tools
- React docs, Profiler API and DevTools profiler note: https://react.dev/reference/react/Profiler
- why-did-you-render project documentation: https://github.com/welldone-software/why-did-you-render

## Issues Found
- The section on calling `setState` directly during render implied it always produces the "Maximum update depth exceeded" error. In React function components, this pattern commonly surfaces as the related "Too many re-renders" error. Updated the wording to identify it as a render loop while preserving the article's debugging context.
- The parent-child synchronization example used primitive string state. Calling `setValue(value.toUpperCase())` does not necessarily create an infinite loop because React can bail out when the next primitive state value is unchanged. Changed the example to use object state so the child creates a new object on each effect run, accurately demonstrating a loop, and updated the fixed version accordingly.
- The complete dashboard example's refresh handler only set `loading` to `true`, so the fixed version did not actually refetch data after a refresh click. Added a `refreshKey` state value, included it in the effect dependencies, and made the refresh handler increment it.
- The complete example described a nested async state update as the issue. Nested async updates are not inherently incorrect; the real problem in that code was missing cancellation for stale or unmounted requests. Updated the comment to reflect that.
- The prevention section overstated `useCallback` as a general event-handler rule. React's docs frame `useCallback` as useful when a stable function identity is needed, such as memoized children or Hook dependencies. Updated the heading and comment to avoid recommending unnecessary memoization.
- The summary said to always use dependency arrays in `useEffect`. Effects can intentionally run after every render, but effects that read reactive values need correct dependency handling. Updated the recommendation to focus on correct dependencies for effects that read reactive values, especially effects that update state.

## Review Notes
The JSX examples are illustrative snippets and omit imports for React Hooks, which is common in blog posts but would need to be included in standalone files. The ESLint configuration uses the legacy `.eslintrc` JSON shape; current ESLint projects may use flat config instead, but the rule names and intent remain correct.
