# Validation Summary: How to Respond to MongoDB Replication Lag Alerts

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (replica sets, oplog, replication)
- MongoDB Shell (mongosh)
- MongoDB Node.js Driver
- MongoDB Atlas CLI

## Sources Consulted
- MongoDB documentation on replica set replication: https://www.mongodb.com/docs/manual/replication/
- MongoDB documentation on `rs.status()`: https://www.mongodb.com/docs/manual/reference/method/rs.status/
- MongoDB documentation on `rs.printSecondaryReplicationInfo()`: https://www.mongodb.com/docs/manual/reference/method/rs.printSecondaryReplicationInfo/
- MongoDB documentation on write concern: https://www.mongodb.com/docs/manual/reference/write-concern/
- MongoDB documentation on `replSetResizeOplog`: https://www.mongodb.com/docs/manual/reference/command/replSetResizeOplog/
- MongoDB documentation on `serverStatus` opcounters: https://www.mongodb.com/docs/manual/reference/command/serverStatus/#opcounters
- MongoDB Atlas CLI documentation: https://www.mongodb.com/docs/atlas/cli/stable/

## Issues Found
1. **Bug in raw lag calculation**: The code used `status.members[0].optimeDate` to get the primary's optime, but `rs.status()` returns members in replica set config order, not by role. The primary can be at any index. Fixed by first finding the primary with `status.members.find(m => m.stateStr === "PRIMARY")` and using its `optimeDate` for the lag calculation.

2. **Inaccurate write concern description**: The text claimed `w: "majority"` "ensures the primary does not acknowledge the write until secondaries have applied it." This is incorrect -- `w: "majority"` means the write is acknowledged after a majority of voting members (including the primary itself) have committed it, not all secondaries. Updated the description to accurately explain what majority write concern does and why it helps with lag (back-pressure on write throughput).

## Review Notes
- The reference to "background index builds" in the "Slow index builds on secondary" section uses terminology from pre-4.2 MongoDB. Since MongoDB 4.2, the background/foreground build distinction was removed in favor of a unified optimized build process. The core concept (index builds consuming secondary resources and slowing oplog application) remains valid, but readers on modern MongoDB should be aware of this terminology change.
- The Atlas CLI command for alert configuration uses `atlas alerts settings create`. The exact command path and available flags may vary across Atlas CLI versions; readers should consult `atlas alerts settings create --help` for their installed version.
- The alert event type `REPLICATION_OPLOG_WINDOW_RUNNING_OUT` is specifically about the oplog window shrinking, not directly about replication lag. This is a related but distinct alert. For direct replication lag alerts, Atlas also supports lag-based event types. The post's usage is still valid and useful, but readers should be aware these are complementary alerts.
