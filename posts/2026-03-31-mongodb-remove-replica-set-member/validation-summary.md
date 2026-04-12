# Validation Summary: How to Remove Members from a MongoDB Replica Set

## Status
validated

## Post Type
Tutorial / Administration Guide

## Technologies Covered
- MongoDB (replica sets, mongosh shell)
- `rs.remove()`, `rs.reconfig()`, `rs.stepDown()`, `rs.status()`, `rs.conf()`
- `rs.printReplicationInfo()`, `rs.printSecondaryReplicationInfo()`
- systemd (mongod service management)

## Sources Consulted
- MongoDB Manual — rs.remove(): https://www.mongodb.com/docs/manual/reference/method/rs.remove/
- MongoDB Manual — rs.stepDown(): https://www.mongodb.com/docs/manual/reference/method/rs.stepDown/
- MongoDB Manual — rs.reconfig(): https://www.mongodb.com/docs/manual/reference/method/rs.reconfig/
- MongoDB Manual — Replica Set Reconfiguration: https://www.mongodb.com/docs/manual/reference/command/replSetReconfig/
- MongoDB Manual — Replica Set Elections: https://www.mongodb.com/docs/manual/core/replica-set-elections/
- MongoDB Manual — Remove Members from Replica Set: https://www.mongodb.com/docs/manual/tutorial/remove-replica-set-member/

## Issues Found
- **Incorrect `rs.stepDown()` parameter description**: The comment on `rs.stepDown(60)` said "60 seconds for a secondary to catch up and win election." This is incorrect. The first parameter (`stepDownSecs`) controls how long the stepped-down primary is **ineligible for re-election**, not the catch-up period. The catch-up period is controlled by the second parameter (`secondaryCatchUpPeriodSecs`, default 10 seconds). Fixed the comment to: "Old primary is ineligible for re-election for 60 seconds."

## Review Notes
- The quorum table compares remaining members against the pre-removal majority. This is correct for understanding whether you can *execute* the removal (the reconfig requires agreement from a majority of the current configuration). However, after a successful removal, the majority is recalculated based on the new member count. The multi-member removal rows (3→1, 5→2) could be slightly misleading since those scenarios would require multiple sequential removals, each recalculating majority. The core message — plan carefully to maintain quorum — is sound.
- The first Mermaid flowchart step G says "Call rs.remove on the primary" which could be read as "remove the primary" rather than "run rs.remove while connected to the primary." In context the meaning is clear, but "Call rs.remove from the primary" would be less ambiguous.
- Shell commands (`mongosh --host ...`) are placed inside JavaScript code blocks alongside `rs.status()` calls. This is a presentation choice — the comments make the intent clear, but separating shell and JS into distinct code blocks would be more precise.
- All mongosh helper methods used (`rs.remove()`, `rs.add()`, `rs.conf()`, `rs.reconfig()`, `rs.stepDown()`, `rs.status()`, `rs.printReplicationInfo()`, `rs.printSecondaryReplicationInfo()`) are current and valid.
