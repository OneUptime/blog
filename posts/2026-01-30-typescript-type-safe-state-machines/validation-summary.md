# Validation Summary: How to Build Type-Safe State Machines in TypeScript

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- TypeScript (discriminated unions, exhaustive checking with `never`, type narrowing, type predicates)
- XState v5 (`createMachine`, `assign`, `createActor`, `guard`, `types`, final states)
- Vitest (unit testing)
- Mermaid (`stateDiagram-v2` syntax for state diagrams)

## Sources Consulted
- XState v5 docs — actions/assign: https://stately.ai/docs/actions
- XState v5 docs — actors: https://stately.ai/docs/actors
- XState v5 docs — final states: https://stately.ai/docs/final-states
- XState v5 docs — setup(): https://stately.ai/docs/setup
- XState v4 → v5 migration guide: https://stately.ai/docs/migration
- XState v5 announcement: https://stately.ai/blog/2023-12-01-xstate-v5
- @xstate/test on npm (deprecation status): https://www.npmjs.com/package/@xstate/test
- Stately Visualizer (deprecated) docs: https://stately.ai/docs/visualizer
- xstate package on Bundlephobia
- TypeScript Handbook — Discriminated Unions: https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions
- Mermaid stateDiagram-v2 docs: https://mermaid.js.org/syntax/stateDiagram.html

## Issues Found

1. **`StateMachine<State, Event>` class missing generic constraint.** The `matches` method uses `State["type"]` and `Extract<State, { type: T }>`, both of which require `State` to be known to have a `type` property. Without a constraint, the class as written would not compile (`Type 'State' has no index signature for type 'type'`). Added `State extends { type: string }` constraint to the class declaration.

2. **Reference to deprecated `@xstate/test` package.** The comparison table cited `@xstate/test` as the XState testing tool. That standalone package is deprecated (last published ~4 years ago at v0.5.1); the model-based testing utilities were merged into `@xstate/graph` for XState v5. Updated the table cell to `@xstate/graph package`.

3. **Deprecated visualizer URL.** The post referenced `stately.ai/viz` for the XState visualizer. While the URL still resolves, the official docs label it deprecated and the modern equivalent is the Stately Editor at `stately.ai/editor`. Updated the sentence accordingly.

4. **Imprecise bundle-size claim for XState.** The table said "~15KB minified". For XState v5, ~15KB raw-minified is significantly low (raw minified is ~50KB+), while ~17KB minified+gzipped is closer to the actual size reported by Bundlephobia at the time of v5's release. Updated the table to "~17KB minified + gzipped" for accuracy.

## Review Notes

- The post uses the `createMachine({ types: {} as { context: ...; events: ... } })` typing pattern. This still works in XState v5, but the newer recommended idiom is the `setup({ types: { ... } }).createMachine({ ... })` builder, which gives better inference for inline actions, guards, and actors. Not a technical error — kept as is to avoid restructuring the post — but a future revision could modernize the examples to use `setup()`.
- The `case`-with-`const` declarations (e.g., `const total = ...` inside `case "SUBMIT":` without block braces) are valid TypeScript and compile correctly, but may trigger ESLint's `no-case-declarations` rule. Left as-is since the post is otherwise consistent and this is a lint-style preference rather than a correctness issue.
- All other code samples (discriminated unions, `assertNever` exhaustive checking, `transition` switch logic, order/auth machines, vitest tests, Mermaid generator output) are syntactically and semantically correct against current TypeScript and XState v5 references.
