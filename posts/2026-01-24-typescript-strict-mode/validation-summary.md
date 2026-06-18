# Validation Summary: How to Configure TypeScript Strict Mode

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- TypeScript
- TSConfig compiler options
- TypeScript strict mode

## Sources Consulted
- TypeScript TSConfig `strict`: https://www.typescriptlang.org/tsconfig/strict.html
- TypeScript TSConfig `strictNullChecks`: https://www.typescriptlang.org/tsconfig/strictNullChecks.html
- TypeScript TSConfig `noImplicitAny`: https://www.typescriptlang.org/tsconfig/noImplicitAny.html
- TypeScript TSConfig `strictFunctionTypes`: https://www.typescriptlang.org/tsconfig/strictFunctionTypes.html
- TypeScript TSConfig `strictBindCallApply`: https://www.typescriptlang.org/tsconfig/strictBindCallApply.html
- TypeScript TSConfig `strictPropertyInitialization`: https://www.typescriptlang.org/tsconfig/strictPropertyInitialization.html
- TypeScript TSConfig `noImplicitThis`: https://www.typescriptlang.org/tsconfig/noImplicitThis.html
- TypeScript TSConfig `useUnknownInCatchVariables`: https://www.typescriptlang.org/tsconfig/useUnknownInCatchVariables.html
- TypeScript TSConfig `strictBuiltinIteratorReturn`: https://www.typescriptlang.org/tsconfig/strictBuiltinIteratorReturn.html
- TypeScript TSConfig `moduleResolution`: https://www.typescriptlang.org/tsconfig/moduleResolution.html
- TypeScript TSConfig `noUncheckedIndexedAccess`: https://www.typescriptlang.org/tsconfig/noUncheckedIndexedAccess.html
- TypeScript TSConfig `noImplicitOverride`: https://www.typescriptlang.org/tsconfig/noImplicitOverride.html
- Local TypeScript compiler check with `npx tsc --version` and `npx tsc --all` using TypeScript 5.9.3.

## Issues Found
- The post stated that it covered all strict mode options but omitted `strictBuiltinIteratorReturn`, which is enabled by `strict` in current TypeScript. Added it to the strict mode diagrams and incremental adoption configuration, and changed the introduction to say the guide covers the main strict mode options.
- The `strictFunctionTypes` example declared `interface MouseEvent`, which collides with the DOM `MouseEvent` type from TypeScript's default libraries. Renamed it to `CustomMouseEvent`.
- The same `strictFunctionTypes` example claimed a runtime error while only logging missing numeric properties, which would print `undefined` rather than throw. Updated the handler to call `toFixed()` so the unsafe assignment can actually produce the described runtime error.
- The `noImplicitThis` unsafe example used an object method where `this` is contextually typed in current TypeScript, so it did not demonstrate `noImplicitThis`. Replaced it with a nested function example that triggers the documented implicit-`any` `this` diagnostic.
- The `tsconfig.json` snippets used comments while fenced as `json`. Changed those fences to `jsonc`, matching the JSON-with-comments syntax TypeScript accepts for TSConfig files.

## Review Notes
TypeScript's `strict` flag can include additional checks in future versions, so lists of strict-family options should be treated as version-sensitive. The post is accurate after the corrections above for current TypeScript behavior.
