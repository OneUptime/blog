# Validation Summary: How to Use $meta to Project Text Search Scores in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (text search, `$meta` operator, `$text` queries)
- MongoDB Aggregation Pipeline (`$match`, `$project`, `$addFields`, `$sort`, `$limit`)
- MongoDB Text Indexes (compound text indexes, weighted fields)

## Sources Consulted
- MongoDB Manual — $meta (projection): https://www.mongodb.com/docs/manual/reference/operator/projection/meta/
- MongoDB Manual — $meta (aggregation): https://www.mongodb.com/docs/manual/reference/operator/aggregation/meta/
- MongoDB Manual — $text operator: https://www.mongodb.com/docs/manual/reference/operator/query/text/
- MongoDB Manual — Text Search in Aggregation Pipeline: https://www.mongodb.com/docs/manual/tutorial/text-search-in-aggregation/
- MongoDB Manual — $sort (aggregation): https://www.mongodb.com/docs/manual/reference/operator/aggregation/sort/

## Issues Found
- **Incorrect claim about sorting requirements (line 65):** The post stated "Always include the `$meta` projection when sorting by `textScore`, as MongoDB requires the projected field name to match the sort field name." This was accurate for MongoDB 4.2 and earlier but is incorrect for MongoDB 4.4+. Starting with MongoDB 4.4, you can sort by `{ $meta: "textScore" }` without projecting it, and the projection and sort field names do not need to match. Updated the statement to reflect modern MongoDB behavior.

## Review Notes
- The example text score values (1.5, 0.75, 0.5) in the sample output are illustrative and may not match actual MongoDB output for the given data, but this is acceptable for a tutorial.
- The aggregation pipeline example uses `{ $sort: { relevance: -1 } }` after projecting the textScore into a `relevance` field via `$project`. While the more common documented pattern uses `{ $meta: "textScore" }` directly in the `$sort` stage, this approach is valid because `$project` materializes the score as a regular numeric field that can be sorted normally.
- The post does not specify a MongoDB version. Given that MongoDB 4.4+ changed textScore sorting behavior significantly, the corrected text now references this version boundary.
