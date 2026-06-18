# Validation Summary: How to Handle Utility Types in TypeScript

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- TypeScript
- TypeScript utility types
- TypeScript generics
- Mapped types
- Conditional types

## Sources Consulted
- TypeScript Handbook: Utility Types - https://www.typescriptlang.org/docs/handbook/utility-types.html
- TypeScript Handbook: Object Types / readonly Properties - https://www.typescriptlang.org/docs/handbook/2/objects.html#readonly-properties
- TypeScript Handbook: Mapped Types - https://www.typescriptlang.org/docs/handbook/2/mapped-types.html
- TypeScript Handbook: Conditional Types - https://www.typescriptlang.org/docs/handbook/2/conditional-types.html

## Issues Found
- The `Readonly<T>` section described properties as immutable. TypeScript's `Readonly<T>` makes properties `readonly`, preventing reassignment at type-check time, but it does not provide deep immutability or runtime immutability. Updated the heading and explanation to say read-only/reassignment instead.
- The `Readonly<AppState>` reducer comment said the state could not be mutated. `Readonly<T>` is shallow, so this was too broad. Updated the comment to describe the specific top-level property reassignment that TypeScript prevents.
- The `Extract<T, U>` example named a custom type `MouseEvent`, which conflicts with the built-in DOM `MouseEvent` type in common TypeScript projects that include the DOM library. Renamed it to `InteractionEvent`.

## Review Notes
The remaining utility type explanations and examples are consistent with the current TypeScript documentation. A focused compiler check for the edited examples passed with TypeScript 5.9.3 using `--strict --noEmit`.
