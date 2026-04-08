# Validation Summary: How to Perform a Clean Shutdown of MongoDB

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (mongod server process)
- systemd / systemctl
- mongosh (MongoDB Shell)
- WiredTiger storage engine (journaling)
- MongoDB Replica Sets

## Sources Consulted
- MongoDB official documentation: db.shutdownServer() — https://www.mongodb.com/docs/manual/reference/method/db.shutdownServer/
- MongoDB official documentation: rs.stepDown() — https://www.mongodb.com/docs/manual/reference/method/rs.stepDown/
- MongoDB official documentation: Terminate mongod Processes — https://www.mongodb.com/docs/manual/tutorial/manage-mongodb-processes/#stop-mongod-processes
- MongoDB official documentation: Replica Set Elections — https://www.mongodb.com/docs/manual/core/replica-set-elections/
- Linux man pages: systemctl, kill, signal(7)

## Issues Found
No technical issues found.

## Review Notes
- The `rs.stepDown(60)` call does not require `use admin` — it works from any database context. However, including `use admin` is not incorrect and is consistent with the pattern shown for `db.shutdownServer()`, which does require admin privileges. Keeping it as-is is fine.
- The description of a replica set becoming "read-only" during an unplanned primary failover is a slight simplification — more precisely, writes become unavailable while reads from secondaries may still be served depending on read preference configuration. This is acceptable for the target audience of this guide.
- The example log output for a clean startup is illustrative rather than exact, which is appropriate for a guide like this.
