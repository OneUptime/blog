# Validation Summary: How to Use Redis Sentinel with PHP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Sentinel
- PHP
- Predis (PHP Redis client library)
- phpredis (PHP Redis extension)

## Sources Consulted
- Predis GitHub repository source code (predis/predis) — `src/Configuration/Option/Replication.php` and `src/Replication/SentinelReplication.php` for Sentinel configuration options
- phpredis GitHub repository documentation — `sentinel.md` for `RedisSentinel` class API and `getMasterAddrByName()` return format
- phpredis changelog — `RedisSentinel` class introduced in version 5.2.0 (2020)
- phpredis `ping()` documentation — return value changed from string `+PONG` to boolean `true` in phpredis 5.0.0
- Redis official documentation — Sentinel configuration directives (`sentinel monitor`, `sentinel down-after-milliseconds`, `sentinel failover-timeout`, `sentinel parallel-syncs`)

## Issues Found

1. **Incorrect claim about phpredis Sentinel support** (line 54): The post stated "phpredis does not have native Sentinel support." This is factually incorrect — phpredis has provided native Sentinel support via the `RedisSentinel` class since version 5.2.0 (released 2020). Updated the text to accurately describe phpredis's Sentinel capabilities.

2. **`getSentinelPrimary` used `rawCommand` instead of `RedisSentinel` class** (lines 57–72): The function used `$s->rawCommand('SENTINEL', 'get-master-addr-by-name', $masterName)` on a generic `Redis` instance, which is a legacy workaround from before the `RedisSentinel` class existed. Replaced with the proper `RedisSentinel` class and its `getMasterAddrByName()` method.

3. **Health check PING comparison broken on modern phpredis** (lines 139–150): The function used `$s->rawCommand('PING')` and compared the result to the strings `'+PONG'` and `'PONG'`. In phpredis 5.0+, `rawCommand('PING')` returns boolean `true`, not a string, so neither comparison would match — making the health check always return `false`. Replaced with `$s->ping() === true`, which is the correct check for phpredis 5.0+.

## Review Notes
- The Predis Sentinel configuration (`'replication' => 'sentinel'`, `'service' => 'mymaster'`) is correct for Predis 2.x.
- The Sentinel configuration directives shown are all valid and use reasonable values.
- Predis read/write routing with Sentinel works as described, though there is a subtle behavior: once Predis switches to the master for a write, it stays on the master for all subsequent commands in that session (it does not switch back to a replica for later reads). This is a deliberate consistency design choice by Predis but is not mentioned in the post.
- The `RedisSentinel` constructor uses positional arguments (`$host, $port, $timeout`), which works in phpredis 5.2+. In phpredis 6.0+, the constructor was updated to accept an associative options array; the positional style still works but triggers a deprecation notice. A future update could mention this version difference.
