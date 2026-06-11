# Validation Summary: How to Create Conditional Types in TypeScript

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- TypeScript
- Conditional types
- `infer`
- Distributive conditional types
- TypeScript utility types
- Mapped types with key remapping

## Sources Consulted
- TypeScript Handbook: Conditional Types - https://www.typescriptlang.org/docs/handbook/2/conditional-types.html
- TypeScript Handbook: Utility Types - https://www.typescriptlang.org/docs/handbook/utility-types.html
- TypeScript 2.8 Release Notes: Conditional Types - https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8.html
- TypeScript standard library definitions, `lib.es5.d.ts`, from the installed TypeScript 5.9.3 package and the official repository - https://github.com/microsoft/TypeScript/blob/main/src/lib/es5.d.ts

## Issues Found
- The post stated that several listed utility types were built with conditional types and showed `NonNullable<T>` as `T extends null | undefined ? never : T`. In current TypeScript 5.9.3 standard library definitions, `Exclude` and `Extract` are conditional type aliases, but `NonNullable<T>` is defined as `T & {}`. Updated the wording and code snippet to reflect the current definition.

## Review Notes
- All code examples were checked with `tsc --noEmit --strict` using TypeScript 5.9.3 and compiled successfully after accounting for snippet-local duplicate names by giving the non-distributive example a unique alias in the temporary test file.
- The duplicated `StrOrNumArray` alias appears in separate documentation snippets and is acceptable as presented, but the snippets would need unique aliases if copied into one file.
