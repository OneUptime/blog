# Validation Summary: How to Fix 'Argument of Type Not Assignable' Errors

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- TypeScript
- TypeScript type checking and assignability
- Type narrowing, type guards, and assertions
- Generics and generic constraints
- Readonly arrays and excess property checks

## Sources Consulted
- TypeScript Handbook: The Basics - https://www.typescriptlang.org/docs/handbook/2/basic-types.html
- TypeScript Handbook: Everyday Types - https://www.typescriptlang.org/docs/handbook/2/everyday-types.html
- TypeScript Handbook: Narrowing - https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- TypeScript Handbook: Object Types - https://www.typescriptlang.org/docs/handbook/2/objects.html
- TypeScript Handbook: More on Functions - https://www.typescriptlang.org/docs/handbook/2/functions.html
- TypeScript Handbook: Generics - https://www.typescriptlang.org/docs/handbook/2/generics.html
- TypeScript 5.9.3 compiler output via `npx tsc --strict --noEmit`

## Issues Found
- The nullability example initialized `maybeString` directly to `"hello"`, which modern TypeScript control-flow analysis narrows to `string` at that call site. Changed the initializer to a runtime conditional so the documented `string | null` error is accurate.
- The wider-union example initialized `extended` directly to `true`, so TypeScript reported `boolean` rather than demonstrating an uncertain wider union. Changed the initializer to a runtime conditional value of type `ExtendedValue`.
- The type compatibility diagram said primitive compatibility involved "implicit conversion". TypeScript does not perform implicit runtime conversions for type assignability, so this was changed to "exact match, compatible type, or explicit conversion".
- The function compatibility diagram stated parameter contravariance without the relevant strictness caveat. Updated the wording to mention `strictFunctionTypes`.
- The literal-type example used a top-level variable named `status`, which can collide with the DOM `window.status` global in script contexts. Renamed it to `statusValue`.
- The final best-practices code block referenced `isValidData`, `handleData`, and `Config` without definitions. Added minimal definitions so the example is self-contained and type-checks.

## Review Notes
The TypeScript code fences were extracted and compiled with TypeScript 5.9.3 using `--strict --noEmit --lib es2023,dom`; the runnable code now type-checks successfully. Commented-out lines intentionally demonstrate the errors discussed in the article.
