# Validation Summary: How to Set Up Redis Audit Logging with ACL LOG

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis 6.0+ (ACL system, ACL LOG)
- Redis CLI (`redis-cli`)
- Python (`redis-py` library)
- SIEM integration via HTTP/REST

## Sources Consulted
- Redis ACL LOG documentation: https://redis.io/docs/latest/commands/acl-log/
- Redis ACL SETUSER documentation: https://redis.io/docs/latest/commands/acl-setuser/
- Redis ACL documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/
- Redis MONITOR documentation: https://redis.io/docs/latest/commands/monitor/
- redis-py library API reference for `acl_log()` method

## Issues Found
1. **Incorrect `redis-cli` authentication command in "Triggering ACL LOG Entries"**: The original command `redis-cli -a readonlypass AUTH readonly readonlypass` was incorrect. The `-a` flag authenticates as the default user with the given password, but the default user was disabled in the prior section, so the connection would fail before the `AUTH` command is even sent. Replaced with `redis-cli --user readonly --pass readonlypass SET mykey value`, which correctly authenticates as the `readonly` user and attempts the denied write command in a single invocation.

## Review Notes
- The `&*` Pub/Sub channel selector used in `ACL SETUSER` commands requires Redis 6.2+, not 6.0. The post correctly states ACL was introduced in 6.0, but readers on 6.0 or 6.1 would need to omit `&*` from those commands.
- The Python code imports `json` and `datetime` but does not use them. Similarly, the SIEM export code imports `json` without using it. These are unused imports but do not cause errors.
- The SIEM export code's mechanism for tracking already-sent entries via `LAST_SENT_COUNT` is fragile — the ACL LOG is a circular buffer and entries can be evicted when the buffer is full, which could cause missed or duplicate entries. This is acceptable for a simplified example but should not be used in production as-is.
- The comment listing `'auth'` as a possible ACL LOG reason may not be accurate for all Redis versions. The documented reasons are `command`, `key`, and `channel`. Auth-related logging may depend on the specific Redis version.
- The comparison table correctly notes MONITOR's 50%+ performance overhead, which aligns with the official Redis documentation warning.
