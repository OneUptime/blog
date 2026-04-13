# Validation Summary: How to Use Read Concern 'snapshot' in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (read concern levels, transactions, snapshot isolation)
- Node.js MongoDB Driver (`mongodb` npm package)
- Multi-document transactions (replica sets and sharded clusters)

## Sources Consulted
- MongoDB official documentation: Read Concern "snapshot" — https://www.mongodb.com/docs/manual/reference/read-concern-snapshot/
- MongoDB official documentation: Transactions — https://www.mongodb.com/docs/manual/core/transactions/
- MongoDB official documentation: Read Concern levels — https://www.mongodb.com/docs/manual/reference/read-concern/
- MongoDB Node.js Driver documentation: Transactions — https://www.mongodb.com/docs/drivers/node/current/fundamentals/transactions/
- MongoDB official documentation: transactionLifetimeLimitSeconds parameter

## Issues Found
1. **Incorrect availability claim (Introduction)**: The post stated read concern `snapshot` "is only available inside multi-document transactions." Starting in MongoDB 5.0, it is also available outside transactions for `find`, `aggregate`, and `distinct` operations. Updated the introduction to reflect both the original 4.0 behavior and the 5.0 expansion.

2. **Incorrect availability claim (Availability section)**: The post stated "Read concern snapshot is only supported inside transactions. Attempting to use it outside a transaction returns an error." This is only true for MongoDB 4.0–4.4. Updated to note the MongoDB 5.0 change that expanded availability to outside transactions.

3. **Incorrect availability claim (Limitations section)**: The post stated "Only available in transactions (MongoDB 4.0+)." Updated to distinguish between 4.0 (transactions only) and 5.0 (also outside transactions for certain read operations).

## Review Notes
- The Node.js code example is correct and follows current best practices for the MongoDB Node.js driver transaction API.
- The default transaction timeout of 60 seconds (`transactionLifetimeLimitSeconds`) is accurate.
- The comparison table between `snapshot` and `majority` read concerns accurately represents their general behavioral differences.
- The post focuses on transaction usage, which remains the primary use case for read concern `snapshot`. The fixes add context about broader availability without changing the tutorial's focus.
