# Validation Summary: How to Use Read Concern 'majority' in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (replica sets, read concern, write concern, transactions)
- MongoDB Node.js driver (`mongodb` npm package)
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB official documentation: Read Concern "majority" (https://www.mongodb.com/docs/manual/reference/read-concern-majority/)
- MongoDB official documentation: Transactions and Read Concern (https://www.mongodb.com/docs/manual/core/transactions/#read-concern)
- MongoDB Node.js driver API: FindCursor / AbstractCursor (https://www.mongodb.com/docs/drivers/node/current/)
- MongoDB official documentation: enableMajorityReadConcern parameter (https://www.mongodb.com/docs/manual/reference/parameters/#mongodb-parameter-param.enableMajorityReadConcern)
- MongoDB official documentation: Read Concern "snapshot" (https://www.mongodb.com/docs/manual/reference/read-concern-snapshot/)

## Issues Found

1. **Node.js `withReadConcern` cursor method does not exist**: The original code called `.withReadConcern(new ReadConcern("majority"))` on a `FindCursor`. Neither `FindCursor` nor its parent `AbstractCursor` has this method in the MongoDB Node.js driver. Fixed by setting read concern at the collection level via `collection("orders", { readConcern: { level: "majority" } })`, which is the documented approach.

2. **`readConcern` passed as option to `findOne`**: In the "Using with Write Concern" section, `readConcern` was passed as a direct option to `findOne()`. The `FindOptions` type in the Node.js driver does not include `readConcern` as a per-operation option. Fixed by using `collection.withOptions({ readConcern: { level: "majority" } })` to create a collection handle with the desired read concern.

3. **Inaccurate claim about transaction consistency**: The post stated that using `majority` in a transaction "gives the highest consistency for multi-document operations." This is incorrect -- `snapshot` read concern provides stronger consistency by giving a point-in-time view across all reads in the transaction, preventing non-repeatable reads and phantom reads. Fixed the wording to accurately describe `majority` and mention `snapshot` as the stronger alternative.

4. **Outdated `enableMajorityReadConcern` section**: The post stated that this parameter must be enabled and provided a command to check it. The `enableMajorityReadConcern` parameter was removed in MongoDB 5.0 -- read concern majority is always enabled in 5.0+. The `getParameter` command would fail on MongoDB 5.0+. Updated the section to explain the current state and note the command only applies to MongoDB 4.4 and earlier.

## Review Notes
- The mongosh example (`db.orders.find().readConcern("majority")`) is correct -- the `readConcern()` method is available on cursors in mongosh.
- The transaction code pattern (try/commit, catch/abort, finally/endSession) follows best practices.
- The general explanation of how read concern majority works and its relationship to the majority-committed snapshot is accurate.
- The advice to pair read concern majority with write concern majority for end-to-end durability is sound.
