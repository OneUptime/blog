# Validation Summary: How to Implement Checksums for Critical Data in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (WiredTiger storage engine, Node.js driver, PyMongo)
- Node.js `crypto` module (SHA-256 hashing)
- Python `hashlib` and `json` modules
- JSON deterministic serialization for checksum computation

## Sources Consulted
- MongoDB Node.js Driver documentation: `Db.collection()` method, `Collection.find()` FindOptions (batchSize), `Collection.insertOne()`, `Collection.findOne()`
- MongoDB manual: WiredTiger storage engine checksums, `createIndex` with sparse option
- Node.js `crypto` module documentation: `createHash("sha256")`
- MDN `JSON.stringify` documentation: array replacer behavior for deterministic key ordering
- Python `hashlib` and `json.dumps(sort_keys=True)` documentation

## Issues Found
1. **Node.js driver syntax vs MongoDB shell syntax**: Three lines used `db.transactions` and `db.integrityViolations` shorthand to access collections, which is MongoDB shell (mongosh) syntax. The Node.js driver requires `db.collection("name")`. The batch audit function in the same post already used the correct `db.collection(collectionName)` syntax, making this an inconsistency. Fixed all three occurrences:
   - `db.transactions.insertOne(...)` -> `db.collection("transactions").insertOne(...)`
   - `db.transactions.findOne(...)` -> `db.collection("transactions").findOne(...)`
   - `db.integrityViolations.insertOne(...)` -> `db.collection("integrityViolations").insertOne(...)`

## Review Notes
- The Node.js and Python implementations use different field naming conventions (camelCase vs snake_case) in the checksum payload keys, which means checksums are not cross-compatible between the two languages. This is acceptable since the post presents them as independent implementations, but readers building polyglot systems should be aware.
- The sparse index is described as supporting "bulk audits," but the batch audit function performs a full collection scan (`find({})`), which does not benefit from the index. The sparse index would be useful for point lookups by checksum value or for reducing index size when not all documents have a checksum field.
- The `ObjectId` import is not shown in the Node.js snippet (`new ObjectId()` on line 40). Readers would need `const { ObjectId } = require("mongodb");`. This is a minor omission typical of illustrative code snippets.
