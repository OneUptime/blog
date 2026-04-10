# Validation Summary: How to Use WAIT in Redis for Synchronous Replication

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis (WAIT command)
- Redis replication (asynchronous replication with synchronous-like client blocking)
- Redis AOF persistence (`appendfsync always`)

## Sources Consulted
- Official Redis WAIT command documentation: https://redis.io/docs/latest/commands/wait/
- Redis replication documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/replication/

## Issues Found
1. **"Returns 0 immediately" on standalone instance (line ~97):** The post claimed that on a standalone Redis instance with no replicas, `WAIT 1 1000` "Returns 0 immediately because there are no replicas to wait for." This is incorrect. When WAIT is called, Redis checks whether the requested number of replicas have acknowledged the current replication offset. With 0 connected replicas, the count (0) is less than the requested number (1), so Redis blocks the client until the timeout expires (1000ms), then returns 0. **Fixed** to: "Returns 0 after the timeout expires because there are no replicas to acknowledge the write."

## Review Notes
- The WAIT vs fsync section recommends combining WAIT with `appendfsync always` on replicas for full durability. While this is reasonable advice, it is worth noting that WAIT only confirms replication to replica memory, not that the replica has fsynced to disk. Redis 7.2+ introduced the `WAITAOF` command which explicitly waits for AOF persistence on replicas. A future update could mention `WAITAOF` as the more precise solution for disk-level durability guarantees.
- The title frames WAIT as "synchronous replication." The Redis docs clarify that replication remains asynchronous and WAIT is a client-side blocking primitive layered on top. The post body correctly notes that "WAIT does not make Redis strongly consistent," which adequately qualifies the title's framing.
- The Durability Guarantee section's phrasing ("With WAIT, step 3 only proceeds after the write has been confirmed by N replicas") is slightly ambiguous — WAIT doesn't prevent the primary from crashing; it prevents the application from considering the write complete until replicas confirm. The overall point is correct, but the wording could be clearer in a future revision.
