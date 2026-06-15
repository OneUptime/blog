# Validation Summary: How to Use Redis Sentinel for Failover

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- Redis Sentinel
- Docker Compose
- redis-py
- ioredis
- Jedis

## Sources Consulted
- Redis official Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- redis-py official documentation: https://redis.readthedocs.io/en/stable/connections.html
- ioredis official documentation: https://github.com/redis/ioredis
- Redis official Jedis guide: https://redis.io/docs/latest/develop/clients/jedis/
- Jedis source for RedisSentinelClient and client configuration APIs: https://github.com/redis/jedis

## Issues Found
- The Docker Compose example reused the standalone `sentinel.conf`, which monitored a fixed IP address and mounted one shared Sentinel config. Redis Sentinel requires a writable config file and Docker/port mapping needs care because Sentinel discovery can break through NAT. I changed the Compose example to generate a per-container writable Sentinel config, enable hostname support, and monitor `redis-master`.
- The redis-py examples passed the Sentinel password as `password` on the `Sentinel` constructor. redis-py uses `sentinel_kwargs` for Sentinel connection authentication, while `password` is for Redis server connections. I changed those examples to use `sentinel_kwargs={'password': 'sentinel-password'}` and kept Redis node passwords on `master_for()` and `slave_for()`.
- The ioredis example listened for `+failover-end` as if it were an ioredis client event. That is a Sentinel Pub/Sub event name, not a standard ioredis connection event. I replaced it with the supported `ready` event.
- The Java example used `JedisSentinelPool`, which current Jedis documentation marks as superseded by `RedisSentinelClient`, and it did not authenticate to password-protected Sentinel instances. I updated the example to use `RedisSentinelClient.builder()` with separate Redis and Sentinel `DefaultJedisClientConfig` passwords.
- The failover-aware Python snippet used `Sentinel` and `time` without importing them, and several Python snippets omitted authentication required by the article's Sentinel configuration. I added the missing imports and authentication arguments.

## Review Notes
- The article remains a practical Sentinel tutorial, but production deployments should also consider Redis' documented risk of acknowledged write loss during failover because Redis replication is asynchronous.
