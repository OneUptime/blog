# Validation Summary: How Redis Handles Key Expiration in Replicas

## Status
validated

## Post Type
Technical explainer / Guide

## Technologies Covered
- Redis (replication, key expiration, TTL, configuration)

## Sources Consulted
- Redis TTL command documentation: https://redis.io/docs/latest/commands/ttl/
- Redis replication documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/replication/
- Redis configuration reference (redis.conf for 7.0): https://raw.githubusercontent.com/redis/redis/7.0/redis.conf

## Issues Found

1. **Incorrect claim about TTL returning negative values**: The post stated "TTL checks use the local clock on the replica and can return negative values for expired-but-not-yet-deleted keys." This is incorrect. The `TTL` command only returns `-2` (key does not exist), `-1` (no expiry set), or a positive integer (remaining TTL). It never returns arbitrary negative values. Fixed the note to accurately describe TTL return values and the Redis 3.2 behavior.

2. **Misleading description of `replica-serve-stale-data`**: The post used the old config name `slave-serve-stale-data` (also with incorrect underscore form `slave_serve_stale_data` in text) and described it as affecting behavior "during replication lag." In reality, this config only applies when the replica has lost connection to the primary or during initial synchronization — not during normal connected replication with minor lag. Updated to use the modern `replica-serve-stale-data` name and corrected the description.

3. **Code example misleading for modern Redis**: The GET example on a replica after key expiration showed the comment "Might return 'value'" without clarifying this is pre-3.2 behavior. Since Redis 3.2, replicas return nil for logically expired keys using their local clock. Added version qualification to the code comment.

4. **Bullet point about expired keys being readable**: The claim "Expired keys on replicas remain readable until the primary sends DEL" was stated unconditionally but is only true for Redis < 3.2. Qualified the statement with version context.

## Review Notes
- The config name `slave-serve-stale-data` was renamed to `replica-serve-stale-data` in Redis 5.0 as part of the terminology change from "slave" to "replica." The old name still works as an alias. The post was updated to use the modern name.
- The core model described (primary-driven expiration with DEL propagation) is accurate and well-explained.
- The Redis 3.2 behavior change section is accurate — replicas use their logical clock to filter expired keys at read time, even before receiving DEL from the primary.
