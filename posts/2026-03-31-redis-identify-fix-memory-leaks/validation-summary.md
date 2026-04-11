# Validation Summary: How to Identify and Fix Redis Memory Leaks

## Status
validated

## Post Type
Tutorial / Debugging Guide

## Technologies Covered
- Redis (CLI commands, memory management, eviction policies)
- Python (redis-py client library)
- Bash scripting (monitoring and diagnostics)

## Sources Consulted
- Redis official documentation: INFO command (https://redis.io/commands/info)
- Redis official documentation: SETEX command (https://redis.io/commands/setex) — string-only, cannot be used with hashes
- Redis official documentation: CLIENT NO-EVICT (https://redis.io/commands/client-no-evict) — per-connection maxmemory eviction flag, not related to idle timeout
- Redis official documentation: SCRIPT FLUSH (https://redis.io/commands/script-flush) — clients receive NOSCRIPT on subsequent EVALSHA calls
- Redis official documentation: OBJECT FREQ (https://redis.io/commands/object-freq) — LFU access frequency counter, unrelated to TTL scanning
- Redis official documentation: CONFIG SET timeout (https://redis.io/commands/config-set) — idle client disconnection
- redis-py client library documentation (https://redis-py.readthedocs.io/)

## Issues Found

1. **SETEX suggestion for hash keys (line 86)**: The comment `# or use SETEX / pipeline` was incorrect. SETEX only works with string values (`SET` + expiry), not with hashes created via `HSET`. Changed to `# or use a pipeline for atomicity`.

2. **SCRIPT FLUSH reload claim (line 110)**: The comment stated scripts "reload on next call" after SCRIPT FLUSH. This is misleading — after flushing, clients calling EVALSHA will receive NOSCRIPT errors and must re-send the script via EVAL. Changed to clarify that clients need to resend scripts.

3. **Incorrect redis-cli 7.4+ TTL scanning claim (line 130)**: The comment claimed "redis-cli 7.4+ has OBJECT FREQ and TTL scanning." OBJECT FREQ is an LFU eviction metric unrelated to TTL, and there is no built-in TTL scanning feature in redis-cli. Replaced with a simple accurate comment: "Use SCAN + TTL to find keys missing expiry."

4. **Misused CLIENT NO-EVICT OFF command (line 156)**: `CLIENT NO-EVICT OFF` is a per-connection flag that controls whether the current connection can be evicted under maxmemory pressure. It does not kill or disconnect idle clients. The actual mechanism for disconnecting idle clients is `CONFIG SET timeout`. Removed the `CLIENT NO-EVICT OFF` line and updated the comment.

## Review Notes
- The Python `audit_ttl_coverage` function could raise a `ZeroDivisionError` if all sampled keys expire between the SCAN and TTL calls (making `total` equal to 0). This is an unlikely edge case but worth noting for production use.
- The claim "Each connected client uses ~20-50 KB of server memory" is a rough approximation. Actual per-client memory varies significantly based on query buffer size and output buffer configuration. The figure is reasonable for typical active connections but not precise.
- The `checked` counter in the audit function increments for every key including those that may have expired (TTL returns -2), so the sample size may not exactly match the number of keys analyzed for TTL coverage. This is minor and doesn't affect practical utility.
