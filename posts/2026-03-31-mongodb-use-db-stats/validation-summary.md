# Validation Summary: How to Use db.stats() in MongoDB

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (shell / mongosh)
- MongoDB Node.js Driver
- WiredTiger storage engine (implicit — default since MongoDB 3.2)

## Sources Consulted
- MongoDB `db.stats()` documentation: https://www.mongodb.com/docs/manual/reference/method/db.stats/
- MongoDB `dbStats` command documentation: https://www.mongodb.com/docs/manual/reference/command/dbStats/
- MongoDB `db.collection.stats()` documentation: https://www.mongodb.com/docs/manual/reference/method/db.collection.stats/
- MongoDB WiredTiger storage engine documentation: https://www.mongodb.com/docs/manual/core/wiredtiger/
- MongoDB Node.js Driver `db.command()` documentation: https://www.mongodb.com/docs/drivers/node/current/

## Issues Found

### 1. Inaccurate `storageSize` description in Key Fields table
- **What was wrong:** The table described `storageSize` as "Allocated storage on disk (includes padding, not freed space)." The "includes padding" language is MMAPv1-era terminology — WiredTiger (the default engine since MongoDB 3.2) does not use record-level padding. Additionally, `storageSize` actually *does* include freed blocks (space from deleted documents that hasn't been reused or returned to the OS), so "not freed space" was incorrect.
- **What was changed:** Updated to "Allocated storage on disk (compressed with WiredTiger; includes preallocated and freed but unreused space)."
- **Why:** Accurately reflects WiredTiger behavior, which is the relevant storage engine for all modern MongoDB deployments.

### 2. Misleading fragmentation explanation
- **What was wrong:** The "Compare Data Size vs Storage Size" section stated "A large gap between `dataSize` and `storageSize` indicates fragmentation." This is misleading because with WiredTiger compression, `dataSize` (uncompressed logical size) is *normally* larger than `storageSize` (compressed on-disk size). A gap in that direction is expected and healthy.
- **What was changed:** Replaced with an explanation that clarifies WiredTiger's compression behavior and that fragmentation is indicated specifically when `storageSize` significantly exceeds `dataSize`.
- **Why:** The original phrasing could lead readers to incorrectly interpret normal compression as a problem.

## Review Notes
- `db.collection.stats()` is deprecated as of MongoDB 6.2 in favor of the `$collStats` aggregation stage. The shell helper still works, but readers targeting MongoDB 6.2+ should be aware of the deprecation. This was not changed since the post doesn't target a specific version and the method still functions.
- The monitoring script calls `db.stats(1)` (scale=1, i.e., bytes) and then manually divides by `1024 * 1024`. This is functionally correct but slightly redundant — passing `1048576` as the scale factor would avoid the manual division. Not changed since it's a style choice, not an error.
- All code examples are syntactically correct and functional. Sample output field values are internally consistent (`totalSize` = `storageSize` + `indexSize`, `avgObjSize` ≈ `dataSize` / `objects`). The Node.js driver code correctly uses `db.command({ dbStats: 1 })` with the `scale` parameter.
