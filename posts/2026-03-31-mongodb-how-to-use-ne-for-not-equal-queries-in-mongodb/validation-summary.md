# Validation Summary: How to Use $ne for Not Equal Queries in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (query operators, aggregation framework)
- Node.js MongoDB driver
- PyMongo (Python MongoDB driver)

## Sources Consulted
- MongoDB official documentation on $ne query operator: https://www.mongodb.com/docs/manual/reference/operator/query/ne/
- MongoDB official documentation on $ne aggregation operator: https://www.mongodb.com/docs/manual/reference/operator/aggregation/ne/
- MongoDB documentation on null and missing field semantics: https://www.mongodb.com/docs/manual/tutorial/query-for-null-fields/
- MongoDB documentation on explain output: https://www.mongodb.com/docs/manual/reference/explain-results/

## Issues Found
1. **Incorrect comment about `$ne: null` behavior (line 38)**: The comment stated "Find documents where a field is not null (also matches missing field)", implying that documents with a missing field would be returned. This is wrong — MongoDB treats missing fields as `null`, so `{ customerName: { $ne: null } }` **excludes** documents where the field is missing or explicitly null. Fixed the comment to: "Find documents where a field exists and is not null (excludes null and missing fields)".

## Review Notes
- The general description in "What Is the $ne Operator?" correctly states that `$ne` matches documents where the field does not exist (true for non-null comparisons like `$ne: 'cancelled'`), but the `$ne: null` case is a special exception to this rule. The post doesn't explicitly call out this nuance in the prose, but the fixed comment now correctly reflects the behavior.
- The `explain()` output path `plan.executionStats.executionStages.stage` is valid but may vary across MongoDB versions. In some versions, checking `queryPlanner.winningPlan.stage` is more common in examples.
- The index behavior guidance is sound — `$ne` queries are indeed inefficient with indexes, and the recommendation to use `$in` as an alternative is good practical advice.
