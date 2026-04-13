# Validation Summary: How to Create a Text Index for Full-Text Search in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (text indexes, full-text search)
- MongoDB Shell (mongosh) commands
- MongoDB `$text` query operator
- MongoDB `$meta` operator (`textScore`)

## Sources Consulted
- MongoDB Manual — Text Indexes: https://www.mongodb.com/docs/manual/core/indexes/index-types/index-text/
- MongoDB Manual — $text query operator: https://www.mongodb.com/docs/manual/reference/operator/query/text/
- MongoDB Manual — $meta (textScore): https://www.mongodb.com/docs/manual/reference/operator/aggregation/meta/
- MongoDB Manual — Text Index Versions: https://www.mongodb.com/docs/manual/core/indexes/index-types/index-text/specify-text-index-version/
- MongoDB Manual — Wildcard Text Indexes: https://www.mongodb.com/docs/manual/core/indexes/index-types/index-text/create-wildcard-text-index/

## Issues Found
1. **Diacritic sensitivity default was incorrect** (Limitations section): The post stated "diacritic sensitive by default." This is wrong — text index version 3 (the default since MongoDB 3.2) is diacritic **insensitive** by default. The `$diacriticSensitive` option defaults to `false`. Changed "diacritic sensitive by default" to "diacritic insensitive by default."

## Review Notes
- The limitation "$text queries cannot use other index types in the same query" is a simplification. More precisely, MongoDB does not support index intersection with text indexes, and `$text` cannot be combined with `$near` or appear in `$nor`. However, compound text indexes with prefix equality keys are supported. The statement is acceptable for a tutorial-level overview.
- The post correctly notes that only one text index per collection is allowed, which is an important constraint.
- All code examples use correct and current MongoDB syntax.
- The `$meta: "textScore"` projection and sort pattern is correct.
- The weighted index example correctly demonstrates the `weights` option syntax and semantics.
