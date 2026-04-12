# Validation Summary: How to Configure Read Preferences in MongoDB Replica Set

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (replica sets, read preferences, replication)
- MongoDB Node.js Driver (v5+/v6+)
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB Read Preference documentation: https://www.mongodb.com/docs/manual/core/read-preference/
- MongoDB Read Preference Modes: https://www.mongodb.com/docs/manual/core/read-preference/#read-preference-modes
- MongoDB Node.js Driver ReadPreference API: https://mongodb.github.io/node-mongodb-native/6.0/classes/ReadPreference.html
- MongoDB Connection String URI Format (readPreference option): https://www.mongodb.com/docs/manual/reference/connection-string/#read-preference-options
- MongoDB Tag Sets: https://www.mongodb.com/docs/manual/core/read-preference-tags/
- MongoDB maxStalenessSeconds: https://www.mongodb.com/docs/manual/core/read-preference-staleness/
- MongoDB Database Profiler Output: https://www.mongodb.com/docs/manual/reference/database-profiler/
- MongoDB rs.reconfig(): https://www.mongodb.com/docs/manual/reference/method/rs.reconfig/
- MongoDB rs.printSecondaryReplicationInfo(): https://www.mongodb.com/docs/manual/reference/method/rs.printSecondaryReplicationInfo/

## Issues Found
No technical issues found.

## Review Notes
- The five read preference modes, their descriptions, and trade-off recommendations are all accurate.
- Connection string URI parameters use the correct `readPreference` key and valid mode values.
- Node.js driver code correctly uses `ReadPreference` constants (SECONDARY_PREFERRED, SECONDARY, NEAREST) and the `ReadPreference` constructor with tag sets and maxStalenessSeconds options.
- Per-operation read preference overrides at the collection level (`db.collection(name, options)`) and find/findOne level are valid API usage in the current MongoDB Node.js driver.
- The `rs.reconfig()` example correctly demonstrates tagging members, incrementing the config version, and applying the new configuration.
- The maxStalenessSeconds minimum of 90 seconds is accurate per MongoDB documentation.
- The profiling section correctly uses `setProfilingLevel(1, { slowms: 0 })` to capture all queries and references the `server` field in `system.profile` output.
- `rs.printSecondaryReplicationInfo()` is the current (non-deprecated) method name, replacing the old `rs.printSlaveReplicationInfo()`.
