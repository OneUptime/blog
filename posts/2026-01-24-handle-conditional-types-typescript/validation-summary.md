# Validation Summary: How to Handle Conditional Types in TypeScript

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- TypeScript
- Conditional types
- Generic types
- Utility types
- Mapped types
- Template literal types

## Sources Consulted
- TypeScript Handbook: Conditional Types: https://www.typescriptlang.org/docs/handbook/2/conditional-types.html
- TypeScript Handbook: Utility Types: https://www.typescriptlang.org/docs/handbook/utility-types.html
- TypeScript Handbook: Mapped Types: https://www.typescriptlang.org/docs/handbook/2/mapped-types.html
- TypeScript 4.1 Release Notes: Key Remapping in Mapped Types and Template Literal Types: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-1.html
- Local TypeScript compiler check with TypeScript 5.9.3: `npx tsc --noEmit --strict --target ES2020 --lib ES2020,DOM`

## Issues Found
- The built-in utility type examples re-declared global TypeScript utility names such as `Extract`, `Exclude`, and `NonNullable`. This can produce duplicate identifier errors in normal TypeScript projects. Changed the section to describe the built-in utilities directly without re-declaring those global names.
- The `infer` examples re-declared global utility type names `ReturnType` and `Awaited`. Renamed the custom examples to `MyReturnType` and `PromiseValue` to avoid collisions, and clarified that `PromiseValue` extracts one promise layer rather than matching the full recursive behavior of the built-in `Awaited` utility.
- The conditional return type example used `Buffer`, which requires Node-specific ambient types and is not available in plain TypeScript DOM/ES environments. Changed the example return type to `Uint8Array`.
- The union filtering example declared `type Event`, which conflicts with the DOM `Event` type in common TypeScript configurations. Renamed it to `AppEvent` and updated the related references.
- The "Infer Position Matters" pitfall incorrectly claimed that a union of functions infers an intersection/`never` parameter type. Verified with the TypeScript compiler that the conditional type distributes over the union and produces `string | number`; updated the explanation and result.

## Review Notes
All TypeScript code fences were compiled independently under strict mode with modern ES and DOM libraries after the fixes. The article remains technically accurate as a practical introduction, though the recursive `DeepPartial`/`DeepRequired`/`DeepReadonly` examples are intentionally simple and do not special-case arrays, functions, maps, sets, or other built-in object types.
