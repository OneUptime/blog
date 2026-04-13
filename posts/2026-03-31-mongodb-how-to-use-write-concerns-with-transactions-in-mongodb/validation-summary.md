# Validation Summary: How to Use Write Concerns with Transactions in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (transactions, write concerns, replica sets)
- Node.js MongoDB Driver (`startSession`, `startTransaction`, `withTransaction`, `commitTransaction`)
- JavaScript (async/await)

## Sources Consulted
- MongoDB documentation on Write Concern: https://www.mongodb.com/docs/manual/reference/write-concern/
- MongoDB documentation on Transactions: https://www.mongodb.com/docs/manual/core/transactions/
- MongoDB Node.js Driver API for `ClientSession.startTransaction()`: https://mongodb.github.io/node-mongodb-native/
- MongoDB documentation on `session.withTransaction()`: https://www.mongodb.com/docs/manual/core/transactions-in-applications/
- MongoDB documentation on `writeConcernMajorityJournalDefault`: https://www.mongodb.com/docs/manual/reference/replica-configuration/#mongodb-rsconf-rsconf.writeConcernMajorityJournalDefault

## Issues Found
No technical issues found.

## Review Notes
- Starting with MongoDB 5.0, the default write concern is `{ w: "majority" }`, so transactions without an explicit write concern already use majority. The post's recommendation to set it explicitly is still good practice for clarity and backward compatibility.
- The `j: true` option is implied by default when `writeConcernMajorityJournalDefault` is `true` (the default since MongoDB 3.6). Setting it explicitly as shown in the post is not wrong and makes the durability intent clear.
- The latency measurement snippet uses manual `commitTransaction()`, which is correct for the manual transaction pattern but would not apply when using `withTransaction()` (which handles commit automatically). The post doesn't conflate the two, so this is fine.
