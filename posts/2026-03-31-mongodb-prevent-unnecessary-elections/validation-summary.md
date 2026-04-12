# Validation Summary: How to Prevent Unnecessary Elections in MongoDB

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB replica sets
- MongoDB replica set elections and configuration
- mongosh shell commands
- Linux system monitoring tools (top, iostat, systemctl)

## Sources Consulted
- MongoDB official documentation: Replica Set Configuration (https://www.mongodb.com/docs/manual/reference/replica-configuration/)
- MongoDB official documentation: rs.reconfig() (https://www.mongodb.com/docs/manual/reference/method/rs.reconfig/)
- MongoDB official documentation: electionTimeoutMillis setting (https://www.mongodb.com/docs/manual/reference/replica-configuration/#mongodb-rsconf-rsconf.settings.electionTimeoutMillis)
- MongoDB official documentation: serverStatus electionMetrics (https://www.mongodb.com/docs/manual/reference/command/serverStatus/#electionmetrics)
- MongoDB official documentation: Replica Set Elections (https://www.mongodb.com/docs/manual/core/replica-set-elections/)
- MongoDB official documentation: Chained Replication (https://www.mongodb.com/docs/manual/tutorial/manage-chained-replication/)

## Issues Found

### 1. heartbeatIntervalMillis included in rs.reconfig() settings
**What was wrong:** The first code example included `heartbeatIntervalMillis: 2000` inside the `settings` object of `rs.reconfig()`. The heartbeat interval is not a user-configurable replica set setting. It is fixed at 2 seconds internally by MongoDB. The configurable setting is `heartbeatTimeoutSecs` (how long to wait for a heartbeat response), not the interval itself.
**What was changed:** Removed `heartbeatIntervalMillis: 2000` from the settings block in the first code example.

### 2. Incorrect claim that rs.reconfig() always triggers an election
**What was wrong:** The post stated "Running `rs.reconfig()` always triggers an election cycle." This is incorrect. Starting with MongoDB 4.4, replica set reconfigurations use a two-phase protocol that avoids triggering elections in most cases. Only certain reconfigurations (e.g., changing voting member topology) may trigger an election.
**What was changed:** Updated the statement to explain that reconfig *can* trigger an election (especially when changing voting members), noted the safer two-phase protocol in MongoDB 4.4+, and retained the recommendation to schedule reconfigs during maintenance windows.

### 3. Incorrect election metrics path and counter names
**What was wrong:** The post referenced `db.serverStatus().repl.replicationElection` with counters `replSetElectionDryRunOther` and `replSetElectionOther`. The correct path is `db.serverStatus().electionMetrics` (a top-level field, not nested under `repl`). The actual field names are `electionTimeout`, `priorityTakeover`, `catchUpTakeover`, `stepUpCmd`, etc., each containing `called` and `successful` sub-fields.
**What was changed:** Corrected the path to `db.serverStatus().electionMetrics`, updated the description to reference actual field names, and fixed the code example to use `stats.electionMetrics`.

## Review Notes
- The `rs.reconfig()` examples construct a full config object from scratch rather than modifying the existing config via `cfg = rs.conf()`. While this works, the recommended practice is to retrieve the current config first and modify it, to avoid accidentally losing existing settings. This is a style/best-practice concern rather than a correctness error, so it was left as-is.
- The `top -p` syntax shown is Linux-specific; on macOS the flag is different. Since the post contextually targets Linux server environments this is appropriate.
