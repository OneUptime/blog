# Validation Summary: How to Handle MongoDB Failover Gracefully in Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (replica sets, failover, elections)
- Node.js MongoDB driver (mongodb package)
- Mongoose ODM
- PyMongo (Python MongoDB driver)
- Express.js (health check endpoint)

## Sources Consulted
- MongoDB Node.js Driver documentation — MongoClient options: https://www.mongodb.com/docs/drivers/node/current/fundamentals/connection/connection-options/
- MongoDB Node.js Driver documentation — ReadPreference: https://www.mongodb.com/docs/drivers/node/current/fundamentals/crud/read-operations/change-read-preference/
- MongoDB documentation — Replica Set Elections: https://www.mongodb.com/docs/manual/core/replica-set-elections/
- MongoDB documentation — Retryable Writes: https://www.mongodb.com/docs/manual/core/retryable-writes/
- MongoDB documentation — Retryable Reads: https://www.mongodb.com/docs/manual/core/retryable-reads/
- PyMongo documentation — MongoClient: https://pymongo.readthedocs.io/en/stable/api/pymongo/mongo_client.html
- MongoDB documentation — Server Selection: https://www.mongodb.com/docs/manual/core/read-preference-mechanics/

## Issues Found
No technical issues found.

## Review Notes
- The PyMongo example imports `ReadPreference`, `AutoReconnect`, and `ConnectionFailure` but does not use them in the shown snippet. These are likely included for the reader's reference as commonly needed imports when implementing failover handling, so this is not an error.
- `retryWrites: true` and `retryReads: true` are the defaults since MongoDB 4.2+ drivers, so explicitly setting them is redundant but serves as good documentation of intent.
- The `socketTimeoutMS: 45000` option is valid but worth noting that the default in the Node.js driver 4.x+ is 0 (no timeout). Setting a finite timeout is a reasonable choice for failover scenarios to avoid hanging connections.
- The `'not primary'` error message check is correct for MongoDB 5.0+. Older MongoDB versions used `'not master'` — readers targeting older versions would need to adjust.
