# Validation Summary: How to Create an On-Demand Materialized View in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (aggregation framework)
- `$out` aggregation stage
- `$merge` aggregation stage
- MongoDB standard views vs materialized views
- mongosh CLI
- MongoDB Atlas Scheduled Triggers (App Services / Realm functions)
- Cron scheduling

## Sources Consulted
- MongoDB $out documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/out/
- MongoDB $merge documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/merge/
- MongoDB on-demand materialized views guide: https://www.mongodb.com/docs/manual/core/materialized-views/
- MongoDB $group accumulator operators: https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/
- MongoDB $addToSet accumulator: https://www.mongodb.com/docs/manual/reference/operator/aggregation/addToSet/
- MongoDB Atlas App Services functions: https://www.mongodb.com/docs/atlas/app-services/functions/
- MongoDB Atlas Scheduled Triggers: https://www.mongodb.com/docs/atlas/app-services/triggers/scheduled-triggers/
- mongosh CLI documentation: https://www.mongodb.com/docs/mongodb-shell/

## Issues Found
No technical issues found.

## Review Notes
- The `$sort` stage before `$out` in the first example is syntactically valid but has no practical effect on the output collection, since MongoDB collections do not guarantee document storage order. Queries against the materialized view should use their own `.sort()` or rely on indexes. This is not incorrect, and the post already demonstrates sorting at query time in the "Querying the Materialized View" section.
- The comparison table's description of `$out` concurrent reads as "Blocked briefly" is a reasonable simplification. Technically, `$out` writes to a temporary collection and then performs an atomic rename (`renameCollection` with `dropTarget: true`), which causes a very brief moment of unavailability rather than a traditional read block.
- The `$addToSet` approach for counting unique users works well for moderate cardinalities but could consume significant memory for very high-cardinality fields. This is a design trade-off rather than an error.
