# Validation Summary: How to Check Replica Set Status with rs.status() in MongoDB

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (replica sets, replication)
- mongosh (MongoDB Shell)
- `rs.status()` / `replSetGetStatus` command
- `rs.printReplicationInfo()` and `rs.printSecondaryReplicationInfo()`

## Sources Consulted
- MongoDB official documentation: `replSetGetStatus` command (https://www.mongodb.com/docs/manual/reference/command/replSetGetStatus/)
- MongoDB official documentation: Replica Set Member States (https://www.mongodb.com/docs/manual/reference/replica-states/)
- MongoDB official documentation: `rs.status()` shell helper (https://www.mongodb.com/docs/manual/reference/method/rs.status/)
- MongoDB official documentation: `rs.printReplicationInfo()` (https://www.mongodb.com/docs/manual/reference/method/rs.printReplicationInfo/)
- MongoDB official documentation: `rs.printSecondaryReplicationInfo()` (https://www.mongodb.com/docs/manual/reference/method/rs.printSecondaryReplicationInfo/)

## Issues Found
- **Missing UNKNOWN state in badStates array**: In the "Identifying Problems from rs.status()" section, the `badStates` array `[0, 3, 5, 8, 9, 10]` omitted state 6 (UNKNOWN). This was inconsistent with the post's own "Common Status Problems and Fixes" flowchart directly below, which correctly lists UNKNOWN as a problematic state. Added state 6 to the array and updated the comment to include UNKNOWN.

## Review Notes
- The output example is accurate and internally consistent — all timestamps, optime values, and dates are correctly computed and match each other.
- All 10 documented replica set member states (0, 1, 2, 3, 5, 6, 7, 8, 9, 10) are correctly listed. State 4 is properly omitted as it does not exist in MongoDB's state model.
- The replication lag calculation code is correct: JavaScript Date subtraction yields milliseconds, and dividing by 1000 gives seconds.
- The `rs.printReplicationInfo()` and `rs.printSecondaryReplicationInfo()` are the correct modern mongosh method names (replacing the deprecated `db.printSlaveReplicationInfo()`).
- The "Running rs.status() on a Secondary" section mixes a shell command (`mongosh --host ...`) with JavaScript code in a single code block. This is a common pattern in MongoDB tutorials but could confuse beginners. Not a technical error.
- The mermaid diagram describes rs.status() as "Query each member for health" — in reality it uses cached heartbeat data rather than querying members in real-time, but this is an acceptable simplification for a tutorial.
