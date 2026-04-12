# Validation Summary: How to Serialize and Deserialize MongoDB Documents in Node.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Node.js driver (v6.x)
- bson package (BSON serialization/deserialization)
- EJSON (Extended JSON)
- BSON types: ObjectId, Decimal128, Binary, Long
- Node.js

## Sources Consulted
- MongoDB Node.js Driver documentation: https://www.mongodb.com/docs/drivers/node/current/
- MongoDB Node.js Driver collection access API: https://www.mongodb.com/docs/drivers/node/current/usage-examples/findOne/
- bson package (js-bson) GitHub repository: https://github.com/mongodb/js-bson
- EJSON documentation: https://www.mongodb.com/docs/drivers/node/current/fundamentals/bson/ejson/
- BSON types reference: https://www.mongodb.com/docs/manual/reference/bson-types/

## Issues Found

### 1. Incorrect collection access syntax (5 occurrences)
- **What was wrong:** The post used `db.products.insertOne()`, `db.products.findOne()`, `db.files.insertOne()`, and `db.files.findOne()` — this is MongoDB shell (mongosh) syntax, not the Node.js driver API.
- **What was changed:** Replaced all instances with the correct `db.collection("products").method()` and `db.collection("files").method()` syntax.
- **Why:** The MongoDB Node.js driver requires calling `db.collection("name")` to get a collection reference. The dot-notation shorthand (`db.collectionName`) only works in the MongoDB shell and would result in `undefined` method errors in Node.js.

### 2. Incorrect JSON.stringify output comment
- **What was wrong:** The post claimed that `JSON.stringify` on a document with ObjectId and Decimal128 produces `{"_id":{},"price":{}}`, stating these types "serialize as `{}`".
- **What was changed:** Corrected the expected output to `{"_id":"507f1f77bcf86cd799439011","createdAt":"2026-03-31T...","price":{"$numberDecimal":"99.99"}}` and updated the explanation to note that ObjectId becomes a plain string (indistinguishable from other strings) and Decimal128 becomes a non-standard nested object.
- **Why:** In the bson package (v4+), `ObjectId` has a `toJSON()` method that returns the hex string, and `Decimal128` has a `toJSON()` method that returns `{ $numberDecimal: "..." }`. Neither serializes as `{}`. The original point about losing type information is still valid, but the specific output was incorrect.

## Review Notes
- The BSON type mapping table lists `number (integer safe) -> Int32 or Int64`. In practice, plain JavaScript numbers that are integers within Int32 range serialize as Int32, while numbers outside that range serialize as Double. To get Int64, you must use the `Long` class explicitly. The table already lists `Long -> Int64` separately, so this is not critically misleading but could be more precise.
- The post imports `Decimal128` from `require("bson")` while importing `ObjectId` from `require("mongodb")`. Both are valid since the mongodb driver re-exports bson types, but readers may find it cleaner to import both from the same package.
- The `EJSON.stringify(doc, null, 2, { relaxed: true })` call is correct — the options object can be passed as the 4th parameter.
