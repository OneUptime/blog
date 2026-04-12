# Validation Summary: How to Perform Rolling Maintenance on MongoDB Replica Set

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- MongoDB (replica sets, rolling maintenance)
- mongosh / MongoDB Shell (rs.status, rs.conf, rs.stepDown, replSetMaintenance)
- WiredTiger storage engine configuration
- Linux systemd service management

## Sources Consulted
- MongoDB replSetGetStatus command documentation: https://www.mongodb.com/docs/manual/reference/command/replsetgetstatus/
- MongoDB Replica Set Configuration reference: https://www.mongodb.com/docs/manual/reference/replica-configuration/
- MongoDB replSetMaintenance command documentation: https://www.mongodb.com/docs/manual/reference/command/replsetmaintenance/
- MongoDB rs.stepDown() documentation: https://www.mongodb.com/docs/manual/reference/method/rs.stepdown/
- MongoDB db.hello() documentation: https://www.mongodb.com/docs/manual/reference/method/db.hello/
- MongoDB rs.printSecondaryReplicationInfo() documentation: https://www.mongodb.com/docs/manual/reference/method/rs.printSecondaryReplicationInfo/

## Issues Found

1. **Step 2 — `hidden` field not available in `rs.status().members`**: The original code used `rs.status().members.find(m => m.stateStr === "SECONDARY" && !m.hidden)` to filter out hidden members. However, the `hidden` property does not exist in `rs.status()` output — it is only available in `rs.conf().members`. The code would not crash (since `undefined` is falsy, `!undefined` is `true`), but it would silently fail to filter hidden members. Fixed by cross-referencing `rs.conf()` to get hidden member hostnames and excluding them from the search.

2. **Step 8 — `rs.isMaster()` is deprecated**: The post used `rs.isMaster().primary` to verify a new primary after stepdown. The `isMaster` command was deprecated in MongoDB 5.0 and the method lives on `db`, not `rs`. Replaced with `db.hello().primary`.

3. **Maintenance Checklist — `rs.printSlaveReplicationInfo()` is deprecated**: This method was deprecated in MongoDB 4.4.1 and renamed to `rs.printSecondaryReplicationInfo()`. The post already used the correct name in Step 10 but used the deprecated name in the checklist section. Updated to the current method name.

## Review Notes
- The `rs.stepDown()` parameters and comments are correct: first argument is the step-down duration (seconds the node avoids re-election), second is the secondary catch-up period.
- The replication lag calculations using `optimeDate` subtraction are correct — JavaScript Date subtraction yields milliseconds.
- The overall rolling maintenance workflow (secondaries first, primary last) follows MongoDB best practices.
- The `replSetMaintenance` command usage is correct for putting a secondary into RECOVERING state.
- The `db.getReplicationInfo()` call in the checklist is valid and returns oplog information as described.
