# Validation Summary: How to Query Documents by Regular Expression in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (query engine, regex support, indexing)
- mongosh (MongoDB Shell)
- PCRE-style regular expressions
- MongoDB collation indexes
- MongoDB text indexes

## Sources Consulted
- MongoDB $regex operator documentation: https://www.mongodb.com/docs/manual/reference/operator/query/regex/
- MongoDB collation documentation: https://www.mongodb.com/docs/manual/reference/collation/
- MongoDB db.collection.find() documentation: https://www.mongodb.com/docs/manual/reference/method/db.collection.find/
- MongoDB text indexes documentation: https://www.mongodb.com/docs/manual/core/index-text/

## Issues Found

### 1. Incorrect use of regex with collation index (Section: "Case-Insensitive Queries with Collation Index")
- **What was wrong:** The section showed a regex query (`/^john/`) combined with a collation option (`strength: 2`), implying this would perform a case-insensitive regex match using the collation index. However, MongoDB's `$regex` operator is **not collation-aware** — collation settings are silently ignored for regex operations. The official docs explicitly state: "the $regex operator is not collation-aware and therefore cannot take advantage of [case-insensitive] indexes."
- **What was changed:** Rewrote the section to clarify that `$regex` does not support collation. Changed the example to show a case-insensitive equality match (which does benefit from collation indexes). Added a note that case-insensitive regex requires the `i` flag, which won't use standard indexes efficiently.
- **Why:** The original example would not behave as described — the regex would remain case-sensitive despite the collation setting, misleading readers into thinking their query was case-insensitive when it was not.

## Review Notes
- All other code examples (inline regex, `$regex` operator, pattern examples, index behavior, `$text` search) are technically correct.
- The `$regex` options (`i`, `m`, `x`, `s`) are accurately documented.
- The index behavior explanation (anchored `^` prefix uses IXSCAN, unanchored causes COLLSCAN) is correct.
- The email regex pattern uses proper double-escaping for the string form passed to `$regex`.
