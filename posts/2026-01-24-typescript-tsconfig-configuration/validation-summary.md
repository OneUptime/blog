# Validation Summary: How to Configure tsconfig.json Properly

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- TypeScript
- TSConfig / tsconfig.json
- TypeScript compiler options
- TypeScript module resolution
- Node.js CommonJS and ESM
- React with bundlers
- Monorepo project references

## Sources Consulted
- TypeScript TSConfig Reference: https://www.typescriptlang.org/tsconfig/
- TypeScript TSConfig `target`: https://www.typescriptlang.org/tsconfig/target.html
- TypeScript TSConfig `module`: https://www.typescriptlang.org/tsconfig/module.html
- TypeScript TSConfig `moduleResolution`: https://www.typescriptlang.org/tsconfig/moduleResolution.html
- TypeScript TSConfig `strict`: https://www.typescriptlang.org/tsconfig/strict.html
- TypeScript TSConfig `isolatedModules`: https://www.typescriptlang.org/tsconfig/isolatedModules.html
- TypeScript CLI Options: https://www.typescriptlang.org/docs/handbook/compiler-options.html
- TypeScript 5.0 Release Notes for `moduleResolution: bundler` and `allowImportingTsExtensions`: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html
- Local TypeScript compiler help output from TypeScript 5.9.3: `npx tsc --help --all`

## Issues Found
- The strict options example omitted `strictBuiltinIteratorReturn`, which is part of the current strict-mode family in TypeScript 5.9. Added it to keep the list current.
- The browser-without-bundler snippet incorrectly recommended `moduleResolution: "bundler"`. Updated it to use `module: "nodenext"`, `moduleResolution: "nodenext"`, and `noEmit: true` for native ESM import checking rather than bundler-style resolution.
- The `target` explanation implied TypeScript polyfills JavaScript features. Corrected it to say `target` controls downleveling versus leaving syntax intact and does not add runtime polyfills.
- The `isolatedModules` explanation stated it is required for non-tsc transpilers. Corrected this to say it should be enabled for single-file transpilers.
- The `isolatedModules` example claimed ordinary `const enum` declarations cannot be used. In current TypeScript, the documented error is referencing ambient `const enum` members, so the example was corrected.

## Review Notes
The guide is generally accurate for modern TypeScript. Several examples use JSON-with-comments syntax, which is accepted by tsconfig files even though the fenced blocks are labeled `json`; using `jsonc` fences would be clearer in a future editorial pass.
