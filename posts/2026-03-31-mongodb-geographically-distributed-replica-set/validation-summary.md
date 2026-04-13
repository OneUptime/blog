# Validation Summary: How to Set Up a Geographically Distributed Replica Set in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB replica sets
- MongoDB member tags and priority configuration
- Custom write concerns with `getLastErrorModes`
- MongoDB Node.js driver (`ReadPreference`, `readPreferenceTags`)
- `mongosh` replica set administration commands (`rs.initiate`, `rs.conf`, `rs.reconfig`, `rs.status`, `rs.printSecondaryReplicationInfo`)

## Sources Consulted
- MongoDB documentation on replica set configuration: https://www.mongodb.com/docs/manual/reference/replica-configuration/
- MongoDB documentation on replica set tag sets and custom write concerns: https://www.mongodb.com/docs/manual/tutorial/configure-replica-set-tag-sets/
- MongoDB documentation on `getLastErrorModes`: https://www.mongodb.com/docs/manual/reference/replica-configuration/#mongodb-rsconf-rsconf.settings.getLastErrorModes
- MongoDB documentation on read preference: https://www.mongodb.com/docs/manual/core/read-preference/
- MongoDB Node.js driver documentation on `ReadPreference`: https://www.mongodb.com/docs/drivers/node/current/fundamentals/connection/connect/#read-preference
- MongoDB documentation on `rs.printSecondaryReplicationInfo()`: https://www.mongodb.com/docs/manual/reference/method/rs.printSecondaryReplicationInfo/
- MongoDB documentation on `rs.status()`: https://www.mongodb.com/docs/manual/reference/method/rs.status/

## Issues Found

1. **Incorrect topology name "3-2-1"**: The post described a topology with 3 nodes in the primary region and 2 in a secondary region (5 total), but labeled it "3-2-1 topology" which implies 3+2+1 = 6 nodes across 3 regions. Changed to "3-2 topology" to match the description. The subsequent "2-2-1 topology" label correctly matches its description (2+2+1 = 5 across 3 regions).

2. **`cfg.settings` overwrite bug**: The custom write concern example used `cfg.settings = { getLastErrorModes: ... }` which completely replaces the entire `settings` object, potentially destroying existing configuration like `chainingAllowed`, `heartbeatTimeoutSecs`, `electionTimeoutMillis`, etc. Changed to `cfg.settings.getLastErrorModes = { ... }` which safely adds/updates only the `getLastErrorModes` field while preserving all other settings. After `rs.conf()`, `cfg.settings` is always an existing object, so direct property assignment is safe.

## Review Notes
- The replication lag calculation using `(new Date() - m.optimeDate) / 1000` relies on the client clock being synchronized with the server. Clock skew between the mongosh client and the MongoDB server could produce inaccurate results. This is a common pattern in tutorials but worth noting for production use.
- The 2-2-1 topology description mentions "introducing write latency during failovers" but the more significant impact is that `w: majority` writes always require cross-region acknowledgment in normal operations (since no single region holds a majority of data-bearing members). The statement is not incorrect but understates the latency impact.
- `rs.printSecondaryReplicationInfo()` is the current name (MongoDB 4.4+), replacing the deprecated `rs.printSlaveReplicationInfo()`. This is correct for modern MongoDB versions.
