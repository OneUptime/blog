# Validation Summary: How to Implement Multi-Tenancy with Redis ACLs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (ACL system, introduced in Redis 6.0)
- Redis ACL commands (SETUSER, DELUSER, LIST, GETUSER, LOG, SAVE)
- Python redis-py client library
- Redis Cluster (mentioned in comparison)

## Sources Consulted
- Redis ACL SETUSER command documentation (version history confirms `&` channel patterns added in 6.2.0): https://redis.io/docs/latest/commands/acl-setuser/
- Redis ACL LOG command documentation (field listing): https://redis.io/docs/latest/commands/acl-log/
- Redis ACL overview: https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/
- Redis SELECT command documentation (cluster database limitation): https://redis.io/docs/latest/commands/select/
- redis-py exceptions source (confirms NoPermissionError class): https://github.com/redis/redis-py/blob/master/redis/exceptions.py

## Issues Found

1. **Missing version note for `&` (Pub/Sub channel pattern) selector**: The `&alpha:*` and `&beta:*` syntax in the ACL SETUSER examples requires Redis 6.2+, not 6.0. The post opens by saying ACLs are "available since Redis 6.0" which is true for the ACL system overall, but a reader on Redis 6.0 would get an error when using the `&` channel pattern. **Fix:** Added "(requires Redis 6.2+)" to the explanation of the `&` selector.

2. **Incomplete ACL LOG output**: The example output for `ACL LOG` was missing three fields that are always present in actual Redis output: `context`, `age-seconds`, and `client-info`. The original showed only count, reason, object, and username. A reader comparing actual output to the blog would see a mismatch. **Fix:** Added the missing `context`, `age-seconds`, and `client-info` fields to the example output.

## Review Notes
- Redis Cluster supports ACLs (correctly marked "Yes" in the comparison table), but ACL configurations must be managed independently on each cluster node — there is no built-in ACL synchronization across nodes. This is an operational detail the post does not mention but could be valuable for readers deploying in production.
- The `redis.exceptions.NoPermissionError` exception class in redis-py was verified as correct.
- The default of 16 Redis databases (0-15) and the Redis Cluster limitation to database 0 are both correctly represented in the comparison table.
- The `ACL LOG` output also gained additional fields (`entry-id`, `timestamp-created`, `timestamp-last-updated`) in Redis 7.2+, which the post does not cover but is not required since the post targets Redis 6.x.
