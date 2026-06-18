# Validation Summary: How to Fix 'Type 'X' Is Not Assignable to Type 'Y'' Errors

## Status
validated

## Post Type
Tutorial / debugging guide

## Technologies Covered
- TypeScript
- JavaScript
- TypeScript compiler configuration
- Type narrowing, generics, utility types, nullability, literal types, tuples, and function type compatibility

## Sources Consulted
- TypeScript Handbook: Narrowing - https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- TypeScript Handbook: Generics - https://www.typescriptlang.org/docs/handbook/2/generics.html
- TypeScript Handbook: Everyday Types - https://www.typescriptlang.org/docs/handbook/2/everyday-types.html
- TypeScript Handbook: Utility Types - https://www.typescriptlang.org/docs/handbook/utility-types.html
- TypeScript Handbook: Type Compatibility - https://www.typescriptlang.org/docs/handbook/type-compatibility.html
- TypeScript 3.4 Release Notes: const assertions - https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-4.html
- TSConfig Reference: strict - https://www.typescriptlang.org/tsconfig/strict.html
- TSConfig Reference: strictNullChecks - https://www.typescriptlang.org/tsconfig/strictNullChecks.html
- MDN Web Docs: JSON.parse() - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse

## Issues Found
- The generic constraint example labeled the error as "Type 'T' is not assignable to type 'string'"; TypeScript reports that property `length` does not exist on unconstrained type `T`. Updated the comment to match the actual compiler error.
- The function parameter contravariance example marked assigning an `(animal: Animal) => void` function to `(dog: Dog) => void` as an error. Under strict function type checking, that assignment is safe because the handler accepts the broader type. Replaced it with the unsafe reverse assignment, `(dog: Dog) => void` assigned to `(animal: Animal) => void`.
- The `JSON.parse` example claimed that accessing `data.id` errors because `data` is `unknown`, but `JSON.parse` is typed as returning `any` in TypeScript's standard library. Added an explicit `unknown` annotation so the example demonstrates the stated safe-validation pattern.

## Review Notes
The examples are illustrative and include intentional errors followed by corrected alternatives. The corrected technical content was spot-checked with TypeScript 5.9.3 using strict compiler options.
