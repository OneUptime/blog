# Validation Summary: How to Store and Query String Values in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (BSON string type, queries, aggregation, schema validation)
- JavaScript / mongosh (MongoDB Shell)
- BSON specification (type 2 / string)
- MongoDB Collation (locale-aware string comparison)
- MongoDB Text Indexes (full-text search)
- MongoDB JSON Schema Validation

## Sources Consulted
- MongoDB BSON Types documentation: https://www.mongodb.com/docs/manual/reference/bson-types/
- MongoDB $regex operator: https://www.mongodb.com/docs/manual/reference/operator/query/regex/
- MongoDB Collation documentation: https://www.mongodb.com/docs/manual/reference/collation/
- MongoDB Text Indexes: https://www.mongodb.com/docs/manual/core/indexes/index-types/index-text/
- MongoDB $text operator: https://www.mongodb.com/docs/manual/reference/operator/query/text/
- MongoDB Aggregation String Operators ($toUpper, $toLower, $strLenCP, $trim, $split): https://www.mongodb.com/docs/manual/reference/operator/aggregation/#string-expression-operators
- MongoDB Schema Validation ($jsonSchema): https://www.mongodb.com/docs/manual/core/schema-validation/
- MongoDB updateMany with aggregation pipeline: https://www.mongodb.com/docs/manual/reference/method/db.collection.updateMany/

## Issues Found
1. **Text index described as "substring search"** - The post described text indexes as being for "substring search at scale" in the code comment and "full-text substring search" in the summary. Text indexes perform word-based tokenized search, not arbitrary substring search. For example, `$text: { $search: "Smi" }` would NOT match a document containing "Smith". Changed "For substring search at scale" to "For word-based search at scale" in the code comment, and "full-text substring search" to "full-text word search" in the summary.

## Review Notes
- The collation sort example comment (`// Result: a, A, b, B, z, Z`) implies a deterministic lowercase-before-uppercase ordering within equivalence classes at strength 2. In practice, characters considered equal at strength 2 have undefined relative ordering, so the exact interleaving may vary. The main point (that same letters group together regardless of case) is correct, but the specific ordering shown is not guaranteed.
- All aggregation operators used ($toUpper, $toLower, $strLenCP, $trim, $split, $arrayElemAt) are current and non-deprecated.
- The aggregation pipeline syntax in updateMany (using array as second argument) requires MongoDB 4.2+. This is not noted in the post but is unlikely to be an issue for modern deployments.
- $trim, $ltrim, $rtrim were introduced in MongoDB 4.0 and are current.
