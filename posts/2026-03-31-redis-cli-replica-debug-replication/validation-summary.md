# Validation Summary: How to Use Redis CLI --replica for Debugging Replication

## Status
validated

## Post Type
Tutorial / Debugging Guide

## Technologies Covered
- Redis (server and replication protocol)
- redis-cli (command-line interface, `--replica` flag)
- Redis ACLs (Access Control Lists)
- Redis replication (SYNC, PSYNC, RDB transfer)

## Sources Consulted
- Redis SYNC command documentation — https://redis.io/docs/latest/commands/sync/
- Redis PSYNC command documentation — https://redis.io/docs/latest/commands/psync/
- Redis ACL CAT documentation (list of valid ACL categories) — https://redis.io/docs/latest/commands/acl-cat/
- Redis ACL SETUSER documentation — https://redis.io/docs/latest/commands/acl-setuser/
- Redis INFO command documentation — https://redis.io/docs/latest/commands/info/
- Redis replication documentation — https://redis.io/docs/latest/operate/oss_and_stack/management/replication/
- Redis redis-cli.c source code (slaveMode / sendSync functions) — https://github.com/redis/redis/blob/unstable/src/redis-cli.c

## Issues Found

### Issue 1: Non-existent `@replication` ACL category
- **What was wrong:** The Security Consideration section used `+@replication` in the ACL SETUSER command. There is no `@replication` ACL category in Redis. The valid categories are: `@keyspace`, `@read`, `@write`, `@set`, `@sortedset`, `@list`, `@hash`, `@string`, `@bitmap`, `@hyperloglog`, `@geo`, `@stream`, `@pubsub`, `@admin`, `@fast`, `@slow`, `@blocking`, `@dangerous`, `@connection`, `@transaction`, `@scripting`. The SYNC and PSYNC commands belong to `@admin`, `@slow`, and `@dangerous`.
- **What was changed:** Replaced the incorrect `+@replication` with explicit least-privilege permissions: `+sync +psync +replconf +ping`. Also corrected the claim about "REPLICATION privilege" (no such named privilege exists in Redis).
- **Why:** Using `+@replication` in an ACL SETUSER command would fail or not grant the intended permissions, making the example non-functional.

### Issue 2: Incorrect Partial Sync vs Full Sync explanation
- **What was wrong:** The section claimed that a large byte count in the "SYNC with master, discarding X bytes" message indicates a full sync while a small count means a partial resync. This is incorrect on two counts: (1) `redis-cli --replica` always sends the `SYNC` command (not `PSYNC`), so it always triggers a full synchronization — partial resync is impossible; (2) the byte count reflects the RDB dump size (dataset size), not the sync type. A partial resync (PSYNC with `+CONTINUE` response) doesn't transfer an RDB dump at all.
- **What was changed:** Clarified that `redis-cli --replica` always performs a full sync, the byte count reflects dataset size, and directed readers to use `INFO replication` and replica logs to diagnose partial vs full resyncs on actual replicas.
- **Why:** The original explanation would mislead readers into misinterpreting RDB dump size as sync-type information.

## Review Notes
- The `slave_repl_offset` field referenced in the Debugging Replication Lag section is valid. Despite Redis renaming "slave" to "replica" in configuration directives (Redis 5.0+), the INFO output field names retain the `slave_` prefix for backward compatibility.
- The post correctly notes that `--replica` streams only write commands, unlike `MONITOR` which captures all commands including reads.
- The step-by-step explanation of how `redis-cli --replica` works (connect, SYNC, discard RDB, stream commands) is accurate.
- In Redis 5.0+, `--slave` was renamed to `--replica`. The post correctly uses the modern flag name.
