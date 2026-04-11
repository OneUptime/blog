# Validation Summary: How to Use Redis ACL Channels for Pub/Sub Security

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis 6.2+ ACL system
- Redis Pub/Sub (SUBSCRIBE, PUBLISH, PSUBSCRIBE, PUNSUBSCRIBE, UNSUBSCRIBE)
- Redis 7.0+ Sharded Pub/Sub (SSUBSCRIBE, SUNSUBSCRIBE)
- Redis ACL channel permissions (`&` prefix, `resetchannels`)

## Sources Consulted
- Redis ACL documentation: https://redis.io/docs/latest/commands/acl-setuser/
- Redis ACL GETUSER documentation: https://redis.io/docs/latest/commands/acl-getuser/
- Redis SSUBSCRIBE documentation: https://redis.io/docs/latest/commands/ssubscribe/
- Redis Pub/Sub documentation: https://redis.io/docs/latest/develop/interact/pubsub/
- Redis 6.2 release notes (channel ACL introduction)
- Redis 7.0 release notes (sharded pub/sub, `acl-pubsub-default` config change)

## Issues Found

1. **Incorrect Redis version for channel ACL introduction (line 11):** The post stated channel permissions were "introduced in Redis 6." Channel ACL permissions (the `&` prefix) were actually introduced in Redis 6.2, not Redis 6.0. The base ACL system was introduced in Redis 6.0, but channel-specific permissions came in 6.2. Changed "Redis 6" to "Redis 6.2."

2. **Incomplete `&*` default behavior description (line 19):** The post stated `&*` is the "default for backward compatibility" without version context. This is only true for Redis 6.2; in Redis 7.0+ the default changed to `resetchannels` (restrictive) via the `acl-pubsub-default` configuration directive. Updated to clarify version-specific default behavior.

3. **Missing `resetchannels` in notif-consumer example (line 28):** The `notif-consumer` ACL SETUSER command did not include `resetchannels` before the channel pattern. Without it, on Redis 6.2 (where the default is `allchannels`), adding `&notifications:*` would not actually restrict channels — it would just add to the already-permitted all channels. All other examples in the post correctly included `resetchannels`. Added `resetchannels` before `&notifications:*` for correctness and consistency.

## Review Notes
- PSUBSCRIBE uses literal pattern matching against ACL channel rules, not glob matching. This means `PSUBSCRIBE "metrics:cpu:*"` with only `&metrics:*` allowed would fail, even though `metrics:cpu:*` is logically a subset of `metrics:*`. The blog's examples work correctly because the PSUBSCRIBE patterns match the ACL patterns literally, but this subtlety is not mentioned. This could be a useful addition in a future revision.
- The error message `(error) NOPERM No permissions to access a channel` uses the unified format from Redis 7.0+. Older Redis 6.x versions used a slightly different wording. This is fine since the post targets modern Redis.
