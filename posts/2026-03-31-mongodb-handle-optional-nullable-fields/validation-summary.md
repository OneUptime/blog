# Validation Summary: How to Handle Optional/Nullable Fields in MongoDB Schemas

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (shell queries, aggregation framework, JSON Schema validation, indexes)
- JavaScript / Node.js (optional chaining, nullish coalescing)
- Python (dict access patterns)

## Sources Consulted
- MongoDB documentation on $jsonSchema and bsonType: https://www.mongodb.com/docs/manual/reference/operator/query/jsonSchema/
- MongoDB documentation on querying null fields: https://www.mongodb.com/docs/manual/tutorial/query-for-null-fields/
- MongoDB documentation on $type operator: https://www.mongodb.com/docs/manual/reference/operator/query/type/
- MongoDB documentation on $exists operator: https://www.mongodb.com/docs/manual/reference/operator/query/exists/
- MongoDB documentation on $ifNull aggregation operator: https://www.mongodb.com/docs/manual/reference/operator/aggregation/ifNull/
- MongoDB documentation on sparse indexes: https://www.mongodb.com/docs/manual/core/index-sparse/
- MongoDB documentation on partial indexes: https://www.mongodb.com/docs/manual/core/index-partial/
- MongoDB documentation on $set and $unset update operators: https://www.mongodb.com/docs/manual/reference/operator/update/unset/

## Issues Found
1. **Duplicate key in query object literal (line 65)**: The query `db.users.find({ phone: null, phone: { $exists: true } })` used duplicate `phone` keys in a single JavaScript object literal. In JavaScript, when an object has duplicate keys, the last one wins — so this effectively became `db.users.find({ phone: { $exists: true } })`, which matches all documents where `phone` exists regardless of value, not just those where `phone` is explicitly `null`. Fixed by replacing with `db.users.find({ phone: { $type: "null" } })`, which uses BSON type matching to find only documents where the field is present and its value is BSON null (type 10).

## Review Notes
- The Python defensive pattern `user.get("phone") or "No phone provided"` uses Python's `or` operator, which treats empty strings, `0`, and other falsy values as triggering the default. This differs from JavaScript's `??` (nullish coalescing), which only triggers on `null`/`undefined`. For a phone field expected to be a string or None this is fine in practice, but readers should be aware of the distinction.
- The `$jsonSchema` `oneOf` approach for nullable fields is correct but worth noting that `$jsonSchema` was deprecated in MongoDB 6.1 in favor of using the `$and`/`$or` query operators with `$type` checks directly. For MongoDB 5.x and 6.0 the example remains valid.
