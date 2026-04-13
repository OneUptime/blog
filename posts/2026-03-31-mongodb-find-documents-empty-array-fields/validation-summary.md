# Validation Summary: How to Find Documents with Array Fields That Are Empty in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (query operators: `$in`, `$or`, `$size`, `$exists`, `$not`, `$type`, `$ifNull`, `$expr`)
- MongoDB Aggregation Framework
- PyMongo (Python MongoDB driver)

## Sources Consulted
- MongoDB official documentation: Query an Array (https://www.mongodb.com/docs/manual/tutorial/query-arrays/)
- MongoDB official documentation: $size query operator (https://www.mongodb.com/docs/manual/reference/operator/query/size/)
- MongoDB official documentation: $exists operator (https://www.mongodb.com/docs/manual/reference/operator/query/exists/)
- MongoDB official documentation: $in operator (https://www.mongodb.com/docs/manual/reference/operator/query/in/)
- MongoDB official documentation: $type aggregation operator (https://www.mongodb.com/docs/manual/reference/operator/aggregation/type/)
- MongoDB official documentation: $ifNull aggregation operator (https://www.mongodb.com/docs/manual/reference/operator/aggregation/ifNull/)
- MongoDB official documentation: Multikey Indexes (https://www.mongodb.com/docs/manual/core/index-multikey/)
- PyMongo documentation (https://pymongo.readthedocs.io/)

## Issues Found
No technical issues found.

## Review Notes
- The `$or` query example includes `{ tags: { $exists: false } }` alongside `{ tags: null }`, which is redundant since `{ tags: null }` already matches both explicit null values and missing fields in MongoDB. This is not wrong — the post frames it as being "for clarity" — but readers may benefit from knowing the redundancy.
- The non-empty array query `{ tags: { $exists: true, $not: { $size: 0 } } }` would also match documents where `tags` is `null` or a non-array type, since those are not arrays of size 0. In a well-typed schema where the field is always an array (or missing), this is correct as described. Worth noting for readers with heterogeneous field types.
- The aggregation pipeline example has all three conditions redundant with each other in certain combinations (the `$size`/`$ifNull` condition alone covers missing, null, and empty array cases), but the explicit enumeration is a reasonable teaching approach.
