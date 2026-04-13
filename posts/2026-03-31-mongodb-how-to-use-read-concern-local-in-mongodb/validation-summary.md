# Validation Summary: How to Use Read Concern 'local' in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (replica sets, sharded clusters)
- MongoDB Read Concerns (`local`, `majority`, `snapshot`, `linearizable`)
- mongosh (MongoDB Shell)
- MongoDB Node.js Driver
- Multi-document Transactions

## Sources Consulted
- MongoDB official documentation on Read Concern: https://www.mongodb.com/docs/manual/reference/read-concern/
- MongoDB official documentation on Read Concern "local": https://www.mongodb.com/docs/manual/reference/read-concern-local/
- MongoDB official documentation on `db.collection.find()` and cursor methods: https://www.mongodb.com/docs/manual/reference/method/cursor.readConcern/
- MongoDB official documentation on `db.runCommand()`: https://www.mongodb.com/docs/manual/reference/command/find/
- MongoDB Node.js Driver API documentation for `Collection.find()` and `FindOptions`: https://mongodb.github.io/node-mongodb-native/
- MongoDB official documentation on Transactions and Read Concerns: https://www.mongodb.com/docs/manual/core/transactions/

## Issues Found
No technical issues found.

## Review Notes
- The claim that `local` is "the default for most operations" is accurate. It is the default for reads against the primary and against secondaries (outside of causally consistent sessions). On sharded clusters, `available` is the default for reads against secondaries for sharded collections, but this nuance doesn't invalidate the post's statement.
- The Node.js driver example passes `readConcern` in the `find()` options object. This works because `FindOptions` inherits `readConcern` from its parent types in the driver. An alternative approach is setting read concern at the collection or client level, but the per-operation approach shown is valid.
- The transaction example correctly uses `session.startTransaction()` with a `readConcern` option and properly passes the `session` to individual operations.
- All mongosh examples use correct syntax including the cursor `readConcern()` method and `runCommand` with the `readConcern` field.
