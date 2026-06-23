# Validation Summary: How to Use MongoDB TTL Indexes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB TTL indexes
- MongoDB indexing
- MongoDB shell (`mongosh`)
- MongoDB `collMod` command
- MongoDB `serverStatus` metrics
- JavaScript MongoDB usage examples

## Sources Consulted
- MongoDB official documentation: TTL Indexes - https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB official documentation: Expire Data from Collections by Setting TTL - https://www.mongodb.com/docs/manual/tutorial/expire-data/
- MongoDB official documentation: `collMod` database command - https://www.mongodb.com/docs/manual/reference/command/collmod/
- MongoDB official documentation: `createIndexes` database command - https://www.mongodb.com/docs/manual/reference/command/createIndexes/
- MongoDB official documentation: `db.collection.findOneAndUpdate()` - https://www.mongodb.com/docs/manual/reference/method/db.collection.findOneAndUpdate/
- MongoDB official documentation: Server parameters, `ttlMonitorEnabled` - https://www.mongodb.com/docs/manual/reference/parameters/
- MongoDB official documentation: MongoDB 8.0 release notes, TTL indexes on capped collections starting in MongoDB 7.1 - https://www.mongodb.com/docs/manual/release-notes/8.0/

## Issues Found
1. **`expireAfterSeconds: 0` described as exact deletion**: The post said documents are deleted at the exact time stored in the date field. MongoDB TTL deletion is handled by a background monitor, so documents become eligible for deletion at that time but are not guaranteed to disappear exactly then. **Fix:** Changed the section heading and wording to say scheduled/eligible expiration rather than exact immediate deletion.

2. **TTL deletion delay understated**: The post said a document might exist up to 60 seconds past expiration. The TTL monitor generally checks periodically, but under load or with many expired documents, deletion can lag beyond 60 seconds. **Fix:** Updated the gotcha to avoid promising a strict 60-second upper bound.

3. **Capped collection limitation outdated**: The post said TTL indexes cannot be created on capped collections. MongoDB 7.1 and later support TTL indexes on capped collections. **Fix:** Changed the section to note that capped collection support depends on MongoDB version.

4. **Compound TTL example described as failing**: The post said creating a compound index with `expireAfterSeconds` would fail. Current MongoDB documentation says compound indexes do not support TTL and ignore the `expireAfterSeconds` option. **Fix:** Updated the example to explain that the compound index is created without TTL behavior and kept the separate-index solution.

5. **Best practice used "precise control" wording**: The `expiresAt` pattern gives per-document expiration times, but deletion is still asynchronous. **Fix:** Changed the wording to "per-document expiration times."

## Review Notes
- The basic TTL index examples, `expireAfterSeconds` values, `collMod` usage, `dropIndex` examples, date-field behavior, array-of-dates behavior, and `serverStatus().metrics.ttl` statistics are consistent with current MongoDB documentation.
- The `findOneAndUpdate()` examples use `returnDocument: 'after'`, which is valid in `mongosh` and current MongoDB driver APIs.
- TTL indexes are suitable for cleanup and retention, but application code should still filter by expiration time when stale reads are unacceptable because TTL deletion is asynchronous.
