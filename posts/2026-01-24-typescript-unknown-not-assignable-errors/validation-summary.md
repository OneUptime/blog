# Validation Summary: How to Fix 'Type 'unknown' Is Not Assignable' Errors

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- TypeScript
- JavaScript JSON parsing
- Fetch API
- Web Storage / localStorage
- Zod runtime validation

## Sources Consulted
- TypeScript 3.0 release notes, `unknown` type: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-0.html
- TypeScript 4.4 release notes, `useUnknownInCatchVariables`: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-4.html
- TypeScript TSConfig reference, `useUnknownInCatchVariables`: https://www.typescriptlang.org/tsconfig/useUnknownInCatchVariables.html
- TypeScript Handbook, narrowing, type predicates, and assertion functions: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- Local installed TypeScript 5.9.3 standard library declarations, including `JSON.parse` and `Response.json()` return types
- MDN `JSON.parse()`: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse
- MDN `Response.json()`: https://developer.mozilla.org/en-US/docs/Web/API/Response/json
- MDN `Storage.getItem()`: https://developer.mozilla.org/en-US/docs/Web/API/Storage/getItem
- MDN `Storage.setItem()`: https://developer.mozilla.org/en-US/docs/Web/API/Storage/setItem
- Zod documentation, parse and safeParse: https://zod.dev/

## Issues Found
- The post said parsing JSON returns `unknown` in strict TypeScript configurations. I changed this to explain that TypeScript's standard library types `JSON.parse` as returning `any`, even in strict mode, and that returning `unknown` from a wrapper is the safer pattern.
- The post said TypeScript 4.4+ caught errors are typed as `unknown` by default. I clarified that this happens when `useUnknownInCatchVariables` is enabled, including under `strict` mode.
- The post said local storage returns strings. I changed this to strings or `null`, matching the Web Storage API.

## Review Notes
The remaining examples use current TypeScript narrowing patterns: `typeof`, `in`, `instanceof`, user-defined type predicates, assertion functions, discriminated unions, and runtime validation with Zod. The examples intentionally annotate `response.json()` and parsed JSON values as `unknown`; this is a defensive application-level choice, since the current DOM and ECMAScript TypeScript declarations still return `any` for those APIs.
