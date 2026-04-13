# Validation Summary: How to Implement Full-Text Search with Weighted Fields in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (text indexes, `$text` operator, `$meta: "textScore"`, aggregation pipeline)
- Node.js (MongoDB driver for practical endpoint example)

## Sources Consulted
- MongoDB Manual: Text Indexes — https://www.mongodb.com/docs/manual/core/index-text/
- MongoDB Manual: `$text` Query Operator — https://www.mongodb.com/docs/manual/reference/operator/query/text/
- MongoDB Manual: `$meta` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/meta/
- MongoDB Manual: Text Search — https://www.mongodb.com/docs/manual/text-search/
- MongoDB Manual: Text Index Restrictions — https://www.mongodb.com/docs/manual/core/index-text/#restrictions

## Issues Found
1. **Inaccurate `$text` + `$or` limitation wording** (Limitations section): The original text read "Cannot combine $text with $or at the top level without $or wrapping $text", which is confusing and misleading. The actual MongoDB restriction is that `$text` must be a top-level query operator and cannot be nested inside `$or` or `$nor` expressions. You *can* combine `$text` with `$or` at the top level (e.g., `{ $text: { $search: "term" }, $or: [{ status: "A" }, { status: "B" }] }`). Changed to: "$text must be a top-level query operator - it cannot be nested inside $or or $nor".

## Review Notes
- The `explain()` output note (line 147) says `winningPlan.stage should be "TEXT"`. In MongoDB 5.0+ the explain structure nests this under `queryPlanner.winningPlan.queryPlan.stage`, but the stage name "TEXT" itself is correct. This is an acceptable simplification for a tutorial.
- The post correctly recommends Atlas Search for advanced use cases (fuzzy matching, faceted search, complex relevance tuning), which is good guidance.
- All code examples (mongosh and Node.js driver) use correct, current syntax.
- The wildcard text index syntax (`"$**": "text"`) is correct.
- The `default_language: "none"` option for multilingual content is correct.
