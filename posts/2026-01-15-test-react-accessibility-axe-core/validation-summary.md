# Validation Summary: How to Test React Applications for Accessibility with axe-core

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- React
- TypeScript
- Jest
- jest-axe
- axe-core
- React Testing Library
- Testing Library jest-dom
- JSDOM
- WAI-ARIA patterns
- GitHub Actions
- npm scripts

## Sources Consulted
- jest-axe README: https://github.com/NickColley/jest-axe
- axe-core README: https://github.com/dequelabs/axe-core
- axe-core API documentation: https://github.com/dequelabs/axe-core/blob/develop/doc/API.md
- Deque axe API documentation: https://www.deque.com/axe/core-documentation/api-documentation/
- Jest CLI options: https://jestjs.io/docs/cli
- Jest 30 upgrade guide: https://jestjs.io/docs/upgrading-to-jest30
- WAI-ARIA APG Modal Dialog Pattern: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
- WAI-ARIA APG Disclosure Navigation Example: https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/
- WAI-ARIA APG Listbox Pattern: https://www.w3.org/WAI/ARIA/apg/patterns/listbox/
- npm package metadata for jest-axe and @types/jest-axe

## Issues Found
- The install command omitted packages used by later snippets (`jest`, `jest-environment-jsdom`, `babel-jest`, and `identity-obj-proxy`). Added them to keep the setup command consistent with the Jest configuration shown.
- The modal overlay used `aria-hidden="true"` while containing the dialog. This hides the dialog subtree from assistive technologies. Removed the attribute.
- The navigation example used ARIA menu roles for ordinary site navigation and had incomplete menubar semantics. Replaced the ARIA menu roles with native navigation/list/link markup and a disclosure button pattern.
- The "Running Specific Rules" example enabled a few rules but did not disable other rules. Replaced it with axe-core `runOnly` configuration.
- The "Excluding Elements" example passed `exclude` as an axe options object to `jest-axe`, but `exclude` is part of axe-core's context parameter and is not a valid `jest-axe` options shape. Reworked the example to scope analysis to the owned component subtree.
- The color contrast section claimed that `jest-axe` can validate color contrast in JSDOM. Updated it to state that `color-contrast` does not work in JSDOM and is turned off in jest-axe.
- The live region example imported unused React hooks and nested assertive `role="alert"` notifications inside a polite `role="status"` region. Removed the unused imports and inner alert roles.
- The npm scripts used the deprecated Jest 29 `--testPathPattern` flag. Updated them to Jest 30's `--testPathPatterns`.
- The dropdown example imported unused `userEvent`. Removed the import.
- The dropdown component called `scrollIntoView` unguarded, which can fail in JSDOM where that method is often unavailable. Guarded the method call with optional chaining.

## Review Notes
The post is technically relevant and useful after the corrections. Automated axe checks still cannot prove full accessibility; keyboard behavior, screen reader behavior, focus order, meaningful alternative text, and real browser color contrast should remain part of a broader manual and browser-based testing strategy.
