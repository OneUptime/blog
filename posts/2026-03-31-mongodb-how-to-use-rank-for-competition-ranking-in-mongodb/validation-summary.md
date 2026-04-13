# Validation Summary: How to Use $rank for Competition Ranking in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB 5.0+ aggregation framework
- `$setWindowFields` stage
- `$rank` window operator
- `$denseRank` window operator (comparison)
- `$count` window operator
- `$group`, `$match`, `$addFields`, `$let`, `$filter`, `$arrayElemAt` aggregation operators

## Sources Consulted
- MongoDB official documentation: `$rank` window operator — https://www.mongodb.com/docs/manual/reference/operator/aggregation/rank/
- MongoDB official documentation: `$setWindowFields` stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/
- MongoDB official documentation: `$denseRank` window operator — https://www.mongodb.com/docs/manual/reference/operator/aggregation/denseRank/
- MongoDB official documentation: `$count` (aggregation accumulator) — https://www.mongodb.com/docs/manual/reference/operator/aggregation/count-accumulator/

## Issues Found
No technical issues found.

## Review Notes
- The percentile formula in Example 6 computes `(totalPlayers - rank) / totalPlayers * 100`, which gives the percentage of players ranked below. This is one of several valid percentile formulations, and is correct as used here.
- Example 3 (Top N per Partition) correctly uses `$match` with `$lte: 3` after `$rank`. Readers should be aware that with ties at rank 3, this could return more than 3 documents per partition — this is expected behavior with competition ranking.
- Example 4 references a `wins` field not present in the setup dataset, but the comment clearly indicates this is a different scenario showing the multi-key sort pattern.
- All code examples use correct MongoDB aggregation syntax and would execute successfully on MongoDB 5.0+.
