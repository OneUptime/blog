# Validation Summary: How to Fix 'SyntaxError: Cannot use import statement'

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Node.js
- JavaScript ES modules
- CommonJS modules
- TypeScript
- ts-node
- Express

## Sources Consulted
- Node.js ECMAScript modules documentation: https://nodejs.org/api/esm.html
- Node.js packages and module type documentation: https://nodejs.org/api/packages.html
- Node.js CLI help for `--watch`
- TypeScript TSConfig reference: https://www.typescriptlang.org/tsconfig/
- ts-node CommonJS vs native ECMAScript modules documentation: https://typestrong.org/ts-node/docs/imports/

## Issues Found
- The introduction and module-system table implied that current Node.js always defaults ambiguous `.js` files to CommonJS. Updated the wording to account for current Node.js syntax detection, where ambiguous `.js` files containing ES module syntax can be reparsed as ES modules with a warning.
- The TypeScript setup installed `@types/node` but the sample imports `Request` and `Response` from Express. Added `@types/express` to the install command so the strict TypeScript example compiles with Express 4.
- The JSON import example used import assertions (`assert { type: 'json' }`), which are no longer the current Node.js syntax. Updated it to import attributes (`with { type: 'json' }`) and corrected the version note.
- The checklist said stable ESM support requires Node 14.0.0 or higher. Updated this to Node 12.22.0+ / 14.17.0+ to match Node.js documentation.
- The checklist mentioned `--experimental-modules` for older Node. Reworded this to focus on tool-specific ESM settings, since current supported Node.js versions no longer require that flag.

## Review Notes
The examples use package specifiers such as `express` and `lodash`, which do not require file extensions. The local relative import example correctly includes `.js`, which Node.js ESM requires for relative or absolute file specifiers. The `node --watch` script is valid in current Node.js.
