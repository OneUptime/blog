# Validation Summary: How to Implement MongoDB Sparse Index Use Cases

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB sparse indexes
- MongoDB unique indexes
- MongoDB partial indexes
- MongoDB query operators
- MongoDB index monitoring

## Sources Consulted
- MongoDB Manual: Sparse Indexes - https://www.mongodb.com/docs/manual/core/index-sparse/
- MongoDB Manual: Partial Indexes - https://www.mongodb.com/docs/manual/core/index-partial/
- MongoDB Manual: Unique Indexes - https://www.mongodb.com/docs/manual/core/index-unique/
- MongoDB Manual: Query for Null or Missing Fields - https://www.mongodb.com/docs/manual/tutorial/query-for-null-fields/
- MongoDB Manual: db.collection.createIndex() - https://www.mongodb.com/docs/manual/reference/method/db.collection.createindex/
- MongoDB Manual: Index Builds on Populated Collections - https://www.mongodb.com/docs/manual/core/index-creation/
- MongoDB Manual: $currentOp - https://www.mongodb.com/docs/manual/reference/operator/aggregation/currentop/
- MongoDB Manual: $indexStats - https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexstats/

## Issues Found
- The null-handling example incorrectly said `{ phone: { $ne: null } }` finds both Alice and Bob. MongoDB documents that non-equality against `null` matches documents where the field exists and is not null, so the comment was corrected to say it finds Alice.
- The null-handling example used `{ phone: null }` while saying it finds only Bob. MongoDB documents that equality to `null` matches null or missing fields, so the example was changed to `{ phone: { $type: 10 } }` to find only explicit null values.
- The partial index example used `$ne: null` inside `partialFilterExpression`. MongoDB partial indexes support equality, `$exists: true`, range operators, `$type`, `$and`, `$or`, `$in`, and geospatial operators, but not `$ne`, so the example was changed to use `$type: "string"` for email values.
- The soft-delete partial index used `{ deletedAt: { $exists: false } }`, but partial indexes support `$exists: true`, not `$exists: false`. The filter was changed to `{ deletedAt: null }`, which matches the common active-record query pattern for documents where `deletedAt` is null or missing.
- The multi-tenant compound sparse index example used `{ tenantId: 1, customerId: 1 }` with `sparse: true`. For sparse compound ascending/descending indexes, MongoDB indexes a document if at least one indexed key exists, so a present `tenantId` would cause every tenant document to be indexed. The example was changed to partial indexes filtering on the optional field.
- The index build section said sparse indexes process fewer documents. MongoDB index builds scan the collection; the text was corrected to say sparse indexes write fewer index entries when many documents lack the indexed field.
- The index build monitoring example used `db.currentOp()`. MongoDB recommends `$currentOp` instead of `db.currentOp()` / the deprecated `currentOp` command, so the example was updated to an admin aggregation using `$currentOp`.

## Review Notes
- Unique sparse indexes still include documents where the indexed field exists with a null value, so only one explicit null value is allowed for a unique sparse single-field index. The post already explains that null values are included in sparse indexes.
