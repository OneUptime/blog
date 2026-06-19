# Validation Summary: How to Fix 'Type 'never' Has No Properties' Errors

## Status
validated

## Post Type
Tutorial / debugging guide

## Technologies Covered
- TypeScript
- TypeScript `never` type
- Type narrowing and type guards
- Discriminated unions and exhaustive checks
- Conditional types, intersection types, and utility types

## Sources Consulted
- TypeScript Handbook: Narrowing - https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- TypeScript 2.0 release notes: `never`, control-flow analysis, and discriminated unions - https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-0.html
- TypeScript Handbook: Unions and Intersection Types - https://www.typescriptlang.org/docs/handbook/unions-and-intersections.html
- TypeScript Handbook: Conditional Types - https://www.typescriptlang.org/docs/handbook/2/conditional-types.html
- TypeScript Handbook: Utility Types (`NonNullable`) - https://www.typescriptlang.org/docs/handbook/utility-types.html
- GitHub author profile link - https://github.com/nawazdhandala
- Local compiler verification with TypeScript 5.9.3 (`npx tsc --strict --noEmit`)

## Issues Found
- The incorrect type guard example claimed that a `pet is Cat` predicate's false branch might become `never`. In TypeScript, the false branch of that predicate correctly narrows `Pet` to `Dog`, even if the runtime implementation is wrong. I changed the example to a guard that incorrectly asserts the whole `Pet` union, making the false branch `never`, and updated the related Mermaid diagram.
- The empty array example said `emptyArray[0]` on a `[]` tuple is type `never`. TypeScript reports an out-of-bounds tuple access for that expression before the property-access example. I changed the example to use the tuple element type `(typeof emptyArray)[number]`, which is `never`, so the illustrated property-access error is accurate.

## Review Notes
- The remaining examples and explanations align with TypeScript's documented behavior for `never`, control-flow narrowing, user-defined type predicates, exhaustive switch checking, conditional types, incompatible intersections, and `NonNullable`.
- The array length example is accurate under default strict checking. Projects using `noUncheckedIndexedAccess` may still see `undefined` in some indexed access patterns and should account for that separately.
