# Validation Summary: How to Fix 'FailedToParse' Errors in MongoDB

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- MongoDB query syntax
- MongoDB aggregation pipelines
- MongoDB configuration files
- MongoDB indexes and partial indexes
- MongoDB collation
- MongoDB Node.js driver
- JavaScript
- YAML

## Sources Consulted
- MongoDB Error Codes: https://www.mongodb.com/docs/manual/reference/error-codes/
- MongoDB Query Documents: https://www.mongodb.com/docs/manual/tutorial/query-documents/
- MongoDB `$or` query operator: https://www.mongodb.com/docs/manual/reference/operator/query/or/
- MongoDB `$and` query operator: https://www.mongodb.com/docs/manual/reference/operator/query/and/
- MongoDB `$gt` query operator: https://www.mongodb.com/docs/manual/reference/operator/query/gt/
- MongoDB `$elemMatch` query operator: https://www.mongodb.com/docs/manual/reference/operator/query/elemmatch/
- MongoDB Aggregation Stages: https://www.mongodb.com/docs/manual/reference/mql/aggregation-stages/
- MongoDB `$group` aggregation stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/
- MongoDB `$lookup` aggregation stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/
- MongoDB Configuration File Options: https://www.mongodb.com/docs/manual/reference/configuration-options/
- MongoDB `db.collection.createIndex()`: https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB Partial Indexes: https://www.mongodb.com/docs/manual/core/index-partial/
- MongoDB Collation: https://www.mongodb.com/docs/manual/reference/collation/
- MongoDB Node.js Driver CRUD and aggregation docs: https://www.mongodb.com/docs/drivers/node/current/

## Issues Found
- The `$elemMatch` example incorrectly said using `$elemMatch` on a string field is a parse error. MongoDB documents `$elemMatch` as matching array fields; a scalar field generally does not match rather than producing a parse error. Changed the bad example to pass a non-object `$elemMatch` argument, which is a syntax error.
- The "good" MongoDB configuration example used `storage.journal.enabled`, which is not a current configuration option in modern MongoDB versions. Replaced it with the current `storage.directoryPerDB` option.
- The partial index example incorrectly treated `active: "true"` as an invalid partial filter expression. Equality expressions are allowed in `partialFilterExpression`, including string equality. Changed the bad example to use `$ne`, which is not supported in partial filter expressions.
- The sample aggregation validator contained an outdated stage list and would flag several current MongoDB stages as invalid. Updated the list to match current MongoDB aggregation stage documentation.
- The sample `$group` accumulator validator omitted current valid `$group` accumulators and could reject valid pipelines. Updated the accumulator list using the current `$group` documentation.
- The sample validator could crash on malformed aggregation stages or `$group` stages instead of reporting validation errors. Added object checks and corrected `_id` detection so valid constants such as `0` or `false` are not treated as missing.

## Review Notes
The post is generally accurate after the fixes. Some validation code is intentionally illustrative and does not replace MongoDB server-side parsing or full driver validation, especially for version-specific, Atlas-only, or deployment-specific aggregation stages.
