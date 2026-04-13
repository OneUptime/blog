# Validation Summary: How to Use MongoDB Capped Collections for Fixed-Size Queues

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (capped collections, tailable cursors, `$natural` sort)
- MongoDB Node.js Driver (`mongodb` npm package)
- JavaScript / Node.js

## Sources Consulted
- [MongoDB Capped Collections Documentation](https://www.mongodb.com/docs/manual/core/capped-collections/)
- [MongoDB Tailable Cursors Documentation](https://www.mongodb.com/docs/manual/core/tailable-cursors/)
- [MongoDB cursor.sort() Documentation](https://www.mongodb.com/docs/manual/reference/method/cursor.sort/)
- [MongoDB cursor.tailable() Documentation](https://docs.mongodb.com/manual/reference/method/cursor.tailable/)
- [MongoDB convertToCapped Command Documentation](https://www.mongodb.com/docs/manual/reference/command/converttocapped/)
- [MongoDB Capped Collections v8.0 Documentation](https://www.mongodb.com/docs/v8.0/core/capped-collections/)

## Issues Found

### 1. Inaccurate update size restriction claim (Limitations section)
- **What was wrong:** The post stated "Documents can be updated but the updated document size must not change (in-place updates only)." The actual MongoDB restriction is that the updated document must not **grow** beyond its original size — shrinking is allowed. The phrase "in-place updates only" is an MMAPv1-era concept that does not apply to the WiredTiger storage engine (default since MongoDB 3.2, only option since 4.2).
- **What was changed:** Updated to "Documents can be updated but the updated document must not grow beyond its original size."
- **Why:** The original wording was more restrictive than reality and used outdated MMAPv1 terminology. MongoDB documentation confirms updates are allowed as long as the document does not grow beyond its original size.

### 2. Misleading code comment about same-size updates
- **What was wrong:** The code comment read `// same-size field update is fine` for an update changing `status` from `"pending"` (7 chars) to `"done"` (4 chars). This is not a same-size update — the BSON-encoded document shrinks by several bytes.
- **What was changed:** Updated comment to `// allowed because document does not grow` and the preceding comment to `// Update is allowed if document does not grow beyond original size`.
- **Why:** The comment was factually incorrect. The update works not because it's same-size, but because the document shrinks (which is permitted).

## Review Notes
- **Redundant `.sort({ $natural: 1 })` on tailable cursors:** Both tailable cursor examples chain `.sort({ $natural: 1 })`. Tailable cursors on capped collections inherently return documents in natural (insertion) order, making this sort redundant. It does not cause an error, but it is unnecessary and could confuse readers into thinking tailable cursors might return in a different order without it.
- **Top-level `await` with CommonJS `require`:** The "Inserting Tasks" section uses `require("mongodb")` (CommonJS) but then calls `await enqueue(...)` at the top level, which is only valid in ES modules or the Node.js REPL. This is a common documentation shorthand and unlikely to confuse experienced developers, but strictly speaking the code is not runnable as-is in a CommonJS `.js` file.
- **`convertToCapped` command:** The command is still documented as active in current MongoDB versions. However, the MongoDB documentation recommends TTL indexes as a more flexible alternative to capped collections for many use cases. Users on future MongoDB versions should verify this command remains available.
- **Resume token terminology:** The section titled "Using a Resume Token to Continue After Reconnect" actually implements `_id`-based checkpointing, not true resume tokens (which are a Change Streams concept). The body text accurately describes the technique, but the title could be misleading to readers familiar with Change Streams.
