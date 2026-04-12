# Validation Summary: How to Query Documents Where All Array Elements Match a Condition in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (query operators: `$not`, `$elemMatch`, `$ne`, `$exists`, `$size`)
- MongoDB Aggregation Framework (`$addFields`, `$filter`, `$match`, `$project`, `$allElementsTrue`, `$map`, `$expr`)

## Sources Consulted
- MongoDB official documentation for `$not` operator: https://www.mongodb.com/docs/manual/reference/operator/query/not/
- MongoDB official documentation for `$elemMatch` query operator: https://www.mongodb.com/docs/manual/reference/operator/query/elemMatch/
- MongoDB official documentation for `$exists` operator: https://www.mongodb.com/docs/manual/reference/operator/query/exists/
- MongoDB official documentation for `$size` query operator: https://www.mongodb.com/docs/manual/reference/operator/query/size/
- MongoDB official documentation for `$filter` aggregation operator: https://www.mongodb.com/docs/manual/reference/operator/aggregation/filter/
- MongoDB official documentation for `$allElementsTrue`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/allElementsTrue/
- MongoDB official documentation for `cursor.explain()`: https://www.mongodb.com/docs/manual/reference/method/cursor.explain/
- MongoDB official documentation on index usage with negation operators: https://www.mongodb.com/docs/manual/reference/operator/query/ne/#performance

## Issues Found

1. **Contradictory inline comment (line 62)**: The comment said "Returns A001 only (A003 has empty array, also matches)" which is contradictory — it says "A001 only" but then acknowledges A003 also matches. Fixed to: "Returns A001 and A003 (A003 has empty array, which also matches)".

2. **Missing caveat about non-existent fields**: The `$not: { $elemMatch: ... }` pattern also matches documents where the queried field does not exist at all, not just documents with empty arrays. The MongoDB `$not` operator returns true when the field is missing. Added a note warning about this behavior and how to guard against it with `$exists: true`.

3. **Misleading index performance claim**: The post originally stated "The negation approach can use a multikey index to find candidates for exclusion." This is misleading — MongoDB's negation operators (`$not`, `$ne`, `$nin`) are well-documented as having poor index selectivity. While the query planner may technically choose an IXSCAN, the scan bounds are typically very broad, resulting in performance similar to a collection scan. Revised the paragraph to accurately describe this behavior.

## Review Notes
- The `$allElementsTrue` empty-array caveat is correctly noted in the post.
- The `"packages.0": { $exists: true }` technique for excluding empty arrays is correct and well-documented.
- All code examples use valid MongoDB syntax and would produce the described results.
- The aggregation pipeline using `$filter` + `$size: 0` is a correct and practical approach.
