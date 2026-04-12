# Validation Summary: How to Rank Documents in MongoDB Aggregation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (5.0+)
- MongoDB Aggregation Framework (`$setWindowFields`)
- Ranking window operators: `$rank`, `$denseRank`, `$documentNumber`
- `$count` accumulator in window context

## Sources Consulted
- MongoDB official docs: `$setWindowFields` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/
- MongoDB official docs: `$rank` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/rank/
- MongoDB official docs: `$denseRank` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/denseRank/
- MongoDB official docs: `$documentNumber` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/documentNumber/
- MongoDB official docs: `$count` accumulator — https://www.mongodb.com/docs/manual/reference/operator/aggregation/count-accumulator/
- MongoDB official docs: `db.collection.aggregate()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.aggregate/

## Issues Found
No technical issues found.

## Review Notes
- The expected output in the "Basic Rank Example" shows Alice before Carol (both have score 950). Since `$documentNumber` assigns sequential numbers based on processing order, the order between tied documents is non-deterministic — Carol could appear before Alice in practice. The output shown is one valid possibility, and the post does not claim a guaranteed order between ties, so this is acceptable.
- The `$rank` operator (and likely `$denseRank` and `$documentNumber`) restricts `sortBy` to a single field. All examples in the post use single-field sorts, so this is not an issue, but worth noting for readers who may try multi-field sorts with these operators.
- The percentile rank formula `rowNum / totalCount` is a simplified approach. Different statistical definitions of percentile rank exist (e.g., `(rank - 1) / (N - 1)`), but the post labels it "Percentile Rank Equivalent" which is an appropriate qualifier.
- The `allowDiskUse: true` tip is correct. Starting in MongoDB 6.0, `allowDiskUseByDefault` server parameter defaults to true, so this option is most relevant for MongoDB 5.x deployments.
