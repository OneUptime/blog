# Validation Summary: How to Monitor Queue Length and Throughput with MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB aggregation framework (`$group`, `$match`, `$project`, `$addFields`, `$sort`)
- MongoDB 7.0+ `$percentile` accumulator
- MongoDB date operators (`$year`, `$month`, `$dayOfMonth`, `$hour`)
- MongoDB accumulator operators (`$sum`, `$avg`, `$min`, `$addToSet`)
- MongoDB conditional expressions (`$cond`, `$eq`)
- MongoDB arithmetic operators (`$subtract`, `$divide`, `$multiply`, `$round`)
- Node.js MongoDB driver (`aggregate().toArray()`, `countDocuments()`)
- JavaScript (`async/await`, `Promise.all`, `setInterval`)

## Sources Consulted
- MongoDB Aggregation Pipeline documentation: https://www.mongodb.com/docs/manual/core/aggregation-pipeline/
- MongoDB `$percentile` accumulator documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/percentile/
- MongoDB `$group` stage documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/
- MongoDB `$addFields` stage documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/addFields/
- MongoDB `$cond` operator documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/cond/
- MongoDB Node.js driver API: https://www.mongodb.com/docs/drivers/node/current/

## Issues Found
No technical issues found.

## Review Notes
- The `$percentile` accumulator (used in the "Processing Latency Percentiles" section) requires MongoDB 7.0 or later. The post does not mention this version requirement. While not a technical error, readers on older MongoDB versions would encounter an error. A future improvement could note the minimum version.
- The `$percentile` operator returns an array (one element per requested percentile). Since each call passes a single-element `p` array (e.g., `p: [0.5]`), the result fields like `p50ProcessingMs` will be single-element arrays (e.g., `[123.4]`), not scalar numbers. The post does not show output for this query so it is not misleading, but readers should be aware of this behavior.
- The post mixes mongosh syntax (`db.jobs.aggregate(...)`) in earlier examples with Node.js driver syntax (`collection.aggregate(...).toArray()`) in the dashboard function. This is a common and acceptable pattern — shell examples for exploration, programmatic code for production use — but could be clarified for beginners.
