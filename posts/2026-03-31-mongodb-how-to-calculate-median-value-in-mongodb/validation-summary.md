# Validation Summary: How to Calculate Median Value in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB aggregation pipeline
- MongoDB `$group`, `$sort`, `$project`, `$let`, `$cond`, `$arrayElemAt` operators
- MongoDB 7.0+ `$median` and `$percentile` accumulator operators

## Sources Consulted
- [MongoDB $percentile operator documentation (v7.0)](https://www.mongodb.com/docs/v7.0/reference/operator/aggregation/percentile/)
- [MongoDB $median operator documentation (v7.0)](https://www.mongodb.com/docs/v7.0/reference/operator/aggregation/median/)
- [MongoDB $percentile operator documentation (latest)](https://www.mongodb.com/docs/manual/reference/operator/aggregation/percentile/)
- [MongoDB $median operator documentation (latest)](https://www.mongodb.com/docs/manual/reference/operator/aggregation/median/)
- [MongoDB $avg operator documentation](https://www.mongodb.com/docs/manual/reference/operator/aggregation/avg/)
- [Query Enhancements in MongoDB 7.0 - MongoDB Blog](https://www.mongodb.com/blog/post/query-enhancement-mongodb-7-0)

## Issues Found
- **Incorrect `method: "exact"` for `$percentile`**: The post claimed that `method: "exact"` can be used with `$percentile` for exact results. According to MongoDB documentation, only `method: "approximate"` is supported (using the t-digest algorithm). There is no `"exact"` method available. Fixed the code example to use `method: "approximate"` and rewrote the surrounding text to describe `$percentile` as an alternative to `$median` that can return multiple percentiles at once, and noted that it returns an array.

## Review Notes
- The `$percentile` operator returns an array (e.g., `[value]`) while `$median` returns a scalar. The post now mentions this distinction.
- The pre-7.0 aggregation approach using `$sort` + `$group` with `$push` + `$project` with `$let`/`$cond` is correct. The `$sort` before `$group` preserves order in `$push`, and `$avg` in `$project` correctly accepts an array of expressions (available since MongoDB 3.2).
- The median calculation logic correctly handles both even and odd counts.
- For very large collections, the approach of pushing all values into a single array could hit MongoDB's 16MB document size limit. The post mentions `$sample` as an alternative and indexing for performance, which is appropriate advice.
