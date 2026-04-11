# Validation Summary: How to Use DEBUG SLEEP in Redis for Testing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (DEBUG SLEEP command)
- Redis Sentinel (failover testing)
- Redis ACL (permissions)
- Python redis-py client library
- Node.js ioredis client library

## Sources Consulted
- Redis DEBUG command documentation (https://redis.io/docs/latest/commands/debug/)
- Redis Sentinel documentation (https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/) — verified Pub/Sub notification channel names
- ioredis GitHub repository and documentation — verified `commandTimeout` option (available since v4.25.0) and `redis.debug()` method support
- redis-py documentation — verified `socket_timeout`, `socket_connect_timeout`, `execute_command()`, and `TimeoutError` exception

## Issues Found
1. **Incorrect Sentinel Pub/Sub channel name**: The Sentinel SUBSCRIBE example used `+failover-triggered`, which is not a valid Redis Sentinel notification channel. Changed to `+try-failover`, which is the correct channel name published when a Sentinel begins a failover attempt. Source: official Redis Sentinel documentation.

## Review Notes
- The ioredis code example omits the `import Redis from 'ioredis'` statement and uses top-level `await`, which is a common blog post convention and not an error.
- The `commandTimeout` option in ioredis was introduced in v4.25.0 (April 2021) and is valid for current versions.
- The ACL subcommand syntax `+debug|sleep` is specific to Redis 7+. The post does not mention this version requirement, which could be noted in a future update.
- The post correctly warns against using DEBUG SLEEP in production, which is important safety guidance.
