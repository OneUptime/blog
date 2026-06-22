# Validation Summary: How to Set Up Strict TypeScript Configuration for React Projects

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- React
- TypeScript
- TSConfig compiler options
- Vite
- Create React App
- Next.js
- ESLint
- typescript-eslint

## Sources Consulted
- TypeScript TSConfig Reference: https://www.typescriptlang.org/tsconfig/
- TypeScript `moduleResolution` Reference: https://www.typescriptlang.org/tsconfig/moduleResolution.html
- TypeScript JSX Handbook: https://www.typescriptlang.org/docs/handbook/jsx.html
- React TypeScript Documentation: https://react.dev/learn/typescript
- React "Sunsetting Create React App" announcement: https://react.dev/blog/2025/02/14/sunsetting-create-react-app
- React "Build a React app from Scratch" documentation: https://react.dev/learn/build-a-react-app-from-scratch
- Vite Getting Started Guide: https://vite.dev/guide/
- Next.js `create-next-app` CLI Reference: https://nextjs.org/docs/app/api-reference/cli/create-next-app
- typescript-eslint Typed Linting Guide: https://typescript-eslint.io/getting-started/typed-linting/
- typescript-eslint Shared Configs Reference: https://typescript-eslint.io/users/configs/
- ESLint Configuration Migration Guide: https://eslint.org/docs/latest/use/configure/migration-guide

## Issues Found
- The Create React App command was presented as a current new-project option. React officially deprecated Create React App for new apps in February 2025, so the command comment was updated to state that CRA is deprecated for new apps and that Vite or a React framework should be preferred.
- The `strictFunctionTypes` example had function parameter variance reversed. Assigning an `(event: Event) => void` callback to a `(event: MouseEvent) => void` slot is safe; the unsafe case is assigning a narrower `(event: MouseEvent) => void` callback where a broader `(event: Event) => void` handler is required. The example and error comment were corrected.
- The base `tsconfig.json` enabled `noEmit` while also showing `declaration`, `declarationMap`, and `sourceMap` as emit options. With `noEmit`, TypeScript does not write output files, so the base config was changed to a type-checking-only block.
- The summary table described `sourceMap` as recommended even though the guide recommends `noEmit` for bundler-based React apps. The table now marks `sourceMap` as optional and clarifies that it applies when TypeScript emits JavaScript.
- The ESLint example used the outdated `plugin:@typescript-eslint/recommended-requiring-type-checking` preset name. It was updated to the current documented `plugin:@typescript-eslint/recommended-type-checked` preset.

## Review Notes
- The `.eslintrc.json` example is a legacy ESLint configuration style. ESLint v9 uses flat config by default, but typescript-eslint still documents legacy config examples, so the snippet remains technically usable.
- Several React examples are illustrative snippets and assume imports such as `useState`, `useEffect`, `useRef`, `useCallback`, `createContext`, and `useContext` are present in surrounding code.
