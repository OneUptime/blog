# Validation Summary: What Is Read Concern in MongoDB and Why It Matters

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (read concern feature)
- MongoDB Node.js driver
- PyMongo (Python MongoDB driver)
- MongoDB replica sets
- MongoDB multi-document transactions

## Sources Consulted
- MongoDB official documentation: Read Concern (https://www.mongodb.com/docs/manual/reference/read-concern/)
- MongoDB official documentation: Read Concern "linearizable" (https://www.mongodb.com/docs/manual/reference/read-concern-linearizable/)
- MongoDB official documentation: Read Concern "majority" (https://www.mongodb.com/docs/manual/reference/read-concern-majority/)
- MongoDB Node.js driver API documentation: Collection, FindCursor (https://www.mongodb.com/docs/drivers/node/current/)
- PyMongo documentation: ReadConcern and Collection (https://pymongo.readthedocs.io/en/stable/)

## Issues Found

### 1. Incorrect Node.js driver API usage
**What was wrong:** The Node.js code example chained `.readConcern("majority")` on the `FindCursor` returned by `.find()`. The `FindCursor` class in the MongoDB Node.js driver does not have a `.readConcern()` method. Read concern must be set at the client, database, or collection level.
**What was changed:** Replaced the chained cursor call with the correct pattern of setting read concern via `db.collection()` options: `db.collection("orders", { readConcern: { level: "majority" } })`.

### 2. Incorrect linearizable read concern requirement
**What was wrong:** The post stated that `linearizable` "requires a single-document query with a filter on `_id`". This is not a requirement per MongoDB documentation. The actual constraints are that linearizable read concern is only available for reads against the primary, and `maxTimeMS` should always be set to prevent indefinite blocking.
**What was changed:** Replaced the incorrect `_id` filter requirement with the actual constraints: reads must target the primary, and `maxTimeMS` should be used.

### 3. Misleading description of majority read concern performance
**What was wrong:** The post stated "`majority` requires the node to wait until the write has been replicated before returning data." This implies the node blocks at read time waiting for replication to complete, which is incorrect. In reality, `majority` returns data from the most recent snapshot that has already been confirmed as written to a majority of members.
**What was changed:** Reworded to accurately describe the behavior: `majority` returns data only from a snapshot confirmed as written to a majority of members, so reads may not include the very latest writes.

## Review Notes
- The PyMongo code example is correct and uses the idiomatic `get_collection()` approach with `ReadConcern`.
- The transaction code example correctly shows `startTransaction()` with `readConcern` and `writeConcern` options.
- The table of read concern levels is accurate and well-summarized.
- The post does not mention `maxTimeMS` usage with `linearizable` in the code examples, which could be a useful addition in the future.
- The `available` read concern description correctly notes the orphaned documents caveat in sharded clusters.
