# Validation Summary: How to Use the near Operator for Date and Number Proximity in Atlas Search

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas Search
- MongoDB Aggregation Pipeline (`$search`, `$project`, `$sort`, `$limit`)
- Atlas Search `near` operator (numeric and date proximity)
- Atlas Search `compound` operator (`must`, `should`, `filter` clauses)
- Atlas Search `range` operator
- Atlas Search `text` operator
- Atlas Search index mappings

## Sources Consulted
- MongoDB Atlas Search `near` operator documentation: https://www.mongodb.com/docs/atlas/atlas-search/near/
- MongoDB Atlas Search `compound` operator documentation: https://www.mongodb.com/docs/atlas/atlas-search/compound/
- MongoDB Atlas Search scoring documentation: https://www.mongodb.com/docs/atlas/atlas-search/scoring/
- MongoDB Atlas Search index definition documentation: https://www.mongodb.com/docs/atlas/atlas-search/define-field-mappings/

## Issues Found
1. **Intro paragraph used "pivot" instead of "origin"**: The opening sentence said documents are scored by proximity to "a specified pivot." In Atlas Search, `origin` is the target value and `pivot` controls the decay rate (the distance at which the score drops to half). Using "pivot" here was technically incorrect and could confuse readers who would conflate it with the `pivot` parameter. Changed to "a specified origin."

## Review Notes
- The scoring formula explanation (score drops to half at pivot distance) is correct: `score = pivot / (pivot + distance)`.
- Millisecond calculations for date pivots are all correct: 30 days = 2,592,000,000 ms, 90 days = 7,776,000,000 ms, 7 days = 604,800,000 ms.
- The `score: { boost: { value: 1.5 } }` modifier inside `near` is valid Atlas Search syntax.
- The `compound` query combining `filter` (range) with `should` (near) and no `must` clause is valid — `filter` excludes non-matching documents without affecting score, while `should` provides scoring.
- Index mapping types (`number` for numeric fields, `date` for date fields) are correct for Atlas Search.
- The explicit `$sort: { score: -1 }` after `$project` is technically redundant since `$search` returns results in score order, but it's a reasonable defensive practice and not incorrect.
