# Validation Summary: How to Handle Type Narrowing in TypeScript

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- TypeScript
- Type narrowing
- Type guards
- Control flow analysis
- Union types
- Discriminated unions

## Sources Consulted
- TypeScript Handbook: Narrowing - https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- TypeScript 5.4 Release Notes: Preserved Narrowing in Closures Following Last Assignments - https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-4.html
- Local TypeScript compiler check with TypeScript 5.9.3 (`npx tsc --strict --skipLibCheck --target ES2022 --lib ES2022,DOM --noEmit`)

## Issues Found
- The callback section said narrowing does not persist across callbacks and explained that TypeScript could not guarantee a captured parameter was still a string. Current TypeScript preserves narrowing into closures in common cases where the variable is captured and not reassigned, with additional last-assignment support added in TypeScript 5.4. Updated the wording to say narrowing may not persist when a variable can be reassigned, and corrected the code comments.
- The accidental type widening section said `processedItems` was still `string[] | null` after it was reassigned from a narrowed `items.map(...)` result. TypeScript narrows the variable after that assignment; the actual issue is that the alias starts with the original union type until it is reassigned or checked. Updated the comments to reflect that behavior.

## Review Notes
The rest of the post's examples and explanations align with the TypeScript Handbook's documented narrowing behavior for `typeof`, `instanceof`, `in`, truthiness, equality checks, user-defined type predicates, assertion functions, discriminated unions, exhaustiveness with `never`, control-flow analysis, and assignment narrowing.
