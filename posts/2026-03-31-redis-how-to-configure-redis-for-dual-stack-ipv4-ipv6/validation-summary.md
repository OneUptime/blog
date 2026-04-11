# Validation Summary: How to Configure Redis for Dual-Stack (IPv4 + IPv6)

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Redis (server configuration, `bind` directive, `bind-source-addr`)
- IPv4 and IPv6 dual-stack networking
- Python `redis-py` client library
- Node.js `ioredis` client library
- Linux firewall tools (UFW, iptables, ip6tables)
- Linux networking tools (`ss`, `netstat`)

## Sources Consulted
- Redis 7.0 redis.conf (https://raw.githubusercontent.com/redis/redis/7.0/redis.conf) — verified `bind-source-addr` is present
- Redis 7.0 release notes (https://raw.githubusercontent.com/redis/redis/7.0/00-RELEASENOTES) — confirmed `bind-source-addr` introduced in 7.0
- Redis 6.2 redis.conf (https://raw.githubusercontent.com/redis/redis/6.2/redis.conf) — confirmed `bind-source-addr` is NOT present
- Redis 6.2 release notes (https://raw.githubusercontent.com/redis/redis/6.2/00-RELEASENOTES) — confirmed no mention of `bind-source-addr`
- Redis official documentation on the `bind` directive
- RFC 5952 (canonical IPv6 address representation)
- ioredis documentation for `family` option
- redis-py documentation for IPv6 host support

## Issues Found
1. **Incorrect version for `bind-source-addr`**: The post stated "Redis 6.2 added `bind-source-addr`" and used the heading "Redis 6.2+ bind-source-addr". This is incorrect — `bind-source-addr` was introduced in Redis 7.0, not 6.2. This was confirmed by checking both the Redis 7.0 and 6.2 config files and release notes. Fixed the heading to "Redis 7.0+ bind-source-addr" and the text to "Redis 7.0 added `bind-source-addr`".

## Review Notes
- The post uses `::0` as the IPv6 wildcard address throughout. While `::0` and `::` are equivalent IPv6 addresses (both represent the all-zeros unspecified address), `::` is the canonical form per RFC 5952 and is what Redis's own documentation uses. This is not technically wrong, but `::` would be more conventional.
- The `bind` directive syntax and behavior changed in Redis 7.0 (introducing `*` and `::*` shorthand, and the `-` prefix for optional binds). The post's approach using `bind 0.0.0.0 ::0` works across all Redis versions, which is a reasonable choice.
- All code examples (Python redis-py, Node.js ioredis) are syntactically correct and use current APIs.
- The firewall rules are correct. The use of `fd00::/8` for IPv6 ULA addresses is appropriate as an analogue to `10.0.0.0/8` for IPv4 private addresses.
- The `redis-cli` commands for testing IPv6 connectivity are correct.
