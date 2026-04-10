# Validation Summary: How to Use WATCH in Redis for Optimistic Locking

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis (WATCH, MULTI, EXEC, DISCARD, UNWATCH commands)
- Redis optimistic locking / optimistic concurrency control
- Redis transactions
- Python redis-py client library

## Sources Consulted
- Redis official documentation for WATCH: https://redis.io/docs/latest/commands/watch/
- Redis official documentation for MULTI: https://redis.io/docs/latest/commands/multi/
- Redis official documentation for EXEC: https://redis.io/docs/latest/commands/exec/
- Redis official documentation for UNWATCH: https://redis.io/docs/latest/commands/unwatch/
- Redis official documentation on transactions: https://redis.io/docs/latest/develop/interact/transactions/
- redis-py documentation for pipeline and WATCH: https://redis-py.readthedocs.io/en/stable/

## Issues Found

### 1. Bash retry loop example was fundamentally broken (Critical)

**What was wrong:** The retry loop used separate `redis-cli` invocations for each command (`redis-cli WATCH`, `redis-cli GET`, `redis-cli MULTI`, `redis-cli SET`, `redis-cli EXEC`). Each `redis-cli` invocation opens and closes a separate TCP connection to Redis. Since WATCH is connection-scoped, the WATCH issued on connection 1 has no effect on the MULTI/EXEC issued on connections 3-5. The example would silently "succeed" every time without any actual optimistic locking protection, completely defeating the purpose of the pattern.

**What was changed:** Replaced the bash script with a Python redis-py example that uses a pipeline object. The pipeline maintains a single persistent connection, so WATCH, GET, MULTI, SET, and EXEC all execute on the same connection as required. The `redis.WatchError` exception is the standard mechanism for detecting aborted transactions in redis-py.

**Why:** The WATCH command only monitors keys on the connection that issued it. A correct implementation requires all commands (WATCH through EXEC) to run on the same connection. The redis-py pipeline pattern is the canonical way to demonstrate this in application code.

## Review Notes
- All other technical content in the post is accurate: the explanation of WATCH semantics, EXEC returning nil on conflict, WATCH being cleared by EXEC/DISCARD/UNWATCH/disconnect, key-level (not field-level) watching for hashes, and the optimistic vs pessimistic locking comparison table.
- The WATCH vs Pessimistic Locking table mentions SETNX for pessimistic locking. While SETNX still works, the modern Redis recommendation is `SET key value NX EX timeout`. This is not incorrect, just a minor style note — SETNX is still a valid and widely understood shorthand for the concept.
- The mermaid sequence diagram accurately depicts the WATCH/conflict/abort flow.
