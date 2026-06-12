# Validation Summary: How to Build Conflict Resolution

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Distributed systems
- Conflict resolution
- TypeScript
- JavaScript `Date`, `Map`, and `Set`
- Last-write-wins registers
- Custom merge functions
- CRDTs: G-Counter, PN-Counter, OR-Set
- Eventual consistency

## Sources Consulted
- TypeScript Handbook, Classes: https://www.typescriptlang.org/docs/handbook/2/classes.html
- MDN `Date.now()`: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now
- MDN `Map`: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
- MDN `Set`: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set
- Shapiro, Preguica, Baquero, Zawirski, "A comprehensive study of Convergent and Commutative Replicated Data Types": https://www.lri.fr/~mbl/ENS/CSCW/2021/papers/CRDT-study11.pdf
- Preguica, Baquero, Shapiro, "Conflict-free Replicated Data Types": https://perso.lip6.fr/Marc.Shapiro/papers/2018/CRDTs-Springer2018-authorversion.pdf
- Redis Active-Active geo-distribution documentation: https://redis.io/docs/latest/operate/rs/databases/active-active/
- Riak KV Data Types concepts: https://docs.riak.com/riak/kv/latest/learn/concepts/crdts/index.html
- Figma engineering blog, "How Figma's multiplayer technology works": https://www.figma.com/blog/how-figmas-multiplayer-technology-works/

## Issues Found
- The custom shopping cart merge text claimed to preserve information or additions from all conflicting writes, but the implementation uses `Math.max` for duplicate product quantities. Updated the wording to say it preserves application-relevant information and keeps the highest observed quantity.
- The CRDT overview said any order of operations applied to any replica yields the same final state. That is too broad for operation-based CRDTs, which have delivery requirements depending on the data type. Updated the explanation to distinguish state-based merges from operation-based delivery rules.
- The G-Counter error message said positive values even though the implementation allows zero. Updated the message to say non-negative values.
- The hybrid resolver described `max` as useful for counters and said it would never lose login counts. In distributed counters, `max` can lose concurrent increments; G-Counter or PN-Counter semantics are needed for that. Updated the wording to versions, high-water marks, and highest observed login count.
- The preferences merge comment called `{ ...local, ...remote }` a deep merge, but it is a shallow merge. Updated the comment.
- The further reading section said CRDTs are used by Figma. Figma's own engineering blog says its system is CRDT-inspired rather than true CRDTs. Updated the wording to "CRDTs and CRDT-inspired designs."

## Review Notes
Extracted all TypeScript snippets from the post and verified they compile with TypeScript 5.9.3 using `tsc --strict`.
