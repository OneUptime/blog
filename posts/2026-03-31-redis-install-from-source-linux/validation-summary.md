# Validation Summary: How to Install Redis from Source on Linux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis 7.2.4
- Linux (Ubuntu/Debian, RHEL/CentOS/Amazon Linux)
- systemd service management
- TLS/SSL configuration for Redis

## Sources Consulted
- Redis official documentation: https://redis.io/docs/getting-started/installation/install-redis-from-source/
- Redis source Makefile and README (build flags: `BUILD_TLS`, `USE_SYSTEMD`, default allocator selection)
- Redis configuration file documentation: https://redis.io/docs/management/config/
- systemd service unit documentation

## Issues Found

1. **Incorrect default memory allocator in example output (line 50)**: The example `redis-server --version` output showed `malloc=libc`, but Redis defaults to `jemalloc` on Linux (not `libc`). Changed to `malloc=jemalloc`.

2. **Hardcoded user home path in config copy command (line 71)**: The command `sudo cp /home/user/redis-7.2.4/redis.conf /etc/redis/redis.conf` used a hardcoded `/home/user/` path that would not work for most users. Changed to `sudo cp ~/redis-7.2.4/redis.conf /etc/redis/redis.conf` which uses the home directory shorthand and works regardless of the username.

## Review Notes
- The `supervised systemd` config directive is included but the build command does not include `USE_SYSTEMD=yes`, and the systemd unit file does not use `Type=notify`. This is consistent (systemd will use default `Type=simple` behavior), but users wanting proper systemd readiness notification should build with `make USE_SYSTEMD=yes` and add `Type=notify` to the service file. This is not an error but could be mentioned in a future update.
- The Redis version 7.2.4 referenced in the post is a valid release. Readers should check redis.io for the latest stable version, as the post already suggests.
- The `bind 127.0.0.1` directive is correct for localhost-only access. Redis 7.x defaults to `bind 127.0.0.1 -::1` (including IPv6 loopback); the post's setting is a valid and slightly more restrictive choice.
