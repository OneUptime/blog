# Validation Summary: How to Configure Heartbeat Intervals for Replica Sets in MongoDB

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MongoDB replica sets
- MongoDB replica set configuration (`rs.conf()`, `rs.reconfig()`)
- MongoDB server parameters (`setParameter`)
- MongoDB monitoring (`rs.status()`)

## Sources Consulted
- MongoDB Manual: Replica Set Configuration — https://www.mongodb.com/docs/manual/reference/replica-configuration/
- MongoDB Manual: replSetGetConfig — https://www.mongodb.com/docs/manual/reference/command/replSetGetConfig/
- MongoDB Manual: Server Parameters (heartbeatIntervalMillis) — https://www.mongodb.com/docs/manual/reference/parameters/
- MongoDB Manual: rs.status() — https://www.mongodb.com/docs/manual/reference/method/rs.status/
- MongoDB Manual: catchUpTimeoutMillis — https://www.mongodb.com/docs/manual/reference/replica-configuration/#mongodb-rsconf-rsconf.settings.catchUpTimeoutMillis

## Issues Found
1. **Incorrect description of settings scope (line 34)**: The post stated heartbeat settings are "configured per-member in the replica set configuration." The `settings` subdocument in the replica set config is replica-set-wide, not per-member. Changed to accurately describe it as the `settings` subdocument.
2. **Code replaces entire settings object (lines 40-43)**: The code used `cfg.settings = { heartbeatTimeoutSecs: 5, electionTimeoutMillis: 5000 }` which overwrites the entire `settings` subdocument, wiping out any existing settings such as `chainingAllowed`, `getLastErrorDefaults`, etc. Fixed to use individual property assignment (`cfg.settings.heartbeatTimeoutSecs = 5`).

## Review Notes
- `heartbeatIntervalMillis` is documented by MongoDB as an internal/testing parameter. While it is technically settable via `setParameter` as the post describes, production users should be aware it is not a standard tuning knob. The post's note to "run on each member" is appropriate.
- The `rs.status()` monitoring script will print `undefined` for `lastHeartbeat`, `pingMs`, and `lastHeartbeatMessage` on the self member (the member you're connected to), since those fields only exist for remote members. This is a minor code quality consideration, not a correctness error.
- The default value of `catchUpTimeoutMillis` as -1 (no limit) is correct for MongoDB 4.0+.
