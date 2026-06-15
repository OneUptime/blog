# Validation Summary: How to Delete All Keys in Redis (FLUSHALL/FLUSHDB)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis
- Redis CLI
- redis-py
- Redis ACLs
- Redis Cluster
- Redis persistence with RDB and AOF

## Sources Consulted
- Redis FLUSHALL command documentation: https://redis.io/docs/latest/commands/flushall/
- Redis FLUSHDB command documentation: https://redis.io/docs/latest/commands/flushdb/
- Redis SCAN command documentation: https://redis.io/docs/latest/commands/scan/
- Redis DEL command documentation: https://redis.io/docs/latest/commands/del/
- Redis UNLINK command documentation: https://redis.io/docs/latest/commands/unlink/
- Redis EXPIRE command documentation: https://redis.io/docs/latest/commands/expire/
- Redis ACL SETUSER command documentation: https://redis.io/docs/latest/commands/acl-setuser/
- Redis security documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/
- Redis redis-py connection and cluster documentation: https://redis.io/docs/latest/develop/clients/redis-py/connect/
- redis-py clustering documentation: https://redis.readthedocs.io/en/stable/clustering.html
- Redis persistence and durability documentation: https://redis.io/tutorials/operate/redis-at-scale/persistence-and-durability/

## Issues Found
- Corrected the FLUSHALL scope from "All 16 databases" to "All configured databases" because standalone Redis defaults to 16 logical databases, but this value is configurable.
- Clarified default flush behavior for Redis 6.2+ because `lazyfree-lazy-user-flush yes` can make the default flush mode asynchronous.
- Replaced production guidance that primarily recommended `rename-command` with ACL-based command blocking. Redis documents command renaming as deprecated and recommends ACL rules for disallowing commands.
- Changed selective deletion from `SCAN + DELETE` to `SCAN + UNLINK` where the text claimed non-blocking deletion. `SCAN` is incremental, but `DEL` can block while freeing large values; `UNLINK` frees memory asynchronously.
- Corrected Redis Cluster guidance to note that Redis Cluster supports only database 0, making `FLUSHDB` identical to `FLUSHALL` in cluster mode, and updated the example to target primary nodes.
- Corrected AOF recovery guidance. Replaying an AOF that contains the accidental `FLUSHALL` or `FLUSHDB` would replay the deletion, so the post now instructs restoring or editing a clean AOF before restart.

## Review Notes
The Redis CLI binary and redis-py package were not installed in the local environment, so command and API verification was performed against official Redis and redis-py documentation rather than local execution.
