# Validation Summary: How to Use rs.status() to Monitor Replica Set Health in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (replica sets, oplog, replication)
- mongosh (MongoDB Shell)
- rs.status() / replSetGetStatus command
- rs.printSecondaryReplicationInfo()

## Sources Consulted
- MongoDB official documentation: rs.status() — https://www.mongodb.com/docs/manual/reference/method/rs.status/
- MongoDB official documentation: replSetGetStatus — https://www.mongodb.com/docs/manual/reference/command/replSetGetStatus/
- MongoDB official documentation: Replica Set Member States — https://www.mongodb.com/docs/manual/reference/replica-states/
- MongoDB official documentation: rs.printSecondaryReplicationInfo() — https://www.mongodb.com/docs/manual/reference/method/rs.printSecondaryReplicationInfo/

## Issues Found
No technical issues found.

## Review Notes
- The quick filter example (`m.health !== 1 || m.state > 2`) would flag arbiters (state 7) as potentially unhealthy, which is a false positive. However, the later "Automating Health Checks" section correctly accounts for arbiters with an explicit `includes` check against `["PRIMARY", "SECONDARY", "ARBITER"]`, so this is adequately addressed within the post.
- `lastHeartbeatMessage` is only present on non-self members in the `rs.status()` output. The code's `if (m.lastHeartbeatMessage)` guard correctly handles this since `undefined` is falsy.
- `rs.printSecondaryReplicationInfo()` is the current non-deprecated name, having replaced `rs.printSlaveReplicationInfo()` starting in MongoDB 4.4.
