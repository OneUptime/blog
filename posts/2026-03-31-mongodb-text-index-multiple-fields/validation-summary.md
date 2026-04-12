# Validation Summary: How to Create a Text Index on Multiple Fields in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (text indexes, full-text search)
- MongoDB Shell (mongosh) JavaScript syntax
- MongoDB Aggregation Framework

## Sources Consulted
- MongoDB Manual: Text Indexes — https://www.mongodb.com/docs/manual/core/index-text/
- MongoDB Manual: `$text` Query Operator — https://www.mongodb.com/docs/manual/reference/operator/query/text/
- MongoDB Manual: `$meta` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/meta/
- MongoDB Manual: `createIndex()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB Manual: Text Index Options (`language_override`, `default_language`, `weights`) — https://www.mongodb.com/docs/manual/core/index-text/#index-options

## Issues Found

1. **`language_override` placed in index key spec instead of options object (line 147-149)**
   - **What was wrong:** The per-document language override example placed `language_override: "lang"` inside the first argument (index key specification) of `createIndex()`. This is incorrect — `language_override` is an index option that belongs in the second argument (options object).
   - **What was changed:** Moved `language_override: "lang"` to the options object (second argument), matching the documented `createIndex()` signature.
   - **Why:** MongoDB's `createIndex()` expects `language_override` as an option, not as a field in the key spec. Placing it in the key spec would either cause an error or silently try to index a field literally named `language_override`.

2. **Inaccurate sorting limitation (line 156)**
   - **What was wrong:** The limitations section stated "Text indexes do not support $sort by other fields alongside $meta: textScore sort". This is incorrect — MongoDB does support sorting by textScore and other fields together in the same sort specification, e.g., `.sort({ score: { $meta: "textScore" }, date: -1 })`.
   - **What was changed:** Replaced the incorrect claim with an accurate limitation: "$text queries cannot use hint() to force a particular index".
   - **Why:** The original statement would mislead readers into thinking secondary sort keys cannot be combined with textScore sorting. The `hint()` restriction is a real and documented limitation of `$text` queries.

## Review Notes
- The aggregation example sorts by `{ score: -1 }` after projecting `score: { $meta: "textScore" }`. This works because `$project` materializes the textScore into a regular numeric field, but using `{ score: { $meta: "textScore" } }` directly in `$sort` is the more conventional pattern. Both approaches are correct.
- The post correctly notes "one text index per collection" — this remains true in MongoDB 7.x and earlier. Atlas Search (mentioned at the end) removes this limitation.
- All code examples use valid mongosh syntax and current, non-deprecated APIs.
