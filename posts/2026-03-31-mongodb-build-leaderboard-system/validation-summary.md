# Validation Summary: How to Build a Leaderboard System with MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (document model, update operators, aggregation pipeline)
- MongoDB Node.js Driver (collection methods: `updateOne`, `find`, `findOne`, `countDocuments`, `aggregate`, `createIndex`)
- MongoDB update operators (`$max`, `$set`, `$setOnInsert`)
- MongoDB aggregation stages (`$match`, `$group`, `$sort`, `$limit`)
- MongoDB pipeline updates (MongoDB 4.2+)
- JavaScript (ISO week calculation, async/await)

## Sources Consulted
- MongoDB documentation on `$max` update operator: https://www.mongodb.com/docs/manual/reference/operator/update/max/
- MongoDB documentation on `$set` update operator: https://www.mongodb.com/docs/manual/reference/operator/update/set/
- MongoDB documentation on `$setOnInsert`: https://www.mongodb.com/docs/manual/reference/operator/update/setOnInsert/
- MongoDB documentation on `updateOne` with aggregation pipeline: https://www.mongodb.com/docs/manual/reference/method/db.collection.updateOne/#update-with-aggregation-pipeline
- MongoDB documentation on `countDocuments`: https://www.mongodb.com/docs/manual/reference/method/db.collection.countDocuments/
- MongoDB documentation on `createIndex`: https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB aggregation pipeline operators (`$max`, `$first`, `$floor`, `$divide`, `$cond`, `$ifNull`): https://www.mongodb.com/docs/manual/reference/operator/aggregation/
- ISO 8601 week date definition: https://en.wikipedia.org/wiki/ISO_week_date

## Issues Found

### 1. Bug: `$set` corrupts `level` and `achievedAt` when a lower score is submitted
- **What was wrong:** The original `submitScore` function used `$max` to keep only the highest score, but placed `level: Math.floor(score / 1000)` and `achievedAt: now` in a `$set` operator. Since `$max` and `$set` are evaluated independently, when a lower score was submitted, `$max` correctly preserved the higher stored score, but `$set` still overwrote `level` with a value derived from the lower input score and updated `achievedAt` to the current time. For example, if a user had a stored score of 12500 (level 12) and submitted 500, the score would stay 12500 but level would be set to 0.
- **What was changed:** Replaced the traditional update document (`$max`/`$set`/`$setOnInsert`) with a pipeline update (MongoDB 4.2+). The pipeline uses `$max` as an aggregation expression to compute the best score, then derives `level` and `achievedAt` from the actual best score using `$cond` and `$floor`. Uses `$ifNull` to handle insert-on-upsert semantics (replacing `$setOnInsert`).
- **Why:** Pipeline updates allow referencing the current document's field values in expressions, making it possible to conditionally update fields based on whether the score actually improved.

### 2. Incorrect ISO week number in sample data and comment
- **What was wrong:** The sample score document showed `period: "2026-W13"` for `achievedAt: ISODate("2026-03-31")`, and the `submitScore` comment said `// "2026-W13"`. March 31, 2026 is a Tuesday that falls in ISO week 14, not week 13 (W14 runs March 30–April 5, 2026).
- **What was changed:** Updated both occurrences from "2026-W13" to "2026-W14".
- **Why:** The `getISOWeek` function in the post correctly computes W14 for this date, so the sample data and comment were inconsistent with the code.

## Review Notes
- The `getISOWeek` function implements the standard ISO 8601 week number algorithm correctly. Verified by tracing through the computation for March 31, 2026 (result: W14).
- The rank calculation via `countDocuments` with `$gt` gives a "dense rank" where tied scores share the same rank. This is a valid design choice for leaderboards.
- The `getSurroundingPlayers` function does not guard against `getPlayerRank` returning `null` (when the player doesn't exist). This is a minor robustness concern but acceptable for a tutorial.
- The `getAllTimeLeaderboard` aggregation uses `$first` for `username` without a preceding `$sort`, so the username is taken from an arbitrary document in the group. This is fine since all documents in a group belong to the same user, but if usernames can change, it could return a stale value.
- The pipeline update approach requires MongoDB 4.2+, which has been generally available since August 2019 and is the standard in modern deployments.
