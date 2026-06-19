# Validation Summary: How to Fix 'Prop Type Validation' Errors in React

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- React
- PropTypes / prop-types
- JavaScript
- TypeScript
- ESLint
- React DevTools

## Sources Consulted
- React 19 Upgrade Guide: https://react.dev/blog/2024/04/25/react-19-upgrade-guide
- Legacy React PropTypes documentation: https://legacy.reactjs.org/docs/typechecking-with-proptypes.html
- prop-types README: https://github.com/facebook/prop-types/blob/main/README.md
- React Developer Tools documentation: https://react.dev/learn/react-developer-tools
- TypeScript Utility Types documentation: https://www.typescriptlang.org/docs/handbook/utility-types.html
- TypeScript Narrowing and discriminated unions documentation: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- React TypeScript Cheatsheet, component prop patterns: https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/patterns_by_usecase/
- eslint-plugin-react rule documentation for require-default-props: https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/require-default-props.md
- eslint-plugin-react rule documentation for prop-types: https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/prop-types.md
- eslint-plugin-react rule documentation for no-unused-prop-types: https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/no-unused-prop-types.md

## Issues Found
- The post presented function-component PropTypes as current React behavior. React 19 ignores `propTypes` checks on function components, so the post now scopes PropTypes guidance to legacy React projects / React 18 and earlier and recommends TypeScript or another type-checking solution for modern React.
- The post used `defaultProps` on function components. React 19 removed function-component `defaultProps`, so the examples now use ES default parameters.
- The PropTypes list omitted `PropTypes.bigint`, which is documented by the current `prop-types` package. Added it to the primitive examples.
- A TypeScript example imported unused React types (`FC`, `ComponentType`). Removed them to avoid failures in projects with unused-local checks.
- The custom input TypeScript example used `HTMLAttributes<HTMLInputElement>`, which omits input-specific props. Changed it to `InputHTMLAttributes<HTMLInputElement>`.
- The TypeScript utility type snippet referenced `User` fields that were not present in the nearby example. Added a local `User` interface containing the referenced fields.
- The generic list TypeScript example referenced `users` without defining it. Added a small typed example array.
- The discriminated union example destructured `disabled` in the link branch without using it. Removed the unused binding.

## Review Notes
PropTypes remain useful for older React applications, but the post should continue to treat TypeScript as the preferred path for new React projects. The ESLint snippets use legacy `.eslintrc` JSON style; this is still understandable, but future updates could mention ESLint flat config for projects standardized on ESLint 9+.
