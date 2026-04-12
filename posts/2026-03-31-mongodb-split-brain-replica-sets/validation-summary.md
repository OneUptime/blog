# Validation Summary: How to Handle Split-Brain Scenarios in MongoDB Replica Sets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB replica sets
- MongoDB majority-based elections and write concern
- MongoDB rollback and recovery (bsondump, mongoimport)
- iptables (for network partition simulation)

## Sources Consulted
- [MongoDB Replica Set Member States](https://www.mongodb.com/docs/manual/reference/replica-states/) — verified state numbers and which states are self-reported vs observer-only
- [MongoDB rs.status() documentation](https://www.mongodb.com/docs/manual/reference/method/rs.status/) — verified myState field behavior
- [MongoDB Replica Set Elections](https://www.mongodb.com/docs/manual/core/replica-set-elections/) — verified majority election mechanics and stepdown behavior
- [MongoDB Write Concern](https://www.mongodb.com/docs/manual/reference/write-concern/) — verified w:"majority" semantics
- [MongoDB Replica Set Configuration](https://www.mongodb.com/docs/manual/reference/replica-configuration/) — verified electionTimeoutMillis default and settings fields

## Issues Found
- **Incorrect `myState` value for UNKNOWN state (line 79)**: The code comment stated `rs.status().myState` should become `6 (UNKNOWN) or 2 (SECONDARY)` after a partition. State 6 (UNKNOWN) is an observer state — it is only reported by OTHER members about a member they cannot reach. A node never reports its own `myState` as UNKNOWN. When a primary steps down due to losing majority, it transitions to state 2 (SECONDARY). Fixed the comment to: `// should become 2 (SECONDARY) after stepping down`. This also resolves an internal inconsistency with the post's own prose in the "Detecting a Partition-Related Stepdown" section, which correctly states the former primary will be in SECONDARY or RECOVERING state.

## Review Notes
- The rollback file example uses a simplified filename (`orders.bson`). In practice, MongoDB 4.0+ stores rollback files in subdirectories (`<dbPath>/rollback/<db>.<collection>/<timestamp>/`) with individual document BSON files. Pre-4.0 used `<db>.<collection>.<timestamp>.bson`. The simplified name is acceptable for illustration but readers should be aware actual filenames will differ.
- The `mongoimport` command omits `--db`, which causes it to default to the `test` database. This works but production usage should specify the target database explicitly.
- The `heartbeatTimeoutSecs` setting mentioned in the checklist is a valid replica set configuration option that controls how long a member waits for heartbeat responses before marking another member unreachable.
- All other technical claims (majority election mechanics, write concern behavior, electionTimeoutMillis default of 10000ms, iptables simulation commands) are accurate.
