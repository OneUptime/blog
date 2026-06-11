# Validation Summary: How to Build MongoDB Subset Patterns

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- MongoDB data modeling
- MongoDB subset pattern
- MongoDB WiredTiger cache
- MongoDB indexes, TTL indexes, and covered queries
- MongoDB change streams
- MongoDB aggregation pipeline, `$topN`, and `$merge`
- MongoDB Node.js driver transaction and change stream patterns

## Sources Consulted
- MongoDB Manual: Group Data with the Subset Pattern - https://www.mongodb.com/docs/manual/data-modeling/design-patterns/group-data/subset-pattern/
- MongoDB Manual: Production Notes / WiredTiger cache defaults - https://www.mongodb.com/docs/manual/administration/production-notes/
- MongoDB Manual: WiredTiger Storage Engine - https://www.mongodb.com/docs/manual/core/wiredtiger/
- MongoDB Manual: `db.collection.watch()` and change stream `fullDocument` option - https://www.mongodb.com/docs/manual/reference/method/db.collection.watch/
- MongoDB Manual: Change stream update events - https://www.mongodb.com/docs/manual/reference/change-events/update/
- MongoDB Manual: `$push`, `$slice`, and `$sort` update modifiers - https://www.mongodb.com/docs/manual/reference/operator/update/push/
- MongoDB Manual: TTL indexes - https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB Manual: `$topN` accumulator - https://www.mongodb.com/docs/manual/reference/operator/aggregation/topn/
- MongoDB Manual: `$merge` aggregation stage - https://www.mongodb.com/docs/manual/reference/operator/aggregation/merge/
- MongoDB Manual: `serverStatus` WiredTiger cache metrics - https://www.mongodb.com/docs/manual/reference/command/serverstatus/

## Issues Found
- Corrected the WiredTiger cache default from "50% of RAM minus 1GB" to the documented default: the larger of 50% of RAM minus 1GB, or 256MB.
- Replaced the "page faults" wording with disk-read/cache-miss wording because modern MongoDB/WiredTiger guidance tracks cache and disk-read pressure rather than relying on page fault terminology.
- Made illustrative `ObjectId()` and document snippets syntactically valid by replacing placeholder ObjectId strings and JavaScript ellipses in object/array values.
- Added `{ fullDocument: "updateLookup" }` to the change stream example so update events include `change.fullDocument`, as required by MongoDB change stream behavior.
- Fixed the scheduled aggregation `$merge` example to merge on `user_id` instead of `_id`; the original pipeline grouped by `user_id` but would not match the existing `users._id` ObjectId values.
- Corrected the TTL index example. TTL indexes delete entire documents, not individual elements from an embedded array, so the example now applies TTL to bucket documents.
- Replaced the cache hit ratio calculation with a cache fill ratio calculation based on documented WiredTiger cache fields. The previous example treated `pages read into cache` as hits and used an obsolete/misleading miss counter.
- Updated target outcomes to match the corrected cache metrics and modern WiredTiger terminology.

## Review Notes
The post is technically relevant and the subset pattern guidance aligns with MongoDB's official data modeling documentation. The remaining numeric thresholds, such as 60-70% cache fit and 80-90% document size reduction, are operational rules of thumb rather than MongoDB guarantees.
