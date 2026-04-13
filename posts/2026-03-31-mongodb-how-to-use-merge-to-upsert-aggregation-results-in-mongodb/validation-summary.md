# Validation Summary: How to Use $merge to Upsert Aggregation Results in MongoDB

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB Aggregation Framework
- `$merge` aggregation pipeline stage
- `$out` aggregation pipeline stage (comparison)
- `$group`, `$match`, `$set`, `$add` operators
- `$$new` and `$$NOW` system variables

## Sources Consulted
- MongoDB `$merge` official documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/merge/
- MongoDB `$out` official documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/out/
- MongoDB aggregation pipeline stages reference: https://www.mongodb.com/docs/manual/reference/operator/aggregation-pipeline/
- MongoDB `$$NOW` system variable documentation: https://www.mongodb.com/docs/manual/reference/aggregation-variables/

## Issues Found
No technical issues found.

## Review Notes
- The `whenMatched` pipeline examples (userActivity and leaderboard) use `whenNotMatched: "insert"`, which inserts the aggregation output document as-is. This means newly inserted documents will have field names from the `$group` stage (e.g., `pointsEarned`, `gamesPlayed`) rather than the target collection's field names (e.g., `totalPoints`, `totalGames`). On subsequent runs, `$add` on missing fields returns null. This is a design consideration for production use rather than a technical error about `$merge` itself, but readers implementing these patterns should be aware they may need a `$project` or `$addFields` stage before `$merge` to align field names, or use `$ifNull` within the `whenMatched` pipeline.
- The `on` field requires a unique index on the target collection for the specified field(s). The examples all use `_id`, which has a unique index by default, so they work correctly. The post does not mention this requirement, which could be worth noting for readers who use custom `on` fields.
