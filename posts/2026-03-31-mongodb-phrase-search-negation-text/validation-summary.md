# Validation Summary: How to Use Phrase Search and Negation with $text in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB `$text` operator
- MongoDB text indexes
- MongoDB full-text search (phrase search, negation, textScore)
- `$caseSensitive` and `$diacriticSensitive` options

## Sources Consulted
- MongoDB official documentation for `$text` operator: https://www.mongodb.com/docs/manual/reference/operator/query/text/
- MongoDB official documentation on text indexes: https://www.mongodb.com/docs/manual/core/index-text/
- MongoDB official documentation on text search: https://www.mongodb.com/docs/manual/text-search/

## Issues Found
1. **Inaccurate description of how phrases and keywords combine** (line 57): The post stated that the query `"\"sharded cluster\" performance -atlas"` translates to "documents that contain the phrase 'sharded cluster' **and** the word 'performance', but do not contain the word 'atlas'." This is incorrect. According to MongoDB documentation, when a `$search` string includes both a phrase and individual terms, the phrase is required (AND'd), but individual terms are OR'd together. The word "performance" is **not** required as a filter — it only affects the `textScore` relevance ranking. Fixed the description to clarify that "performance" boosts relevance but is not a required match.

## Review Notes
- All code examples use correct MongoDB syntax and would work as shown.
- The text index creation, phrase search escaping, negation syntax, `textScore` projection/sort, and `$caseSensitive`/`$diacriticSensitive` options are all accurate.
- The limitations section correctly notes that negation-only queries error, only one `$text` expression is allowed per query, and stop words are removed from phrases.
- The stop words claim that `"in the cluster"` becomes a match for just "cluster" is correct — "in" and "the" are stop words removed during text indexing.
