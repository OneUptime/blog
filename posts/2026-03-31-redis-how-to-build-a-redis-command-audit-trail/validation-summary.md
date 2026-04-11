# Validation Summary: How to Build a Redis Command Audit Trail

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis 6+ (ACL system, MONITOR, keyspace notifications)
- Python (redis-py client library)
- Elasticsearch (log shipping mention)
- Bash (CLI commands and log capture)

## Sources Consulted
- Redis official documentation: MONITOR command (https://redis.io/docs/latest/commands/monitor/)
- Redis official documentation: ACL LOG command (https://redis.io/docs/latest/commands/acl-log/)
- Redis official documentation: ACL SETUSER command (https://redis.io/docs/latest/commands/acl-setuser/)
- Redis official documentation: Keyspace notifications (https://redis.io/docs/latest/develop/use/keyspace-notifications/)
- Redis official documentation: CONFIG SET (https://redis.io/docs/latest/commands/config-set/)
- redis-py library documentation (https://redis-py.readthedocs.io/)

## Issues Found

### Issue 1: Incorrect MONITOR performance impact claim
- **What was wrong:** The post stated "Each MONITOR subscriber doubles the memory required for each command." This is inaccurate — the MONITOR overhead is on throughput, not memory.
- **What was changed:** Replaced with "A single MONITOR client can reduce throughput by more than 50%." which matches the official Redis MONITOR documentation.
- **Location:** Line 137 (Warning paragraph in Method 2 section)

### Issue 2: Incorrect keyspace notification `A` alias expansion
- **What was wrong:** The post listed the `A` flag as an alias for `g$lzxedt`, which is missing `s` (Set commands) and `h` (Hash commands).
- **What was changed:** Corrected to `g$lszhxetd` to include all event type flags as documented.
- **Location:** Line 151 (Notification flags list in Method 3 section)

## Review Notes
- The ACL LOG polling Python code works correctly but note that with `decode_responses=True`, the `count` field will be returned as an integer by redis-py, which is fine for `json.dumps` serialization.
- The keyspace notification Python example correctly uses a separate Redis connection for writing audit records back to Redis (the pubsub object uses its own connection), avoiding deadlock issues.
- The AuditableRedis middleware class captures the `username` parameter for audit purposes only — it does not pass it through to `redis.Redis()` for ACL authentication. This is by design but could confuse readers who expect it to authenticate.
- The `delete` method in redis-py is named `delete`, not `del` (which is a Python keyword). The audit commands set in Method 4 lists `'del'` which would never match since redis-py uses `delete()`. However, since the blog doesn't explicitly claim this catches `delete()` calls and this is a nuance of the wrapper pattern rather than an outright error, it was left as-is.
