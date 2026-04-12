# Validation Summary: How to Tune maxNumActiveUserIndexBuilds in MongoDB

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MongoDB (4.4+)
- MongoDB Server Parameters (`setParameter` / `getParameter`)
- WiredTiger storage engine
- MongoDB Replica Sets (simultaneous index builds, commit quorum)

## Sources Consulted
- MongoDB Server Parameters reference: https://www.mongodb.com/docs/manual/reference/parameters/
- MongoDB Index Builds on Populated Collections: https://www.mongodb.com/docs/manual/core/index-creation/
- JIRA SERVER-47155 (introduction of `maxNumActiveUserIndexBuilds` in 4.4.0-rc0): https://jira.mongodb.org/browse/SERVER-47155
- JIRA SERVER-49948 (4.2 backport attempt, closed as Won't Do): https://jira.mongodb.org/browse/SERVER-49948
- MongoDB source code for index build throttling: https://github.com/mongodb/mongo (index_builds_coordinator_mongod.cpp)
- MongoDB docs source for parameters.txt across v4.4, v5.0, v6.0, and master branches

## Issues Found

### Issue 1: Incorrect default value history
- **What was wrong:** The post stated "The default is 3 concurrent index builds in MongoDB 6.0+. In earlier versions it was 1." The parameter was introduced in MongoDB 4.4 (not 6.0) and has always had a default of 3. It was never 1 in any version.
- **What was changed:** Replaced with "The default is 3 concurrent index builds. This parameter was introduced in MongoDB 4.4 alongside the simultaneous index build mechanism."
- **Why:** JIRA SERVER-47155 confirms the parameter was introduced in 4.4.0-rc0 with a limit of 3. Documentation across all version branches (v4.4, v5.0, v6.0, master) consistently shows `*Default*: 3`.

### Issue 2: Inaccurate replica set voting claim
- **What was wrong:** The post stated "index builds on the primary block voting on the secondary until complete. If a build takes hours on a large collection, secondaries may not be eligible to vote during that period." This conflates the index build commit quorum mechanism with replica set election voting. Secondaries remain fully eligible for election voting during index builds.
- **What was changed:** Replaced with an accurate description of the commit quorum mechanism: the primary waits for a commit quorum of data-bearing voting members to finish building the index before committing, and long-running builds can delay the index commit and increase replication lag.
- **Why:** MongoDB's index build "voting" refers to members signaling readiness to commit an index build, not replica set election voting. The official docs explicitly distinguish commit quorum from write concern and election voting.

## Review Notes
- The `setParameter` / `getParameter` syntax, `mongod.conf` format, `currentOp` monitoring examples, and `createIndexes` batching behavior are all accurate.
- Confirmed via source code that a single `createIndexes` call with multiple indexes counts as one build against the `maxNumActiveUserIndexBuilds` limit.
- The tuning strategy table and general guidance about limiting builds in production are sound operational advice.
