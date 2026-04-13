# Validation Summary: How to Perform Full-Text Search with $text in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (text indexes, `$text` operator, `$meta` textScore)
- MongoDB Shell (mongosh)
- MongoDB Node.js Driver

## Sources Consulted
- MongoDB official documentation: `$text` query operator — https://www.mongodb.com/docs/manual/reference/operator/query/text/
- MongoDB official documentation: Text Indexes — https://www.mongodb.com/docs/manual/core/indexes/index-types/index-text/
- MongoDB official documentation: `$meta` expression — https://www.mongodb.com/docs/manual/reference/operator/aggregation/meta/
- MongoDB official documentation: Text Search Languages — https://www.mongodb.com/docs/manual/reference/text-search-languages/

## Issues Found

1. **Incorrect OR/AND semantics in comment (line 41):** The comment for the space-separated search example said "(both words, either order)", implying AND semantics. MongoDB's `$text` with space-separated terms performs a logical OR — it matches documents containing "full" OR "text" (or both). Changed to "(logical OR of terms)".

2. **Inaccurate $or limitation (line 129):** The post stated that `$text` cannot be used in `$or` expressions "unless all other clauses also use text indexes." The actual MongoDB requirement is that all clauses in the `$or` array must be supported by an index (any index, not specifically text indexes). Corrected to "unless all clauses in the `$or` array are indexed."

## Review Notes
- The practical example at the end mixes mongo shell syntax (`db.posts.createIndex(...)`) with Node.js driver syntax (`db.collection("posts").find(...)`). This is common in tutorials and not technically wrong, but readers should note the two different contexts.
- The `$text` operator and text indexes are a stable, long-standing MongoDB feature. However, MongoDB Atlas Search (based on Lucene) offers significantly more powerful full-text search capabilities. The post could benefit from a note mentioning Atlas Search as an alternative for more advanced use cases, but this is not a correctness issue.
