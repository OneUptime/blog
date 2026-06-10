# Validation Summary: How to Create Const Assertions in TypeScript

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- TypeScript (3.4+ for `as const`, 4.9+ for `satisfies`)
- TypeScript type system features: literal types, readonly modifiers, tuples, mapped types, conditional types, discriminated unions, template literal types
- TypeScript enums (compared against const assertions)

## Sources Consulted
- TypeScript 3.4 release notes (const assertions): https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-4.html
- TypeScript 4.9 release notes (`satisfies` operator): https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html
- TypeScript Handbook — Everyday Types / Object Types: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html
- TypeScript Handbook — Mapped Types and Conditional Types: https://www.typescriptlang.org/docs/handbook/2/mapped-types.html
- Local TypeScript 5.9.3 compiler used to verify each non-trivial code sample under `--strict`

## Issues Found

1. **Reducer example spreads `state: unknown` — TypeScript error**
   - The "Building Discriminated Unions" section declared `function reducer(state: unknown, action: Action): unknown` and then used `{ ...state, loading: true }`. TypeScript 5.x rejects this with TS2698: "Spread types may only be created from object types." Verified locally.
   - Changed the parameter and return type from `unknown` to `object`, which permits spreading while still being deliberately loose for an illustrative reducer. All four switch branches now type-check.

2. **Pitfall 3 incorrectly claimed literal types are lost on object spread**
   - The post said `const copy = { ...original }` (where `original = { x: 1, y: 2 } as const`) produces `{ x: number; y: number }` and that "readonly and literal types are lost." Verified locally that the inferred type of `copy` is actually `{ x: 1; y: 2 }` — only the `readonly` modifier is dropped; the literal types are preserved.
   - Updated the inline comment to: `{ x: 1; y: 2 } - literal types are preserved, but readonly is lost!` and tweaked the solution comment to reflect that the `as const` on the spread reinstates `readonly`.

## Review Notes
- All other code samples (primitive `as const`, readonly tuple inference, `typeof T[number]`, `keyof typeof` patterns, `ValueOf<T>` helper, `as const satisfies T`, template literal types `\`/api/${string}\``, computed property names in interface declarations using const-object keys, the `TypedEventEmitter` generic class, the state-machine `as never` workaround for `includes`, the `FormData` conditional mapped type, the `RequiredFieldName` filtering mapped type) were either independently verified against the TypeScript 5.9 compiler or are straightforward applications of documented behavior.
- The Enum-vs-const-assertion comparison table's "Object methods: No" for enums is a minor simplification — at runtime, the compiled enum is a JS object so `Object.keys` does work, though numeric enums include reverse-mapping entries. Not changed because the post's framing is about ergonomic TypeScript usage rather than runtime mechanics.
- The Pitfall 1 example phrases the issue as "settings is mutable" — strictly, `as const` on the outer object does make the `settings` *property reference* readonly; only its inner properties remain mutable. The author's "Solution" (apply `as const` inside `getDefaultSettings`) is correct, so left as-is.
- The two `type EventName = ...` declarations (one in "Ensuring Completeness with satisfies", one in the event emitter section) would collide if pasted into one file, but each section is presented as a standalone snippet, which is conventional for tutorial posts.
