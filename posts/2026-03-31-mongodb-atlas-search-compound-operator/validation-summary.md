# Validation Summary: How to Use the compound Operator with must, should, mustNot, and filter

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas Search
- MongoDB Aggregation Pipeline (`$search`, `$project`, `$sort`, `$limit`)
- Atlas Search `compound` operator (must, should, mustNot, filter clauses)
- Atlas Search `text`, `range`, and `equals` operators
- Atlas Search score modification (`boost`)

## Sources Consulted
- [compound Operator - MongoDB Docs](https://www.mongodb.com/docs/atlas/atlas-search/operators-collectors/compound/)
- [range Operator - MongoDB Docs](https://www.mongodb.com/docs/atlas/atlas-search/operators-collectors/range/)
- [equals Operator - MongoDB Docs](https://www.mongodb.com/docs/atlas/atlas-search/operators-collectors/equals/)
- [text Operator - MongoDB Docs](https://www.mongodb.com/docs/atlas/atlas-search/operators-collectors/text/)
- [Construct a Query Path - MongoDB Docs](https://www.mongodb.com/docs/atlas/atlas-search/path-construction/)
- [Score the Documents - MongoDB Docs](https://www.mongodb.com/docs/atlas/atlas-search/scoring/)
- [Modify the Score - MongoDB Docs](https://www.mongodb.com/docs/atlas/atlas-search/score/modify-score/)

## Issues Found
No technical issues found.

## Review Notes
- The `$sort: { score: -1 }` stages in the first and fourth examples are technically redundant since Atlas Search returns results sorted by relevance score (descending) by default. However, this is not incorrect — the explicit sort still works and can serve as documentation of intent, so no change was made.
- The `range` operator uses constant scoring by default (score of 1). The `score: { boost: { value: 2 } }` on the `range` in the `should` clause (fourth example) will boost that constant score of 1 to 2, which is valid and meaningful for boosting documents with high review scores.
