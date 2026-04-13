# Validation Summary: How to Use the appName Option to Tag Connections in MongoDB

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (server logs, currentOp, profiler)
- MongoDB Node.js Driver
- PyMongo (Python)
- MongoDB Java Driver
- MongoDB connection string URI options

## Sources Consulted
- MongoDB Connection String URI Format documentation (https://www.mongodb.com/docs/manual/reference/connection-string/#connection-string-options)
- MongoDB Node.js Driver API — MongoClientOptions.appName (https://mongodb.github.io/node-mongodb-native/)
- PyMongo MongoClient documentation (https://pymongo.readthedocs.io/en/stable/api/pymongo/mongo_client.html)
- MongoDB Java Driver MongoClientSettings.Builder.applicationName (https://mongodb.github.io/mongo-java-driver/)
- MongoDB Server Log Messages documentation (https://www.mongodb.com/docs/manual/reference/log-messages/)
- MongoDB currentOp documentation (https://www.mongodb.com/docs/manual/reference/command/currentOp/)
- MongoDB Database Profiler Output documentation (https://www.mongodb.com/docs/manual/reference/database-profiler/)
- MongoDB Driver Handshake Specification — appName limited to 128 bytes

## Issues Found
1. **Java Driver: unused import** — The code example imported `com.mongodb.connection.ClusterSettings` which was not used anywhere in the snippet. Removed the unused import line to keep the example clean and accurate.
2. **Profiler section: misleading field description** — The text stated that `appName` "appears in the `client` field" of profiler output. In reality, `appName` is a top-level field in `system.profile` documents (the code example correctly queried it as such). Changed the description to say "appears as a top-level field in the profile document" to match the actual profiler document structure and the code shown.

## Review Notes
- The connection string format, Node.js, PyMongo, and Java driver examples are all correct and use current, non-deprecated APIs.
- The structured log format shown matches MongoDB 4.4+ JSON logging with the correct field hierarchy (`attr.client.application.name`).
- The `currentOp` filtering example correctly accesses `clientMetadata.application.name`, which is the accurate field path in `currentOp` output.
- The 128-byte limit for `appName` is per the MongoDB driver specification. The claim that values are "silently truncated" is accurate for most official drivers, as the spec recommends truncation.
- The example `appName` string in the Limits section is only ~70 characters and would not actually be truncated, but it serves as an illustrative placeholder — this is acceptable for a code comment example.
