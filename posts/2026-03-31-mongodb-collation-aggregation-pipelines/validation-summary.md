# Validation Summary: How to Use Collation with Aggregation Pipelines in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (aggregation framework, collation)
- ICU collation (locale-aware string comparison)

## Sources Consulted
- MongoDB documentation on Collation: https://www.mongodb.com/docs/manual/reference/collation/
- MongoDB documentation on `db.collection.aggregate()`: https://www.mongodb.com/docs/manual/reference/method/db.collection.aggregate/
- MongoDB documentation on Collation and Index Use: https://www.mongodb.com/docs/manual/reference/collation/#collation-and-index-use
- MongoDB documentation on `$lookup`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/
- ICU Collation documentation (collation strength levels): https://unicode-org.github.io/icu/userguide/collation/concepts.html
- Royal Spanish Academy (RAE) 1994 reform on Spanish alphabet ordering

## Issues Found
- **Spanish sorting claim was incorrect.** The post stated that the `es` locale treats `ch` and `ll` as single characters in traditional ordering. This is wrong for the default `es` locale in MongoDB, which uses ICU collation following the modern Royal Spanish Academy rules (post-1994 reform). In modern Spanish, `ch` and `ll` are digraphs sorted as two separate letters (`c`+`h` and `l`+`l`), not as single characters. MongoDB does not expose ICU's `@collation=traditional` locale keyword to enable the pre-1994 behavior. Rewrote the section to focus on the correct and useful behavior of Spanish collation: proper ordering of `ñ` between `n` and `o`.

## Review Notes
- The `$lookup` with collation section claims that the aggregation-level collation applies to `$lookup` equality join conditions. While this is consistent with MongoDB's documentation that the collation applies to the aggregation operation as a whole, the behavior with `$lookup` joins specifically can be nuanced. This is worth testing in practice if relied upon for production use.
- The `$group` with collation behavior is correctly described: case-insensitive grouping at strength 2 merges differently-cased keys into one group. Note that the resulting `_id` value will be whichever casing was encountered first, which may not be deterministic.
- All code examples use correct MongoDB syntax and valid collation options.
