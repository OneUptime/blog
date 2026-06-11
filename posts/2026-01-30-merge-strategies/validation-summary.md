# Validation Summary: How to Create Merge Strategies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Distributed systems conflict resolution
- Three-way merge algorithms
- Semantic merge strategies
- TypeScript
- React hooks
- Jest-style tests
- Operational transformation
- CRDT concepts
- Optimistic locking and versioned storage

## Sources Consulted
- Git merge documentation: https://git-scm.com/docs/git-merge
- TypeScript Handbook - Generics: https://www.typescriptlang.org/docs/handbook/2/generics.html
- TypeScript Handbook - Indexed Access Types: https://www.typescriptlang.org/docs/handbook/2/indexed-access-types.html
- MDN Web Docs - Storage interface: https://developer.mozilla.org/en-US/docs/Web/API/Storage
- React documentation - useState: https://react.dev/reference/react/useState
- Jest documentation - Expect matchers: https://jestjs.io/docs/expect
- Shapiro et al., "Conflict-free Replicated Data Types": https://inria.hal.science/hal-00932836v1/document
- Apache Wave Operational Transform whitepaper: https://svn.apache.org/repos/asf/incubator/wave/whitepapers/operational-transform/operational-transform.html

## Issues Found
- The semantic merge fallback was described as last-write-wins but implemented with nullish coalescing, which would ignore explicit `null` or `undefined` updates. Changed it to a simple three-way field merge fallback and updated the comment.
- The sample `Document` interface conflicted with the DOM `Document` type in TypeScript projects with DOM libraries enabled. Renamed it to `CollaborativeDocument`.
- The merge service used `Storage<T>`, which conflicts with the non-generic Web Storage API `Storage` interface and did not define the expected versioned persistence contract. Added `VersionedResource<T>` and `MergeStorage<T>` interfaces and updated the constructor type.
- The manual conflict resolution path returned a merged result but did not persist it, despite the workflow saying resolved results are saved. Added a version re-check, save call, and returned `newVersion`.
- `applyAutoResolutions` iterated only over keys from `ours`, which could drop fields present only in `base` or `theirs`. Changed it to iterate over the union of keys from all three versions.
- The data-loss validation rule indexed `InventoryItem` with a plain `string`, which fails under strict TypeScript checking. Cast the object keys to `(keyof InventoryItem)[]`.
- The final inventory pipeline registered `sectionMergeStrategy`, a document-specific strategy, in `MergePipeline<InventoryItem>`. Changed the example to use an empty strategy list placeholder for inventory-specific strategies.
- The validation test fixture inferred `status` as `string` instead of the `InventoryItem` status union type. Added an explicit `InventoryItem` annotation.

## Review Notes
The TypeScript snippets are illustrative and separated across the article; compiling all snippets concatenated still reports expected duplicate variable declarations and missing imports/globals for the React hook (`useState`, `api`) and Jest-style tests (`describe`, `it`, `expect`). The remaining claims about three-way merge, conflict markers, React state hooks, Jest matchers, CRDTs, and operational transformation are consistent with the consulted sources.
