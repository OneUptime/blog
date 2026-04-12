# Validation Summary: How to Monitor Notification Queue Health with MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (aggregation pipeline, `$group`, `$percentile`, `$cond`, `$subtract`, `$addFields`)
- Node.js MongoDB Driver (`collection.aggregate`, `findOne`, `.toArray()`)
- Express.js (health check endpoint)
- JavaScript (async/await, Date arithmetic)

## Sources Consulted
- MongoDB Aggregation Pipeline documentation: https://www.mongodb.com/docs/manual/core/aggregation-pipeline/
- MongoDB `$group` accumulator reference: https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/
- MongoDB `$percentile` operator (MongoDB 7.0+): https://www.mongodb.com/docs/manual/reference/operator/aggregation/percentile/
- MongoDB `$subtract` operator: https://www.mongodb.com/docs/manual/reference/operator/aggregation/subtract/
- MongoDB `$cond` operator: https://www.mongodb.com/docs/manual/reference/operator/aggregation/cond/
- Node.js MongoDB Driver `findOne` options: https://www.mongodb.com/docs/drivers/node/current/usage-examples/findOne/

## Issues Found
No technical issues found.

## Review Notes
- The `$percentile` operator used in the Processing Latency section requires MongoDB 7.0 or later. The post does not mention this version requirement. Readers on older MongoDB versions will encounter an error at that stage.
- `$percentile` with `p: [0.95]` returns an array (e.g., `[value]`), not a scalar number. The field is named `p95LatencyMs`, which suggests a single value. This is the documented API behavior and not an error, but consumers of this data should be aware they need to access index `[0]` to get the numeric value.
- The health check endpoint has no error handling (e.g., try/catch around the database calls). This is acceptable for a tutorial but would need hardening for production use.
