# Validation Summary: What Is a Covered Query in MongoDB and How to Achieve It

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (query engine, indexing, covered queries)
- MongoDB Node.js driver
- MongoDB `explain()` execution stats

## Sources Consulted
- MongoDB Manual: Covered Query — https://www.mongodb.com/docs/manual/core/query-optimization/#covered-query
- MongoDB Manual: explain() Results — https://www.mongodb.com/docs/manual/reference/explain-results/
- MongoDB Manual: Multikey Indexes — https://www.mongodb.com/docs/manual/core/index-multikey/
- MongoDB Node.js Driver: Collection.find() — https://www.mongodb.com/docs/drivers/node/current/usage-examples/find/

## Issues Found

1. **`"indexOnly": true` in explain output (line 56):** Removed `"indexOnly": true` from the example `explain()` output. This field was part of the legacy explain format in MongoDB 2.x and was removed in MongoDB 3.0. Modern MongoDB explain output uses `totalDocsExamined: 0` and the `PROJECTION_COVERED` stage to indicate a covered query, both of which the post already correctly listed.

2. **Requirement #4: overly broad restriction on embedded documents (line 28):** Changed "No array or embedded document fields in the query" to "The index must not be a multikey index (no indexed field contains an array)." Since MongoDB 3.6, indexes on embedded document fields using dot notation can cover queries. The actual restriction is that multikey indexes (created when any indexed field contains an array value) cannot cover queries. The original wording incorrectly excluded embedded document fields.

3. **Node.js driver projection syntax (line 100-102):** Fixed the `find()` call in the high-throughput API example. The projection was passed as a bare object `{ orderId: 1, total: 1, completedAt: 1, _id: 0 }` as the second argument. In the modern MongoDB Node.js driver (v4+), the second argument is a `FindOptions` object and projection must be nested under the `projection` key: `{ projection: { orderId: 1, total: 1, completedAt: 1, _id: 0 } }`. Without this fix, the projection fields would be silently ignored.

## Review Notes
- The mongo shell examples (`db.users.find(...)`) correctly use the shell's two-argument form where the second argument is the projection directly. This syntax is only valid in the mongo shell, not the Node.js driver — the post's shell examples are correct.
- The sort field `completedAt: -1` in the high-throughput example is correctly included in the compound index with a matching `-1` sort direction, which is good practice for covered + sorted queries.
