# Validation Summary: How to Use the maxPoolSize and minPoolSize Options in MongoDB

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MongoDB connection pooling (CMAP specification)
- MongoDB Node.js driver (MongoClient options and CMAP events)
- PyMongo (Python driver)
- MongoDB Java driver (MongoClientSettings / ConnectionPoolSettings)
- mongosh (db.serverStatus())

## Sources Consulted
- MongoDB Node.js Driver — Connection Pools documentation: https://www.mongodb.com/docs/drivers/node/current/connect/connection-options/connection-pools/
- PyMongo MongoClient API reference: https://pymongo.readthedocs.io/en/stable/api/pymongo/mongo_client.html
- PyMongo 4.0 Migration Guide: https://pymongo.readthedocs.io/en/stable/migrate-to-pymongo4.html
- MongoDB Java Driver ConnectionPoolSettings.Builder Javadoc: https://mongodb.github.io/mongo-java-driver/4.9/apidocs/mongodb-driver-core/com/mongodb/connection/ConnectionPoolSettings.Builder.html
- MongoDB Node.js driver source (error.ts, connection_pool.ts): https://github.com/mongodb/node-mongodb-native

## Issues Found
- **`MongoTimeoutError` is not a real error class**: The post referenced `MongoTimeoutError` as the error thrown when `waitQueueTimeoutMS` expires. This class does not exist in the Node.js driver. The internal class is `WaitQueueTimeoutError` (not publicly exported), and in practice the error may surface as a `MongoServerSelectionError` or connection error. Changed to the generic phrase "timeout error" to avoid referencing a nonexistent class.

## Review Notes
- The pool sizing "rule of thumb" formula `(number_of_CPUs * 2) + effective_spindle_count` originates from PostgreSQL/HikariCP connection pool guidance, not MongoDB-specific documentation. It is not incorrect as general advice but readers should be aware it is not official MongoDB guidance.
- Default values (maxPoolSize: 100, minPoolSize: 0) are confirmed correct across all three drivers covered.
- All three driver code examples (Node.js, PyMongo, Java) use correct option names and API patterns for their current versions.
- PyMongo's `waitQueueTimeoutMS` is still valid in PyMongo 4.x (only `waitQueueMultiple` was removed in 4.0).
- CMAP event names (`connectionPoolCreated`, `connectionCheckedOut`, `connectionCheckedIn`) are correct for the Node.js driver.
- The ~1MB per connection memory estimate is a reasonable approximation commonly cited in MongoDB literature.
