# Validation Summary: How to Listen for Key Expiration Events in Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (keyspace notifications, Pub/Sub, key expiration, TTL)
- Python (redis-py library, threading)
- Redis CLI

## Sources Consulted
- Redis Keyspace Notifications documentation: https://redis.io/docs/latest/develop/use/keyspace-notifications/
- Redis CONFIG SET command documentation: https://redis.io/docs/latest/commands/config-set/
- Redis server configuration (`hz` parameter) from official redis.conf
- redis-py library API (PubSub, config_set, subscribe, psubscribe, listen)

## Issues Found
No technical issues found.

## Review Notes
- The claim that "Replicas do not independently generate expiry events; the primary sends the event and the replica replicates the DEL" (Step 5) is accurate for Redis versions prior to 7.2. Starting with Redis 7.2, replicas gained the ability to independently expire keys and emit their own expiry notifications. Since the post does not target a specific Redis version, this is not an error, but could benefit from a version note in a future update.
- The database number extraction logic (`channel.split('@')[1].split('_')[0]`) works correctly for all valid Redis database numbers (0-15 by default, or higher if configured).
- The post correctly warns about the key limitation that the expired key's value is unavailable in the event handler, and suggests storing metadata separately — this is a common gotcha worth highlighting.
- The `hz` tuning advice is sound but could note in a future update that Redis 7+ introduced `dynamic-hz` (enabled by default) which automatically adjusts the effective hz based on connected clients.
