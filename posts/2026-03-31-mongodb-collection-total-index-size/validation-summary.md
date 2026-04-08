# Validation Summary: How to Use db.collection.totalIndexSize() in MongoDB

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MongoDB (mongosh shell)
- WiredTiger storage engine
- MongoDB aggregation framework (`$indexStats`, `$collStats`)
- MongoDB partial and sparse indexes

## Sources Consulted
- MongoDB official documentation: `db.collection.totalIndexSize()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.totalIndexSize/
- MongoDB official documentation: `db.collection.stats()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.stats/
- MongoDB official documentation: `$indexStats` aggregation stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexStats/
- MongoDB official documentation: Sparse Indexes — https://www.mongodb.com/docs/manual/core/index-sparse/
- MongoDB official documentation: Partial Indexes — https://www.mongodb.com/docs/manual/core/index-partial/
- MongoDB official documentation: `serverStatus` command — https://www.mongodb.com/docs/manual/reference/command/serverStatus/

## Issues Found
1. **Sparse index description was inaccurate.** The post stated sparse indexes "Skip null values to reduce the number of indexed entries." This is incorrect — sparse indexes skip documents that *lack* the indexed field entirely, but they do include documents where the field is explicitly set to `null`. Changed to: "Skip documents that lack the indexed field to reduce the number of indexed entries."

## Review Notes
- `db.collection.stats()` wraps the `collStats` command, which was deprecated in MongoDB 6.2 in favor of the `$collStats` aggregation stage. The code still works in current versions but may be removed in a future release. The post does not target a specific MongoDB version, so this is acceptable for now but worth noting for a future update.
- All other code examples are syntactically correct and use current mongosh JavaScript syntax.
- The WiredTiger cache path (`serverStatus.wiredTiger.cache['maximum bytes configured']`) is correct.
- The `$indexStats` usage and output field references (`name`, `accesses.ops`) are accurate.
