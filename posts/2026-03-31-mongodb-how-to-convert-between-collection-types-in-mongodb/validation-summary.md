# Validation Summary: How to Convert Between Collection Types in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (shell commands, `convertToCapped`, capped collections, time series collections, clustered collections)
- mongosh (MongoDB Shell)
- MongoDB Node.js Driver (dual-write pattern example)

## Sources Consulted
- MongoDB official documentation: `convertToCapped` command — https://www.mongodb.com/docs/manual/reference/command/convertToCapped/
- MongoDB official documentation: Capped Collections — https://www.mongodb.com/docs/manual/core/capped-collections/
- MongoDB official documentation: Time Series Collections — https://www.mongodb.com/docs/manual/core/timeseries-collections/
- MongoDB official documentation: `createCollection` — https://www.mongodb.com/docs/manual/reference/method/db.createCollection/
- MongoDB official documentation: `renameCollection` — https://www.mongodb.com/docs/manual/reference/method/db.collection.renameCollection/

## Issues Found

1. **"global write lock" (line 35):** The post stated that `convertToCapped` acquires a "global write lock." This is incorrect — it acquires a **database-level exclusive lock**, not a global lock. Fixed to "database-level exclusive lock."

2. **"All existing indexes are preserved" (line 38):** The post claimed all existing indexes are preserved during `convertToCapped`. This is incorrect — secondary indexes are **not** preserved; only the default `_id` index is retained on the new capped collection. Fixed to clarify that secondary indexes must be recreated after conversion.

## Review Notes
- The `db.collection.stats()` method used in the validation section is deprecated starting from mongosh 2.0 / MongoDB 6.2 in favor of the `$collStats` aggregation stage. It still functions but may be removed in future versions. Not changed since it remains functional.
- The dual-write pattern section uses MongoDB Node.js driver syntax (`db.collection()`), which is correct for application-level code but differs from the mongosh syntax used elsewhere in the post. This is appropriate since dual-write logic would be implemented in application code.
- The overall migration approaches (rename-copy-drop for capped-to-regular, create-and-batch-migrate for time series conversions) are sound and follow MongoDB best practices.
