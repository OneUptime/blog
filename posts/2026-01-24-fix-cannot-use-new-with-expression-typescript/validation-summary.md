# Validation Summary: How to Fix 'Cannot Use 'new' with Expression' Errors

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- TypeScript
- JavaScript constructors
- TypeScript classes and abstract classes
- TypeScript construct signatures
- TypeScript decorators
- TypeScript mixins
- JavaScript `Reflect.construct`

## Sources Consulted
- TypeScript Handbook: More on Functions - Construct Signatures: https://www.typescriptlang.org/docs/handbook/2/functions.html
- TypeScript Handbook: Classes - Abstract Construct Signatures: https://www.typescriptlang.org/docs/handbook/2/classes.html
- TypeScript 4.2 Release Notes - `abstract` Construct Signatures: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-2.html
- TypeScript Handbook: Decorators - Class Decorators: https://www.typescriptlang.org/docs/handbook/decorators.html
- TypeScript Handbook: Mixins: https://www.typescriptlang.org/docs/handbook/mixins.html
- ECMAScript Language Specification - `Reflect.construct`: https://tc39.es/ecma262/multipage/reflection.html#sec-reflect.construct
- Local compiler validation with TypeScript 5.9.3 via `npx tsc --noEmit --strict --target ES2022 --module commonjs --experimentalDecorators`

## Issues Found
- Updated the opening diagnostic wording from the older phrasing to the current TypeScript compiler wording, "This expression is not constructable."
- Changed the constructor-argument error comment from "Expected 2 arguments" to "Missing age argument" because TypeScript reports the whole factory call arity, including the constructor parameter.
- Fixed the abstract constructor example by declaring a local `abstract class Extended` and returning it. TypeScript requires a class extending a type variable constrained by an abstract construct signature to also be abstract.
- Corrected the decorator example to avoid claiming that decorator syntax changes the static type of `User`. The wrapped constructor value demonstrates access to `createdAt` instead.
- Added an `object` constraint to the generic `fromJSON` helper so `Object.assign(new this(), ...)` type-checks under `--strict`.
- Corrected the type relationship diagram so `class Foo {}` is described as constructable but not callable, and a callable-plus-constructable value is represented by an explicit type with both signatures.
- Corrected the introductory diagram so the construct-signature example uses an explicit `new () => Bar` constructor type instead of a plain function declaration.

## Review Notes
The code snippets were extracted and compiled individually. Only the two examples intentionally demonstrating TypeScript errors failed compilation; all corrected working examples compiled successfully under TypeScript 5.9.3.
