# Validation Summary: How to Create a Hashed Index in MongoDB for Sharding

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (hashed indexes, sharding, shard keys)
- MongoDB Shell (`mongosh`)
- Node.js MongoDB Driver

## Sources Consulted
- MongoDB Manual — Hashed Indexes: https://www.mongodb.com/docs/manual/core/index-hashed/
- MongoDB Manual — Hashed Sharding: https://www.mongodb.com/docs/manual/core/hashed-sharding/
- MongoDB Manual — sh.shardCollection(): https://www.mongodb.com/docs/manual/reference/method/sh.shardCollection/
- MongoDB Manual — sh.enableSharding(): https://www.mongodb.com/docs/manual/reference/method/sh.enableSharding/
- MongoDB Manual — Compound Hashed Indexes (4.4+): https://www.mongodb.com/docs/manual/core/index-compound/#compound-hashed-indexes
- MongoDB Node.js Driver — createIndex: https://www.mongodb.com/docs/drivers/node/current/fundamentals/indexes/

## Issues Found

1. **Incorrect claim that hashed indexes are single-field only (Key characteristics, line 32):**
   The post stated "Only supported on single fields (not compound)." Since MongoDB 4.4, compound indexes can include a single hashed field. Updated to: "A compound index can include at most one hashed field (supported since MongoDB 4.4)."

2. **Deprecated `sh.enableSharding()` command (Shard Key example, line 81):**
   The post included `sh.enableSharding("myapp")` as a required step. Since MongoDB 6.0, all databases are implicitly enabled for sharding, making this call a no-op. Removed the command from the main example and added a note explaining the version difference.

3. **Incorrect shard range labels in mermaid diagram (lines 23-24):**
   Shard 1 and Shard 2 both showed "range 0-50", which is incorrect — each shard must own a unique range. Fixed to Shard 1: 0-33, Shard 2: 34-66, Shard 3: 67-100, with hash values routed to the correct shards.

4. **Incorrect Best Practices bullet on compound hashed indexes (line 159):**
   The post stated "MongoDB does not support compound hashed indexes." Updated to reflect that since MongoDB 4.4, a compound index may include a single hashed field alongside other non-hashed fields.

## Review Notes
- The Node.js example uses `require()` (CommonJS). This is still valid but modern projects may prefer ES module `import` syntax. Not changed since CommonJS remains widely supported.
- The `createIndex` return value in the Node.js driver returns the index name string, which matches the `console.log("Index created:", result)` usage.
- The comparison table (Hashed vs Range Shard Keys) is accurate and useful.
