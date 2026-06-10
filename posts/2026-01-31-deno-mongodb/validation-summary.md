# Validation Summary: How to Use MongoDB with Deno

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Deno (1.40+)
- MongoDB (6.0+)
- `deno_mongo` driver from denodrivers (https://deno.land/x/mongo@v0.32.0)
- TypeScript
- MongoDB Atlas
- `npm:mongodb` driver (referenced for transactions)
- MongoDB query operators, aggregation pipelines, indexes, JSON Schema validation, transactions

## Sources Consulted
- denodrivers/mongo GitHub repository: https://github.com/denodrivers/mongo
- deno_mongo v0.32.0 source (Collection, Database, MongoClient classes and type definitions):
  - https://raw.githubusercontent.com/denodrivers/mongo/v0.32.0/src/collection/collection.ts
  - https://raw.githubusercontent.com/denodrivers/mongo/v0.32.0/src/database.ts
  - https://raw.githubusercontent.com/denodrivers/mongo/v0.32.0/src/client.ts
  - https://raw.githubusercontent.com/denodrivers/mongo/v0.32.0/src/types.ts
  - https://raw.githubusercontent.com/denodrivers/mongo/v0.32.0/src/collection/commands/find.ts
- MongoDB official documentation for query operators, aggregation, schema validation, transactions
- Deno `npm:` specifier documentation for using Node.js MongoDB driver

## Issues Found

1. **"Official" driver claim** — The post described `deno_mongo` as "the official MongoDB driver for Deno." This is incorrect: `deno_mongo` is community-maintained by denodrivers. MongoDB Inc. publishes the official driver as the Node.js `mongodb` package, which Deno can consume via `npm:mongodb`. Reworded to "the community-maintained `deno_mongo` driver (from denodrivers)" and added a note that sessions/transactions are not supported in this driver, recommending `npm:mongodb` for those features.

2. **Index API method names** — The post used `users.createIndex(keys, options)` and `users.dropIndex(name)`. The actual `deno_mongo` v0.32.0 Collection API exposes `createIndexes(options: { indexes: IndexOptions[] })` and `dropIndexes(options: { index: string | IndexOptions | string[] })`. The signatures are also different: `IndexOptions` carries the `key` and `name` inside the same object, not split across two arguments. Rewrote all index examples (single field, compound, text, partial, TTL) to use `createIndexes({ indexes: [{ key: {...}, name: "...", ...opts }] })` and `dropIndexes({ index: indexName })`.

3. **Transactions section used non-existent API** — The original transactions section called `client.startSession()`, `session.startTransaction()`, `session.commitTransaction()`, `session.abortTransaction()`, and `session.endSession()` against the `deno_mongo` `MongoClient`. None of these methods exist on `deno_mongo`'s `MongoClient` — the driver does not implement sessions or transactions at all. Rewrote the transactions section to import `MongoClient`, `Db`, `ClientSession`, and `ObjectId` from `npm:mongodb@6`, since the official Node.js driver (which Deno can consume via `npm:`) does support sessions and transactions and is the supported path. Also replaced `{ $oid: id }` BSON literals with `new ObjectId(id)` (the npm driver's API), made `endSession()` calls `await`-ed (it returns a Promise in the Node driver), and added a note that transactions require a replica set or sharded cluster.

## Review Notes

- The `findAndModify` method used in the update section is correctly typed against the `deno_mongo` API (`findAndModify(filter, { update, new })`). It is, however, a legacy MongoDB command — newer code generally prefers `findOneAndUpdate` in drivers that expose it. `deno_mongo` v0.32.0 only exposes `findAndModify`, so the example is left as-is.
- The CRUD examples that mix `{ $oid: id }` filters work in `deno_mongo` (it accepts the extended-JSON `$oid` form for ObjectId), so those were not changed.
- `db.listCollectionNames()`, `db.createCollection()` with `validator`/`validationLevel`/`validationAction`, `db.runCommand()`, and `Collection.find(...).sort().skip().limit().toArray()` all check out against the v0.32.0 source.
- The current `deno_mongo` release is v0.34.0 (Feb 2025). The post pins v0.32.0; the APIs used in the post still exist in v0.34.0, so no version bump was forced, but readers may want to use the latest tag.
- The post repeatedly mentions "production" usage but pins to a community driver whose README explicitly warns about stability. A future revision could add a stronger note steering production users toward `npm:mongodb`.
