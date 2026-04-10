# Validation Summary: How to Set Up Redis Cloud by Redis Inc.

## Status
validated

## Post Type
Tutorial / Setup Guide

## Technologies Covered
- Redis Cloud (managed service by Redis Inc.)
- redis-cli (CLI client with TLS)
- Node.js with ioredis
- Python with redis-py
- Redis Stack modules (RediSearch, RedisJSON)
- Redis persistence options (AOF, RDB snapshots)

## Sources Consulted
- Redis Cloud documentation: https://redis.io/docs/latest/operate/rc/
- Redis Stack module availability: https://redis.io/docs/latest/operate/oss_and_stack/stack-with-enterprise/
- RedisGraph end-of-life announcement: https://redis.io/blog/redisgraph-eol/
- ioredis TLS configuration: https://github.com/redis/ioredis#tls-options
- redis-py SSL documentation: https://redis-py.readthedocs.io/en/stable/examples/ssl_connection_examples.html
- RediSearch FT.CREATE command reference: https://redis.io/docs/latest/commands/ft.create/

## Issues Found

1. **RedisGraph listed as available module** — The intro paragraph listed "RedisGraph" as one of the Redis Stack modules available out of the box. RedisGraph reached end-of-life in early 2025 and has been removed from Redis Stack. Replaced with "RedisTimeSeries," which is an active Redis Stack module.

2. **redis-cli prompt showed `127.0.0.1` for a remote connection** — The example output after connecting to a remote Redis Cloud instance showed `127.0.0.1:12345>` as the prompt. When connected to a remote host, redis-cli displays the remote hostname in the prompt. Changed to `redis-12345.c1.us-east-1-1.ec2.cloud.redislabs.com:12345>` to match the connection target.

## Review Notes
- The Python example uses `execute_command("JSON.SET", ...)` for RedisJSON operations. While this works, modern redis-py (4.x+) provides a dedicated `client.json()` interface (e.g., `client.json().set(...)`). The current approach is not wrong but could be modernized in a future update.
- The Node.js example uses `require()` (CommonJS). An ES module (`import`) variant could be offered as an alternative in a future revision, but this is not an error.
- The free tier details (30 MB, no credit card) were accurate at the time of writing but may change; readers should verify current offering at signup.
