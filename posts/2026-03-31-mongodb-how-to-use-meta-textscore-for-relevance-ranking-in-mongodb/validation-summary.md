# Validation Summary: How to Use $meta textScore for Relevance Ranking in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (full-text search, `$text` operator, `$meta` expression)
- MongoDB Aggregation Framework (`$match`, `$addFields`, `$sort`, `$project`)
- MongoDB Node.js Driver (`mongodb` npm package)
- MongoDB Text Indexes (compound text indexes, custom field weights)

## Sources Consulted
- MongoDB Manual: $meta — https://www.mongodb.com/docs/manual/reference/operator/aggregation/meta/
- MongoDB Manual: $text — https://www.mongodb.com/docs/manual/reference/operator/query/text/
- MongoDB Manual: Text Indexes — https://www.mongodb.com/docs/manual/core/indexes/index-types/index-text/
- MongoDB Manual: Text Search — https://www.mongodb.com/docs/manual/text-search/
- MongoDB Manual: Control Search Results with Weights — https://www.mongodb.com/docs/manual/tutorial/control-results-of-text-search/
- MongoDB Node.js Driver Documentation — https://www.mongodb.com/docs/drivers/node/current/

## Issues Found
- **Inaccurate caveat about textScore without $text query**: The original text stated "If no text score is available (e.g., no `$text` match), the field value defaults to 0." This is inaccurate. In MongoDB 4.4+, using `$meta: "textScore"` without a `$text` query returns a value "without meaning" (not specifically 0). In versions prior to 4.4, it would produce an error rather than defaulting to any value. Fixed the caveat to accurately describe the version-dependent behavior.

## Review Notes
- All code examples (mongo shell and Node.js driver) are syntactically correct and use current, non-deprecated APIs.
- The text index creation syntax, `$meta: "textScore"` projection, sort usage, and aggregation pipeline examples are all accurate.
- The explanation of text score calculation factors (term frequency, field weight, field length normalization) is correct.
- The Node.js driver example correctly uses the options-based `find()` signature with a `projection` property.
- The statement that sort "does not need to match the projected field name" is accurate for MongoDB 4.4+. In older versions, the sort field name had to match the projection field name. This is a minor version-specific nuance that could be noted in a future update.
- The aggregation pipeline correctly uses `$sort: { score: -1 }` (sorting by the added field value) rather than re-using `$meta` in the sort stage, which is the proper approach.
