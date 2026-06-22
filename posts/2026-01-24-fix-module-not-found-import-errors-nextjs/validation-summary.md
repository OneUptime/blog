# Validation Summary: How to Fix 'Module Not Found' Import Errors in Next.js

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Next.js
- React
- JavaScript ES modules
- TypeScript
- CSS Modules and global CSS
- Sass/SCSS
- npm
- ESLint
- VS Code settings

## Sources Consulted
- Next.js Installation docs: https://nextjs.org/docs/app/getting-started/installation
- Next.js CSS docs: https://nextjs.org/docs/app/getting-started/css
- Next.js Lazy Loading docs: https://nextjs.org/docs/app/guides/lazy-loading
- Next.js TypeScript docs: https://nextjs.org/docs/pages/api-reference/config/typescript
- TypeScript 5.3 release notes on import attributes: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-3.html
- TypeScript 5.7 release notes on JSON import attributes with NodeNext: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-7.html
- MDN JavaScript import attributes reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import/with

## Issues Found
- The plain CSS example implied that `import styles from './styles.css'` fails because of a missing extension. Updated it to clarify that plain CSS is not imported as a CSS Module object, and `.module.css` is the correct convention for CSS Modules.
- The barrel export example used `export { Button } from './Button'`, which only works if `Button` is a named export. Updated it to `export { default as Button } from './Button'` to match the surrounding default-export examples.
- The JSON import example used the older `assert { type: 'json' }` syntax. Updated it to the current import attributes syntax, `with { type: 'json' }`.
- The global CSS guidance only mentioned `pages/_app.js`. Clarified that this is the Pages Router rule and added the App Router root layout example.
- The package.json example used `next lint`, which is no longer the current recommended lint script in modern Next.js. Updated it to use the ESLint CLI and refreshed the dependency versions to current Next.js/React major versions while keeping TypeScript at Next.js's documented minimum or later.

## Review Notes
The guide is technically relevant and broadly accurate after the corrections. The module resolution diagram is simplified; it is useful for troubleshooting but should not be read as an exact resolver specification for every runtime, bundler, and package `exports` condition.
