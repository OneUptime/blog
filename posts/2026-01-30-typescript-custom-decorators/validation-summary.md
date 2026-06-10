# Validation Summary: How to Build Custom Decorators in TypeScript

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- TypeScript (experimental / legacy decorators via `experimentalDecorators`)
- JavaScript (class semantics, constructor return behavior, WeakMap, Map)
- Reflect Metadata concept (mentioned via `emitDecoratorMetadata`)

## Sources Consulted
- TypeScript Handbook — Decorators: https://www.typescriptlang.org/docs/handbook/decorators.html
- TypeScript tsconfig reference (`experimentalDecorators`, `emitDecoratorMetadata`): https://www.typescriptlang.org/tsconfig/#experimentalDecorators
- MDN — `new` operator (constructor return semantics): https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/new
- MDN — WeakMap: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap
- MDN — `performance.now()`: https://developer.mozilla.org/en-US/docs/Web/API/Performance/now

## Issues Found

1. **Incorrect generic type on `injectableParams` Map** (Parameter Decorators section).
   - **Was:** `const injectableParams = new Map<string, Map<string, number[]>>();`
   - **Fixed to:** `const injectableParams = new Map<string, Map<string, number>>();`
   - **Why:** The inner map is later populated with `set(serviceKey, parameterIndex)` where `parameterIndex` is a `number`, not a `number[]`. As written, the snippet would fail to compile under TypeScript's structural type checking. The corrected type matches the actual usage (single parameter index per service key).

## Review Notes

- The post teaches the **legacy / experimental** decorator implementation (`experimentalDecorators: true`). TypeScript 5.0+ ships a separate, stable, TC39 stage-3 decorators implementation with different signatures (no `target`/`propertyKey`/`descriptor` triple; instead a single context object). The post is consistent in teaching only the legacy form, which remains the form used by NestJS, Angular, TypeORM, etc., so the omission is acceptable for a focused tutorial — but readers using stage-3 decorators will find the signatures here do not apply.
- The `Singleton` decorator types `let instance: T | null = null` where `T` is the constructor type, then assigns `this as any`. The runtime behavior is correct (constructors returning an object override the `new` result, a well-defined JS feature), and the `as any` cast lets it compile. A more precise type would be `InstanceType<T> | null`, but the existing code works and is concise — left as-is since it is not technically incorrect.
- The `LogClass` decorator replaces a class constructor with a plain function. This works at runtime because any function can be invoked with `new`, and `original.name` correctly reflects the decorated class's name. `instanceof` is preserved by copying `prototype`. Verified correct.
- The decorator-execution-order example is accurate: factory expressions evaluate top-to-bottom, but the returned decorator functions are applied bottom-to-top, producing the documented output.
- The `Memoize` decorator's cache key uses `JSON.stringify(args)`, which is fine for the demo but will fail on non-serializable arguments (functions, circular refs, `Date` losing precision on parse round-trip, etc.). Acceptable for a tutorial example.
- Property decorator example assigns to `username: string;` / `password: string;` without definite-assignment assertions; under `strictPropertyInitialization` TypeScript's control-flow analysis recognizes the constructor assignment, so this compiles. Not an issue in practice.
