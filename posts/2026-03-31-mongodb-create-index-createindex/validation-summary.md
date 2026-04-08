# Validation Summary: How to Create an Index in MongoDB with createIndex()

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (shell and server)
- MongoDB Node.js Driver
- JavaScript / Node.js

## Sources Consulted
- MongoDB official documentation: `db.collection.createIndex()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB official documentation: Index Builds on Populated Collections — https://www.mongodb.com/docs/manual/core/index-creation/
- MongoDB Node.js Driver API: `Collection.createIndex()` — https://mongodb.github.io/node-mongodb-native/

## Issues Found
1. **Inaccurate description of MongoDB 4.2+ index builds.** The post described 4.2+ index builds as "rolling background operations by default." This is incorrect. MongoDB 4.2 dropped the `background` option entirely. The new optimized build process holds an exclusive lock only at the beginning and end of the build, allowing interleaved reads and writes during the majority of the build. "Rolling" index builds are a separate concept (building indexes one replica set member at a time). Updated the description to accurately reflect the optimized build process.

## Review Notes
- The best practices section mentions "joins" — MongoDB does not have traditional joins but uses `$lookup`. This is a minor wording choice and is commonly understood, so it was left as-is.
- The `background` option is listed in the syntax section's options list. While it is deprecated/ignored in 4.2+, it remains a recognized option for older versions, so listing it is acceptable given the post covers the deprecation in a dedicated section.
- All code examples (mongosh and Node.js driver) are syntactically correct and use current APIs.
- The Node.js driver example correctly uses `collection.indexes()` to list indexes and `collection.createIndex()` which returns the index name as a string.
