# Validation Summary: How to Fix 'Invalid Hook Call' Errors in React

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- React Hooks
- React DOM
- JavaScript
- TypeScript
- npm
- Yarn
- ESLint
- eslint-plugin-react-hooks

## Sources Consulted
- React official documentation: Invalid Hook Call warning and Rules of Hooks, https://react.dev/warnings/invalid-hook-call-warning
- React official documentation: Rules of Hooks reference, https://react.dev/reference/rules/rules-of-hooks
- React official documentation: Reusing Logic with Custom Hooks, https://react.dev/learn/reusing-logic-with-custom-hooks
- npm official documentation: npm ls command, https://docs.npmjs.com/cli/v11/commands/npm-ls/
- npm official documentation: package.json overrides, https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#overrides
- Yarn Classic official documentation: Selective dependency resolutions, https://classic.yarnpkg.com/lang/en/docs/selective-version-resolutions/
- eslint-plugin-react-hooks package documentation, https://www.npmjs.com/package/eslint-plugin-react-hooks

## Issues Found
- The package.json and .eslintrc.json snippets used `//` comments inside `json` code blocks. Since package.json and .eslintrc.json must be valid JSON, I removed the inline comments and kept the context in the surrounding headings.
- The npm `overrides` example pinned `react` and `react-dom` to exact versions while declaring direct dependencies with caret ranges. npm rejects overrides for direct dependencies unless the override spec matches the direct dependency spec, so I changed the direct dependency examples to exact versions that match the overrides.
- The post said custom hooks must start with `use` to be recognized by React. React's naming convention is important for Hooks semantics and lint tooling, but the phrasing implied runtime tracking by React. I updated the text and comments to refer to React Hooks linting/tooling enforcement.
- The post stated React and ReactDOM "must be the same version." React's invalid-hook warning specifically calls out mismatching or unsupported renderer versions, so I adjusted the wording to say React and ReactDOM should use compatible versions and that exact matching is the safest default.

## Review Notes
The hook placement examples, duplicate React diagnosis with `npm ls react`, version checks with `npm ls react react-dom`, Yarn `resolutions`, npm `overrides`, and eslint-plugin-react-hooks configuration are consistent with the consulted official documentation after the fixes above.
