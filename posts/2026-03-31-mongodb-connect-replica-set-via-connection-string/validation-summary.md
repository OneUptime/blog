# Validation Summary: How to Connect to a MongoDB Replica Set via Connection String

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (connection strings, replica sets, read preferences, write concerns)
- Node.js MongoDB Driver
- Python PyMongo Driver
- mongosh

## Sources Consulted
- MongoDB Connection String URI Format documentation: https://www.mongodb.com/docs/manual/reference/connection-string/
- MongoDB Read Preference documentation: https://www.mongodb.com/docs/manual/core/read-preference/
- MongoDB Retryable Writes documentation: https://www.mongodb.com/docs/manual/core/retryable-writes/
- MongoDB Write Concern documentation: https://www.mongodb.com/docs/manual/reference/write-concern/
- PyMongo MongoClient API documentation: https://pymongo.readthedocs.io/en/stable/api/pymongo/mongo_client.html
- Node.js MongoDB Driver documentation: https://www.mongodb.com/docs/drivers/node/current/

## Issues Found
1. **Incorrect claim about `retryWrites` default scope**: The post stated that `retryWrites=true` is the default only for SRV connections and should be set explicitly for direct replica set connections. This is incorrect — since MongoDB 4.2-compatible drivers, `retryWrites=true` is the default for **all** connection types, not just SRV. Updated the sentence to reflect this accurately.

## Review Notes
- All connection string formats are correct and follow the standard MongoDB URI specification.
- Read preference options and their descriptions are accurate.
- The `readPreferenceTags` query parameter syntax is correct.
- Node.js code example uses the modern `hello` command (replacing the deprecated `isMaster`), which is correct for MongoDB 5.0+.
- PyMongo example correctly imports `ReadPreference` from `pymongo` and uses valid keyword arguments.
- The `replSetGetStatus` command in the verification section is correct.
- The summary's recommendation to "set `retryWrites=true`" is slightly redundant given it's already the default, but explicitly setting it is harmless and a reasonable defensive practice.
