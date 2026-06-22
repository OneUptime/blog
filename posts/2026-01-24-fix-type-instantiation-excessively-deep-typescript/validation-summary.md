# Validation Summary: How to Fix 'Type Instantiation Is Excessively Deep' Errors

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- TypeScript
- Type-level programming
- Conditional types
- Mapped types
- Recursive type aliases

## Sources Consulted
- TypeScript Handbook: Conditional Types - https://www.typescriptlang.org/docs/handbook/2/conditional-types.html
- TypeScript Handbook: Mapped Types - https://www.typescriptlang.org/docs/handbook/2/mapped-types.html
- TypeScript 3.7 Release Notes: Recursive Type Aliases - https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html
- TypeScript 5.9.3 compiler source: checker.ts - https://github.com/microsoft/TypeScript/blob/v5.9.3/src/compiler/checker.ts
- Local compiler verification with TypeScript 5.9.3 (`npx tsc --version`)

## Issues Found
- The post stated that TypeScript has a fixed 50-level type instantiation recursion limit. Current TypeScript uses internal compiler guards, and TypeScript 5.9.3 no longer matches that specific 50-level statement. Updated the text and diagram to describe compiler limits without depending on an outdated number.
- The `InfiniteNested<T>` example claimed a shallow indexed access would error, but it type-checks in TypeScript 5.9.3. Replaced the usage with an unbounded recursive conditional traversal that does produce TS2589.
- The heading "Use Intersection Types for Termination" was inaccurate because the example tracks seen types with a union, not intersection types. Renamed the heading to match the code.
- The `Subtract<N, M>` helper ignored its `M` parameter and only implemented a one-step previous-depth lookup. Replaced it with a `Prev` tuple helper to match the actual behavior.
- The description of simplifying conditionals said to use union types, but the example uses a recursive helper with a depth limit. Updated the description to match the code.
- The type-alias section overstated TypeScript caching behavior by saying named aliases are computed once and cached. Reworded it to the safer, accurate claim that named aliases reduce repeated type expressions and provide reusable named instantiations.
- The JSON example described the recursive `JsonValue` alias itself as causing infinite instantiation. Recursive JSON aliases are valid in modern TypeScript; the problematic part is applying an unbounded recursive transformation. Updated the comments accordingly.

## Review Notes
The examples were semantically checked with TypeScript 5.9.3 after disabling unrelated ambient type packages. Several examples are intentionally illustrative and omit real project types such as `ComplexType`, `MyType`, and `RecursivePartA`, which is acceptable for a guide but means they are not complete standalone programs without those placeholders.
