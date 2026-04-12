# Validation Summary: How to Troubleshoot Replication Issues in MongoDB

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- MongoDB (replica sets, replication)
- mongosh (MongoDB Shell)
- Linux system administration (systemctl, journalctl, iptables)

## Sources Consulted
- MongoDB Replica Set documentation: https://www.mongodb.com/docs/manual/replication/
- MongoDB `rs.status()` reference: https://www.mongodb.com/docs/manual/reference/method/rs.status/
- MongoDB `rs.printSecondaryReplicationInfo()` reference: https://www.mongodb.com/docs/manual/reference/method/rs.printSecondaryReplicationInfo/
- MongoDB `replSetResizeOplog` command reference: https://www.mongodb.com/docs/manual/reference/command/replSetResizeOplog/
- MongoDB `serverStatus` metrics reference: https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- MongoDB `rs.syncFrom()` reference: https://www.mongodb.com/docs/manual/reference/method/rs.syncFrom/
- MongoDB Replica Set Member States: https://www.mongodb.com/docs/manual/reference/replica-states/

## Issues Found
No technical issues found.

## Review Notes
- The post uses `rs.printSecondaryReplicationInfo()` which is the correct modern `mongosh` method name, replacing the deprecated `rs.printSlaveReplicationInfo()`.
- The `syncSourceHost` field used in Section 4 was introduced in MongoDB 4.4, replacing the older `syncingTo` field. This is current and correct.
- The default data directory `/var/lib/mongodb` in the resync section is the Debian/Ubuntu default. On RHEL/CentOS the default is `/var/lib/mongo`. This is a minor platform-specific detail that doesn't constitute an error.
- The `metrics.repl.buffer` metrics path has been reorganized in some newer MongoDB versions (6.0+). The post doesn't target a specific version, and these metrics are valid for widely-used MongoDB versions.
