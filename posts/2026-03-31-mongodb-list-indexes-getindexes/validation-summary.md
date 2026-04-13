# Validation Summary: How to List All Indexes in MongoDB with getIndexes()

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (mongosh shell methods: `getIndexes()`, `listIndexes()`)
- MongoDB `$indexStats` aggregation pipeline stage
- MongoDB Node.js driver (`mongodb` npm package)
- JavaScript

## Sources Consulted
- MongoDB official documentation: `db.collection.getIndexes()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.getIndexes/
- MongoDB official documentation: `$indexStats` aggregation stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexStats/
- MongoDB official documentation: Index Properties — https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/#options
- MongoDB official documentation: `geoHaystack` removal in 5.0 — https://www.mongodb.com/docs/manual/release-notes/5.0-compatibility/#removed-commands
- MongoDB Node.js driver documentation: `collection.indexes()` — https://www.mongodb.com/docs/drivers/node/current/

## Issues Found

### 1. Reference to removed `geoHaystack` index type
- **What was wrong:** The "Check Index Properties Programmatically" code example included `"geoHaystack"` in the array of geo index types to detect. `geoHaystack` indexes were deprecated in MongoDB 4.4 and completely removed in MongoDB 5.0. Including it in a 2026 blog post is outdated and could cause confusion.
- **What was changed:** Removed `"geoHaystack"` from the array, leaving only `["2dsphere", "2d"]`.
- **Why:** A reader following this code against a MongoDB 5.0+ deployment would never encounter a `geoHaystack` index, and referencing it suggests it's still a valid index type.

### 2. `multiKey` listed as an index property in the reference table
- **What was wrong:** The "Index Properties Reference" table included a `multiKey` row described as "true if indexed field contains arrays." However, `multiKey` is **not** a property returned by `getIndexes()` or the `listIndexes` command. Whether an index is multikey is an internal state tracked by MongoDB and is not part of the index specification document.
- **What was changed:** Removed the `multiKey` row from the reference table.
- **Why:** Listing it in a reference table in an article about `getIndexes()` output would mislead readers into expecting this field in the results. Multikey status can be observed through explain plans or `collStats`, but not through the methods covered in this post.

## Review Notes
- The `background` option is correctly noted as deprecated in 4.2+. Since MongoDB 4.2, all index builds use an optimized process and the `background` option is ignored.
- The `$indexStats` description correctly states counters reset on mongod restart. The `accesses.since` field reflects when counters were last reset (at mongod start or index creation).
- The redundant index detection script correctly identifies prefix redundancy but only checks field names, not sort directions. A compound index `{a: 1, b: 1}` covers queries on `{a: 1}` but not `{a: -1}` for sort-dependent queries. This is a minor nuance that could be noted in a future update.
- The Node.js code correctly uses `collection.indexes()` (which returns a Promise resolving to an array), not `collection.listIndexes().toArray()`. Both are valid but the chosen API is simpler.
