# Validation Summary: How to Build MongoDB Clusters for 99.99% Availability

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- MongoDB replica sets
- MongoDB replica set configuration
- MongoDB Node.js driver
- MongoDB Database Tools (`mongodump`, `mongorestore`)
- MongoDB write concern, read preference, and retryable reads/writes

## Sources Consulted
- MongoDB Manual: Self-Managed Replica Set Configuration - https://www.mongodb.com/docs/manual/reference/replica-configuration/
- MongoDB Manual: `replSetGetStatus` command - https://www.mongodb.com/docs/manual/reference/command/replsetgetstatus/
- MongoDB Manual: Replica Set Arbiter - https://www.mongodb.com/docs/manual/core/replica-set-arbiter/
- MongoDB Manual: Configure Replica Set Tag Sets - https://www.mongodb.com/docs/manual/tutorial/configure-replica-set-tag-sets/
- MongoDB Manual: Write Concern - https://www.mongodb.com/docs/manual/reference/write-concern/
- MongoDB Manual: Retryable Writes - https://www.mongodb.com/docs/manual/core/retryable-writes/
- MongoDB Manual: Read Preference - https://www.mongodb.com/docs/manual/core/read-preference/
- MongoDB Database Tools: `mongodump` - https://www.mongodb.com/docs/database-tools/mongodump/
- MongoDB Database Tools: `mongorestore` - https://www.mongodb.com/docs/database-tools/mongorestore/
- MongoDB Node.js Driver: Connection Options - https://www.mongodb.com/docs/drivers/node/current/connect/connection-options/
- MongoDB Node.js Driver: Connection Pools - https://www.mongodb.com/docs/drivers/node/current/connect/connection-options/connection-pools/
- MongoDB Node.js Driver: Monitoring Events - https://www.mongodb.com/docs/drivers/node/current/monitoring-and-logging/monitoring/
- MongoDB Manual: BSON Types - https://www.mongodb.com/docs/manual/reference/bson-types/

## Issues Found
- The replication lag example used `member.optime.ts.getTime()` and `primary.optime.ts.getTime()`. `optime.ts` is a BSON `Timestamp`, not a JavaScript `Date`. Changed the calculation to use `optimeDate.getTime()`, which matches the `replSetGetStatus` fields documented for comparing member optime dates.
- The `mongorestore --oplogLimit` example used `Timestamp(1234567890, 1)`. The Database Tools CLI expects `--oplogLimit` values in `<time_t>:<ordinal>` format. Changed the example to `--oplogLimit="1234567890:1"`.

## Review Notes
The post is technically relevant and the main replica set, write concern, driver option, monitoring event, failover, and backup concepts align with current MongoDB documentation. For production guidance, a future revision could mention that arbiters are mainly for cost-constrained deployments and that odd numbers of data-bearing voting members are generally preferable when the availability target is strict.
