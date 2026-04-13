# Validation Summary: How to Find Top N Items Per Group in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB aggregation framework
- MongoDB `$sort`, `$group`, `$push`, `$project`, `$slice` stages
- MongoDB `$topN` accumulator (5.2+)
- MongoDB `$setWindowFields` and `$rank` (5.0+)
- MongoDB compound indexes
- Node.js MongoDB driver

## Sources Consulted
- MongoDB documentation: $topN accumulator — https://www.mongodb.com/docs/manual/reference/operator/aggregation/topN/
- MongoDB documentation: $setWindowFields — https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/
- MongoDB documentation: $rank window operator — https://www.mongodb.com/docs/manual/reference/operator/aggregation/rank/
- MongoDB documentation: $group stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/
- MongoDB documentation: $slice (aggregation) — https://www.mongodb.com/docs/manual/reference/operator/aggregation/slice/
- MongoDB release notes for 5.2 (new accumulators) — https://www.mongodb.com/docs/manual/release-notes/5.2/

## Issues Found
No technical issues found.

## Review Notes
- The `$topN` accumulator version claim of "MongoDB 5.2+" is accurate.
- The overview mentions `$firstN` as a related accumulator, which is correct — it was also introduced in 5.2 and can serve a similar purpose when the input is pre-sorted.
- Method 1 (sort-group-slice) correctly relies on the documented behavior that `$push` within `$group` preserves the order established by a preceding `$sort` stage.
- The `$setWindowFields` approach (Method 3) is available from MongoDB 5.0, though the post does not explicitly state the version requirement for this method. This is a minor omission but not an error.
- All code examples use the Node.js MongoDB driver syntax correctly.
