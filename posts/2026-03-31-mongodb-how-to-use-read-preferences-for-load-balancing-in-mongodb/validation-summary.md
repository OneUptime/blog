# Validation Summary: How to Use Read Preferences for Load Balancing in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (replica sets, read preferences, tag sets, maxStalenessSeconds)
- MongoDB Node.js Driver (v4+)
- PyMongo (Python MongoDB driver)
- MongoDB Shell (mongosh) — rs.reconfig()

## Sources Consulted
- MongoDB Read Preference documentation — https://www.mongodb.com/docs/manual/core/read-preference/
- MongoDB Read Concern documentation — https://www.mongodb.com/docs/manual/reference/read-concern/
- MongoDB Read Preference Staleness — https://www.mongodb.com/docs/manual/core/read-preference-staleness/
- MongoDB Node.js Driver ReadPreference API — https://mongodb.github.io/node-mongodb-native/
- MongoDB Node.js Driver FindCursor API (withReadPreference method)
- PyMongo MongoClient documentation — https://pymongo.readthedocs.io/en/stable/api/pymongo/mongo_client.html
- PyMongo ReadPreference documentation — https://pymongo.readthedocs.io/en/stable/api/pymongo/read_preferences.html

## Issues Found
1. **`linearizable` incorrectly presented as a read preference mode (line 148):** The original text said "use `primary` or `linearizable`" as if `linearizable` were a read preference mode. In MongoDB, `linearizable` is a read concern level, not a read preference mode. The five read preference modes are: `primary`, `primaryPreferred`, `secondary`, `secondaryPreferred`, and `nearest`. Fixed the sentence to clarify that `primary` is the read preference to use, and `linearizable` is a read concern that can be set separately for the strongest consistency guarantees.

## Review Notes
- The `rs.reconfig()` example uses tag values like `role: "primary"` and `role: "secondary"`. Since tags are static member properties but replica set roles are dynamic (they change during elections/failovers), these tag values could be misleading to readers. In production, tags should reflect static attributes like datacenter, region, or workload type — not the member's current role. The example works correctly but the tag naming convention is not ideal.
- The `maxStalenessSeconds: 90` example uses the exact minimum allowed value (90 seconds). This is technically valid but worth noting — values below 90 will cause an error.
- All Node.js driver code examples (MongoClient options, FindCursor.withReadPreference, ReadPreference constructor with tag sets and maxStalenessSeconds, aggregate with readPreference option, session-based read-your-own-writes) are correct for the MongoDB Node.js driver v4+.
- PyMongo examples are correct: `ReadPreference` is importable from the top-level `pymongo` module, and `get_database()`/`get_collection()` accept `read_preference` as a keyword argument.
