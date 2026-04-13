# Validation Summary: How to Use Equality and Range Queries on Encrypted Fields in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Queryable Encryption
- MongoDB Node.js Driver
- BSON types (int, long, double, decimal, date)
- Encrypted field configuration (encryptedFieldsMap)

## Sources Consulted
- MongoDB Queryable Encryption documentation (https://www.mongodb.com/docs/manual/core/queryable-encryption/)
- MongoDB Queryable Encryption range query documentation (https://www.mongodb.com/docs/manual/core/queryable-encryption/qe-tutorials/range-query/)
- MongoDB comparison query operators reference (https://www.mongodb.com/docs/manual/reference/operator/query-comparison/)
- MongoDB CSFLE/QE driver specification on GitHub (https://github.com/mongodb/specifications/tree/master/source/client-side-encryption)
- MongoDB bsonType reference (https://www.mongodb.com/docs/manual/reference/operator/query/jsonSchema/#available-keywords)

## Issues Found
1. **`$between` operator does not exist**: The post claimed range queries support `$gt`, `$gte`, `$lt`, `$lte`, and `$between`. MongoDB has no `$between` operator. To query a range, you combine `$gte` and `$lte` (as the post itself correctly demonstrates in its code example). Removed `$between` from the supported operators list on line 43.

## Review Notes
- The `sparsity` and `trimFactor` parameters in the range configuration are correctly named. The values used (`sparsity: 1`, `trimFactor: 6`) are valid, though the defaults are `sparsity: 2` and `trimFactor: 6`. Readers should be aware that `sparsity: 1` produces denser indexing (better query performance, more storage) compared to the default.
- The metadata collection names (`enxcol_.patients.esc`, `enxcol_.patients.ecoc`) are correct for MongoDB 7.0+. Earlier versions (6.x) also created a third collection (`enxcol_.patients.ecc`), which was removed in 7.0.
- The claim that a field cannot be configured for both equality and range queries simultaneously is correct. However, fields configured with `queryType: "range"` can still handle equality lookups, since MongoDB implicitly converts equality queries to range bounds internally.
- Range queries on encrypted fields require MongoDB 8.0+. The post does not mention this version requirement, which could be worth noting in a future update.
- MongoDB 8.2 introduced additional query types (`prefix`, `suffix`, `substring`) in public preview, but these are not yet production-ready and their omission from this post is appropriate.
