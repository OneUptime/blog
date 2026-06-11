# Validation Summary: How to Build CRDT Implementation

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- Conflict-free Replicated Data Types (CRDTs)
- State-based CRDTs (CvRDTs)
- Operation-based CRDTs (CmRDTs)
- G-Counter, PN-Counter, LWW-Register, OR-Set, LWW-Map, sequence CRDT concepts
- Delta-state CRDTs
- Hybrid Logical Clocks
- Vector clocks / version vectors
- TypeScript
- JavaScript Map, Object.fromEntries, Date.now
- uuid npm package

## Sources Consulted
- Shapiro et al., "Conflict-free Replicated Data Types": https://inria.hal.science/inria-00609399v2/document
- Delta State Replicated Data Types: https://arxiv.org/abs/1603.01529
- Logical Physical Clocks and Consistent Snapshots in Globally Distributed Databases: https://cse.buffalo.edu/tech-reports/2014-04.pdf
- TypeScript Handbook, Classes and private member access: https://www.typescriptlang.org/docs/handbook/2/classes.html
- MDN Web Docs, Map: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
- MDN Web Docs, Object.fromEntries: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/fromEntries
- MDN Web Docs, Date.now: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now
- uuid npm package documentation: https://www.npmjs.com/package/uuid

## Issues Found
- The mathematical foundation section applied merge requirements to all CRDTs. Updated it to specify state-based CRDTs, and clarified that operation-based CRDTs require commuting operations and a delivery layer that avoids lost or duplicated operations.
- The G-Counter `setState` method assumed `this.state` was already initialized. Updated it to replace the whole state object, and added `mergeState` for serialized state joins.
- The PN-Counter example exposed serialized state but did not provide matching import or merge helpers. Added `setState` and `mergeState` methods that delegate to the internal G-Counters.
- The LWW-Register and LWW-Map examples used `timestamp || Date.now()`, which ignores an explicit timestamp of `0`. Replaced those defaults with `timestamp ?? Date.now()`.
- The LWW-Register example exposed state but did not provide matching import or serialized merge helpers. Added `setState` and `mergeState`.
- The OR-Set usage comment described the concurrent add/remove resolution imprecisely. Updated it to explain that the remove only tombstones observed tags.
- The sync-layer example tried to create a temporary CRDT with `Object.create(Object.getPrototypeOf(localCrdt))`, which leaves instance fields uninitialized and can fail at runtime. Replaced the interface with a `mergeState` method and merged serialized state directly into the registered local CRDT.
- The sync-layer description said version vectors made state transfer efficient, but the example still sends full state. Updated the description to say version vectors avoid re-merging stale state.
- The sequence CRDT section claimed to generate IDs between positions, but the toy code generated sortable IDs that do not preserve arbitrary insert positions. Updated the wording and comments to identify it as a toy deterministic merge example and removed unused `before` / `after` parameters.
- The delta-state G-Counter tracked increment amounts in `delta` while `applyDelta` treated deltas as state components and joined with `max`. Updated the delta to store the latest state component for the node, which matches the join semantics used by the receiver.

## Review Notes
The examples are still intentionally simplified and not production-ready. In particular, production OR-Sets need tombstone garbage collection, production LWW data types need a carefully chosen clock/tiebreaking policy, and collaborative text editors should use a mature sequence CRDT algorithm such as those implemented by Yjs or Automerge.
