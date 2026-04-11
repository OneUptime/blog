# Validation Summary: How to Use WAIT for Synchronous Replication in Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (WAIT command, replication, AOF persistence)
- Python (redis-py client library)
- Bash / redis-cli

## Sources Consulted
- Redis official documentation for WAIT: https://redis.io/commands/wait/
- Redis official documentation on replication: https://redis.io/docs/management/replication/
- Redis official documentation on AOF persistence (appendfsync): https://redis.io/docs/management/persistence/
- redis-py client library API reference: https://redis-py.readthedocs.io/

## Issues Found

### 1. MULTI/EXEC example used separate `redis-cli` invocations (lines 82-87)
**What was wrong:** The example showed MULTI, SET, SET, EXEC, and WAIT as five separate `redis-cli` commands. Each `redis-cli` invocation opens a new TCP connection. MULTI/EXEC requires all commands on the same connection — otherwise the SETs execute as standalone commands (not queued in a transaction), and EXEC on its own connection returns an error since no MULTI was started on that connection.

**What was changed:** Replaced with a heredoc piped to a single `redis-cli` invocation so all commands share one connection. Added a clarifying note about the single-connection requirement.

### 2. WAIT vs AOF comparison table was misleading (lines 112-118)
**What was wrong:** The `appendfsync always` row stated it protects against "Primary crash + disk failure." This is misleading — `appendfsync always` fsyncs every write to the primary's disk, which protects against process and OS crashes, but does NOT protect against physical disk/hardware failure (if the disk dies, the AOF file is lost with it). The "Both combined" row ("Primary crash + disk failure + replica needed") was also confusingly worded and didn't clearly convey the benefit.

**What was changed:** Updated `appendfsync always` to "Primary process crash (data fsynced to disk)" and "Both combined" to "Primary crash and disk failure (redundant copies)" to accurately reflect that combining both mechanisms provides redundancy across failure modes.

## Review Notes
- The basic usage examples show SET and WAIT as separate `redis-cli` invocations. This works correctly because WAIT uses the global master replication offset (not a per-client offset), so a WAIT on a new connection will wait until replicas reach the current offset, which includes the prior SET. However, readers should understand that in production application code, SET and WAIT should be on the same connection for precise write-level guarantees.
- The Python code examples using `redis-py` are correct — `redis.Redis.wait(num_replicas, timeout)` is the proper API.
- The "How WAIT Works Internally" section describes the primary sending a "ping" to replicas — technically it sends `REPLCONF GETACK`, but this simplification is acceptable for a tutorial-level blog post.
- The post correctly notes that WAIT provides semi-synchronous (not fully synchronous) replication, which aligns with the Redis documentation's own characterization.
