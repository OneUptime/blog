# Validation Summary: What Is Redis Replication Offset

## Status
validated

## Post Type
Reference / Explainer

## Technologies Covered
- Redis (replication subsystem)
- Redis CLI (`redis-cli`)
- Redis replication backlog and PSYNC protocol

## Sources Consulted
- Redis official documentation on replication: https://redis.io/docs/management/replication/
- Redis INFO command documentation: https://redis.io/commands/info/
- Redis CONFIG SET command documentation: https://redis.io/commands/config-set/
- Redis PSYNC2 design (Redis 4.0+): https://redis.io/docs/latest/operate/oss_and_stack/management/replication/

## Issues Found
No technical issues found.

## Review Notes
- The post simplifies the PSYNC2 behavior introduced in Redis 4.0. In practice, Redis stores the old replication ID in `master_replid2`, which can allow partial resync even after a primary restart under certain conditions (e.g., with AOF persistence). The post's statement that a primary restart forces full resync is the common-case behavior and a reasonable simplification for this audience, but readers should be aware of the PSYNC2 nuance.
- The `slave_repl_offset` field name is still used in Redis 7.x `INFO replication` output despite the broader rename of "slave" to "replica" in configuration directives. This is correct as written but may change in future Redis versions.
- The grep commands combine `master_repl_offset` and `slave_repl_offset` in one pattern, but these appear on different node types (master vs replica respectively). The commands still work correctly — they will match whichever field is relevant for the node being queried.
