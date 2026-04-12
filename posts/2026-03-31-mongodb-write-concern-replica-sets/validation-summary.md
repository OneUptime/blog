# Validation Summary: How to Configure Write Concern for Replica Sets in MongoDB

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (replica sets, write concern)
- MongoDB Node.js Driver
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB Write Concern documentation: https://www.mongodb.com/docs/manual/reference/write-concern/
- MongoDB replica set configuration documentation: https://www.mongodb.com/docs/manual/reference/replica-configuration/
- MongoDB `setDefaultRWConcern` command documentation: https://www.mongodb.com/docs/manual/reference/command/setDefaultRWConcern/
- MongoDB Node.js Driver API documentation: https://www.mongodb.com/docs/drivers/node/current/
- MongoDB 5.0 release notes (default write concern change): https://www.mongodb.com/docs/manual/release-notes/5.0/

## Issues Found

1. **Default write concern incorrectly stated**: The post labeled `{ w: 1 }` as the default write concern. Since MongoDB 5.0, the implicit default write concern for replica sets is `{ w: "majority" }`, not `{ w: 1 }`. Updated the comment on `w: 1` to say "default before MongoDB 5.0" and added a note on `w: "majority"` indicating it is the default for replica sets since MongoDB 5.0.

2. **`j` option description was misleading**: The description said `j` controls "whether the primary must write to the journal before acknowledging." The `j` option applies to all members specified by the `w` value, not just the primary. For example, with `w: "majority", j: true`, a majority of members must journal the write. Updated the description to "whether the acknowledging members must write to the on-disk journal before acknowledging."

3. **Non-existent `withWriteConcern()` API**: The "Setting Default Write Concern on a Collection" section used `db.getCollection('orders').withWriteConcern(...)`. Neither mongosh nor the MongoDB Node.js driver exposes a `withWriteConcern()` method on Collection objects. Replaced with the correct Node.js driver approach: `db.collection('orders', { writeConcern: { w: "majority" } })`.

## Review Notes
- Starting from MongoDB 5.0, `{ w: "majority" }` implies `{ j: true }` for replica sets. The post's distinction between `w: "majority"` and `w: "majority", j: true` in the trade-offs table is less significant for modern MongoDB versions, though explicitly setting `j: true` is not harmful and serves as documentation of intent.
- The error handling section uses `err.result?.writeConcernError` to check for write concern errors. In the current Node.js driver, write concern errors are typically thrown as `MongoWriteConcernError` instances. The pattern shown is a reasonable approximation but may not exactly match the driver's error structure.
- The post mixes mongosh syntax (e.g., `rs.conf()`, `rs.reconfig()`, `db.adminCommand()`) with Node.js driver syntax (e.g., `await`, `db.collection()`). This is common in MongoDB tutorials but could be made clearer with labels indicating which environment each snippet targets.
- The `getLastErrorDefaults` and `getLastErrorModes` fields are correctly noted as deprecated since MongoDB 5.0, with the appropriate recommendation to use `setDefaultRWConcern` instead.
