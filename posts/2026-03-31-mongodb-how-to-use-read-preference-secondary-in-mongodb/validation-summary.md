# Validation Summary: How to Use Read Preference 'secondary' in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (replica sets, read preferences)
- MongoDB Shell (mongosh)
- MongoDB Node.js Driver
- maxStalenessSeconds configuration

## Sources Consulted
- MongoDB official documentation on Read Preference: https://www.mongodb.com/docs/manual/core/read-preference/
- MongoDB official documentation on Read Preference `secondary`: https://www.mongodb.com/docs/manual/core/read-preference/#mongodb-readmode-secondary
- MongoDB Node.js Driver API documentation for ReadPreference: https://mongodb.github.io/node-mongodb-native/
- MongoDB official documentation on maxStalenessSeconds: https://www.mongodb.com/docs/manual/core/read-preference-staleness/
- MongoDB Shell (mongosh) documentation for setReadPref and readPref: https://www.mongodb.com/docs/mongodb-shell/

## Issues Found
No technical issues found.

## Review Notes
- The post correctly notes that `secondary` read preference causes reads to fail when no secondaries are available, distinguishing it from `secondaryPreferred`.
- The `maxStalenessSeconds` minimum of 90 seconds and its introduction in MongoDB 3.4 are accurate.
- All Node.js driver code examples use correct and current API patterns, including `ReadPreference.SECONDARY`, the `ReadPreference` constructor with tag sets and options, and `AbstractCursor.withReadPreference()`.
- The warnings about avoiding `secondary` for read-your-write consistency patterns are appropriate and accurate.
- The reference to MongoDB 3.4 for `maxStalenessSeconds` is historically correct; current MongoDB versions (6.x/7.x) continue to support this with the same 90-second minimum.
