# Validation Summary: How to Use MongoDB for Financial Applications

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (multi-document ACID transactions, aggregation framework)
- MongoDB Node.js Driver (Decimal128, MongoClient sessions)
- MongoDB JSON Schema Validation ($jsonSchema, collMod)
- Decimal128 (IEEE 754 128-bit decimal floating-point)

## Sources Consulted
- MongoDB Manual — Decimal128: https://www.mongodb.com/docs/manual/reference/bson-types/#decimal128
- MongoDB Manual — Transactions: https://www.mongodb.com/docs/manual/core/transactions/
- MongoDB Manual — Schema Validation: https://www.mongodb.com/docs/manual/core/schema-validation/
- MongoDB Manual — $inc operator: https://www.mongodb.com/docs/manual/reference/operator/update/inc/
- MongoDB Node.js Driver — ClientSession: https://www.mongodb.com/docs/drivers/node/current/fundamentals/transactions/
- MongoDB Manual — collMod: https://www.mongodb.com/docs/manual/reference/command/collMod/
- MongoDB Manual — Index Types (unique, sparse, compound): https://www.mongodb.com/docs/manual/indexes/

## Issues Found
1. **Mixed mongosh and Node.js driver APIs for session creation (line 125):** The `recordTransfer` function used `db.getMongo().startSession()`, which is mongosh shell syntax. However, the rest of the function uses `async/await` and `db.collection()` — Node.js driver patterns. In the Node.js driver, sessions are created from a `MongoClient` instance via `client.startSession()`. Fixed by changing the function signature from `(db, fromAccountId, ...)` to `(client, db, fromAccountId, ...)` and replacing `db.getMongo().startSession()` with `client.startSession()`.

## Review Notes
- The `recordTransfer` function uses `parseFloat(fromAccount.balance.toString())` to compare the Decimal128 balance against the transfer amount (line 144). This converts Decimal128 to a JavaScript float, which contradicts the post's own advice to "never use floating-point for money." For typical monetary amounts this is unlikely to cause precision issues in a comparison, but it is inconsistent with the post's guidance. A production implementation should use a decimal arithmetic library or perform the comparison in a MongoDB aggregation pipeline. Not fixed here because a proper solution would require significant code restructuring beyond the scope of a correctness fix.
- The other mongosh-style code blocks (insertOne, createIndex, aggregate, runCommand) are correctly written as mongosh shell snippets and don't have the same mixed-API issue — they are standalone shell commands, not part of an async Node.js function.
- All Decimal128 usage, aggregation pipelines, schema validation with `bsonType: "decimal"`, index definitions, and the double-entry bookkeeping pattern are technically correct.
