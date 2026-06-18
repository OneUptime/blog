# Validation Summary: How to Handle Union and Intersection Types

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- TypeScript
- Union types
- Intersection types
- Discriminated unions
- Type narrowing and type guards

## Sources Consulted
- TypeScript Handbook: Unions and Intersection Types - https://www.typescriptlang.org/docs/handbook/unions-and-intersections.html
- TypeScript Handbook: Narrowing - https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- TypeScript Handbook: Object Types - https://www.typescriptlang.org/docs/handbook/2/objects.html
- TypeScript Handbook: Everyday Types - https://www.typescriptlang.org/docs/handbook/2/everyday-types.html

## Issues Found
- The event handling example declared interfaces named `MouseEvent`, `KeyboardEvent`, and `CustomEvent`. In TypeScript projects that include the DOM library, those names merge with built-in DOM interfaces and can produce compiler errors because properties like `x`, `y`, `button`, `key`, and `keyCode` already exist with incompatible declaration modifiers. Renamed them to `AppMouseEvent`, `AppKeyboardEvent`, and `AppCustomEvent`, and updated the `AppEvent` union accordingly.

## Review Notes
The TypeScript examples were checked with `tsc` using strict mode and DOM library types after the fix. The explanations of union types, intersection types, discriminated unions, `typeof`, `in`, `instanceof`, custom type guards, and exhaustiveness checks match the current TypeScript documentation.
