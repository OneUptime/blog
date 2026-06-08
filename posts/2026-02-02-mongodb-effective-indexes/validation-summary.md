# Validation Summary: How to Create Effective Indexes in MongoDB

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- MongoDB (indexes, query planner)
- MongoDB Shell (mongosh) JavaScript syntax
- MongoDB index types: Single Field, Compound, Multikey, Text, Hashed, TTL, Partial, Unique
- `explain()` and `$indexStats` aggregation
- ESR (Equality, Sort, Range) rule

## Sources Consulted
- MongoDB Manual — Partial Indexes: https://www.mongodb.com/docs/manual/core/index-partial/
- MongoDB Manual — ESR (Equality, Sort, Range) Rule: https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-rule/
- MongoDB Manual — TTL Indexes: https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB Manual — Text Indexes: https://www.mongodb.com/docs/manual/core/indexes/index-types/index-text/
- MongoDB Manual — Multikey Indexes: https://www.mongodb.com/docs/manual/core/indexes/index-types/index-multikey/
- MongoDB Manual — `explain()` results: https://www.mongodb.com/docs/manual/reference/explain-results/
- MongoDB Manual — `$indexStats`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexStats/

## Issues Found

1. **Incorrect classification of `$in` as a range operator in the ESR rule.**
   - The post listed `$in` alongside `$gt` and `$lt` as a range operator.
   - According to MongoDB's official ESR documentation, `$in` used alone is an **equality** operator; only `$in` arrays with 201+ elements behave like a range predicate. `$ne` and `$nin`, by contrast, are explicitly documented as range operators.
   - Replaced `$in` with `$ne` in the example list so the listed examples are unambiguous range operators.

2. **`$ne` used inside `partialFilterExpression` — not a supported operator.**
   - The original partial index example used `{ status: { $ne: "fulfilled" } }`. MongoDB's documented allowed operators inside `partialFilterExpression` are: equality / `$eq`, `$exists`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$type`, `$and`, and `$or`. `$ne` (and `$nin`) are **not** allowed and the index creation would fail.
   - Replaced the filter expression with `{ status: { $in: ["pending", "processing", "shipped"] } }`, which expresses the same intent (index only active-workflow orders) using a supported operator. Subsequent example queries (`status: "pending"` and the no-status query) remain correct under the new partial filter — "pending" is in the `$in` set, and a query missing the `status` predicate still cannot use the partial index.
   - Added a brief note enumerating the allowed operators and explicitly calling out that `$ne`/`$nin` are not allowed.

## Review Notes

- The statement "MongoDB 4.2+ uses a background build process by default" is slightly imprecise — MongoDB 4.2+ replaced the old foreground/background distinction with an optimized hybrid index build that takes only short-lived locks. The author's framing is acceptable as casual shorthand, so I left it unchanged.
- For multikey compound indexes, the comment `// Error if both are arrays` is correct but worth noting: MongoDB does not reject the `createIndex` call itself — it fails at insert/update time when a document would actually require two parallel array index entries. Not changed because the comment is not technically wrong.
- The `winningPlan.stage` comment ("Should be IXSCAN for indexed queries") is a slight simplification: typical indexed find queries show a top-level `FETCH` stage with an `IXSCAN` child, while covered queries show `IXSCAN` at the top. Acceptable as guidance, not corrected.
- TTL indexes accept an array of dates as well (MongoDB uses the lowest date). The post's "field must contain a Date value" is accurate for the common case; not changed.
