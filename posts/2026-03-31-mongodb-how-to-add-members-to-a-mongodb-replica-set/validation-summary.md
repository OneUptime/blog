# Validation Summary: How to Add Members to a MongoDB Replica Set

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (replica sets, `rs.add()`, `rs.status()`, `rs.conf()`, `replSetSyncFrom`)
- mongosh (MongoDB Shell)
- mongod server configuration (CLI flags and YAML config file)

## Sources Consulted
- MongoDB Manual: rs.add() — https://www.mongodb.com/docs/manual/reference/method/rs.add/
- MongoDB Manual: rs.status() — https://www.mongodb.com/docs/manual/reference/method/rs.status/
- MongoDB Manual: rs.conf() — https://www.mongodb.com/docs/manual/reference/method/rs.conf/
- MongoDB Manual: Add Members to a Replica Set — https://www.mongodb.com/docs/manual/tutorial/expand-replica-set/
- MongoDB Manual: replSetSyncFrom — https://www.mongodb.com/docs/manual/reference/command/replSetSyncFrom/
- MongoDB Manual: Replica Set Configuration — https://www.mongodb.com/docs/manual/reference/replica-configuration/
- MongoDB Manual: Non-Voting Members — https://www.mongodb.com/docs/manual/tutorial/configure-a-non-voting-replica-set-member/

## Issues Found
1. **`stateStr` incorrectly attributed to `rs.conf()` output** (line 97): The post told readers to look for `stateStr` in the output of `rs.conf()`. However, `rs.conf()` returns the replica set *configuration* document, which contains fields like `_id`, `host`, `priority`, and `votes` — but not `stateStr`. The `stateStr` field (e.g., `"PRIMARY"`, `"SECONDARY"`, `"STARTUP2"`) is only available in the output of `rs.status()`. Fixed by clarifying that `rs.conf()` shows configuration fields and directing the reader to use `rs.status()` to check `stateStr`.

## Review Notes
- The post states "MongoDB initiates an initial sync from the primary to the new member automatically." In practice, MongoDB automatically selects a sync source based on ping time and other criteria, which may or may not be the primary. This is a simplification rather than an outright error, and the post's later section on `replSetSyncFrom` partially addresses this by showing how to override the sync source.
- All `mongod` CLI flags and YAML configuration fields are correct and current.
- The maximum of 7 voting members and the requirement that non-voting members must have `priority: 0` are both correct.
- The `rs.add()` syntax (both string and document forms) is accurate.
