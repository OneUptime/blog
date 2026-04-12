# Validation Summary: How to Configure Replica Set Priority and Voting in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB replica sets
- MongoDB shell (mongosh) commands: `rs.conf()`, `rs.reconfig()`, `rs.initiate()`, `rs.stepDown()`, `db.hello()`
- Replica set elections, priority, and voting configuration

## Sources Consulted
- MongoDB Manual — Adjust Priority for a Self-Managed Replica Set Member: https://www.mongodb.com/docs/manual/tutorial/adjust-replica-set-member-priority/
- MongoDB Manual — Self-Managed Replica Set Configuration: https://www.mongodb.com/docs/manual/reference/replica-configuration/
- MongoDB Manual — Configure a Non-Voting Self-Managed Replica Set Member: https://www.mongodb.com/docs/manual/tutorial/configure-a-non-voting-replica-set-member/
- MongoDB Manual — Replica Set Elections: https://www.mongodb.com/docs/manual/core/replica-set-elections/
- MongoDB Manual — db.hello(): https://www.mongodb.com/docs/manual/reference/method/db.hello/
- MongoDB Manual — rs.conf(): https://www.mongodb.com/docs/manual/reference/method/rs.conf/
- MongoDB Manual — rs.reconfig(): https://www.mongodb.com/docs/manual/reference/method/rs.reconfig/
- MongoDB Manual — rs.initiate(): https://www.mongodb.com/docs/manual/reference/method/rs.initiate/
- MongoDB Manual — rs.stepDown(): https://www.mongodb.com/docs/manual/reference/method/rs.stepDown/

## Issues Found
1. **Deprecated `rs.isMaster().primary` usage**: The post used `rs.isMaster().primary` to check which member became primary after a stepdown. `isMaster` was deprecated in MongoDB 5.0. Replaced with `db.hello().primary`, which is the current recommended equivalent.

2. **Inaccurate replication lag tiebreaker claim**: The post stated "Two members can have the same priority; MongoDB picks based on replication lag in that case." This is an oversimplification. Replication lag acts as an eligibility gate (a member must be within 10 seconds of the primary's oplog to be eligible), but for equal-priority members the election is effectively first-past-the-post among eligible candidates. Reworded to clarify this distinction.

## Review Notes
- All other technical claims verified as correct: priority range 0-1000 with default 1, max 7 voting members, votes:0 requires priority:0, and all shell commands (`rs.conf()`, `rs.reconfig()`, `rs.initiate()`, `rs.stepDown()`) are current and not deprecated.
- The code examples are syntactically correct and follow documented patterns.
- The constraint that non-voting members must have priority 0 is correctly stated and would be enforced by MongoDB at reconfig time.
