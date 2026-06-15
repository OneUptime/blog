# Validation Summary: How to Balance Consistency with Read Preferences in MongoDB

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- MongoDB replica sets
- MongoDB read preferences
- MongoDB read concern and write concern
- MongoDB read preference tag sets
- MongoDB Node.js driver
- mongosh replica set configuration

## Sources Consulted
- MongoDB Manual: Read Preference - https://www.mongodb.com/docs/manual/core/read-preference/
- MongoDB Manual: Read Preference Use Cases - https://www.mongodb.com/docs/manual/core/read-preference-use-cases/
- MongoDB Manual: Read Preference maxStalenessSeconds - https://www.mongodb.com/docs/manual/core/read-preference-staleness/
- MongoDB Manual: Configure Replica Set Tag Sets - https://www.mongodb.com/docs/manual/tutorial/configure-replica-set-tag-sets/
- MongoDB Manual: replSetGetStatus command - https://www.mongodb.com/docs/manual/reference/command/replsetgetstatus/
- MongoDB Node.js Driver API: ReadPreference - https://mongodb.github.io/node-mongodb-native/7.0/classes/ReadPreference.html
- MongoDB Node.js Driver API: FindCursor - https://mongodb.github.io/node-mongodb-native/7.0/classes/FindCursor.html
- MongoDB Node.js Driver API: FindOptions - https://mongodb.github.io/node-mongodb-native/7.0/interfaces/FindOptions.html
- MongoDB Node.js Driver API: Admin - https://mongodb.github.io/node-mongodb-native/7.0/classes/Admin.html

## Issues Found
- Clarified that read preference controls server selection, while read concern and write concern determine visibility and durability guarantees.
- Updated the read preference table to avoid implying that `primary` alone guarantees strong consistency in every case, and clarified that `nearest` selects from eligible members within the latency threshold rather than strictly the single lowest-latency member.
- Replaced the outdated cursor `.readPreference()` call with the current Node.js driver `.withReadPreference()` API.
- Changed the replica set tag example to modify `rs.conf()` and pass the full configuration to `rs.reconfig()`, matching MongoDB's documented pattern.
- Removed the stale parenthetical about `maxStalenessSeconds` minimums and kept the current documented minimum of 90 seconds.
- Fixed the `AccountService` example so `this.client.startSession()` has a defined `client`.
- Corrected the causal consistency example and explanation to include majority write concern and majority read concern.
- Changed the best-practice wording from "always set maxStalenessSeconds" to setting it for secondary reads, since it is not compatible with `primary` read preference.
- Fixed the replication lag example to use `optimeDate.getTime()` instead of calling `getTime()` on the BSON timestamp field.
- Replaced the recommendation to start with `primaryPreferred` with MongoDB's default `primary` read preference.

## Review Notes
The examples remain illustrative and assume an already connected `MongoClient` and an initialized replica set. For production code, the post could later add explicit connection lifecycle handling and error handling around failover cases, but those omissions are acceptable for the scope of this guide.
