# Validation Summary: How to Choose Between Predis and phpredis

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis
- PHP
- Predis (pure PHP Redis client)
- phpredis (C extension Redis client)
- Composer
- PECL

## Sources Consulted
- [phpredis official API documentation](https://phpredis.github.io/phpredis/Redis.html) — verified OPT_ constants and SERIALIZER_ constants
- [phpredis GitHub repository](https://github.com/phpredis/phpredis) — checked README for connection, setOption, and error handling documentation
- [Relay options documentation](https://relay.so/docs/1.x/options) — confirmed OPT_THROW_ON_ERROR is a Relay-specific option, not phpredis
- [Predis GitHub repository](https://github.com/predis/predis) — verified Predis API and connection setup
- [phpredis issue #246 (Add JSON serializer)](https://github.com/phpredis/phpredis/issues/246) — confirmed Redis::SERIALIZER_JSON exists in phpredis

## Issues Found
- **Incorrect phpredis error handling constant**: The post used `Redis::OPT_THROW_ON_ERROR` to enable exceptions in phpredis. This constant does not exist in the phpredis extension — it is a Relay-specific option (Relay is a separate Redis client that is API-compatible with phpredis). In phpredis, `RedisException` is thrown automatically for connection failures and read/write errors, but command-level errors return `false`. There is no setOption flag to globally enable exceptions for all errors. Fixed the code example and description to accurately reflect phpredis behavior: wrapping `connect()` and commands in a try/catch for `RedisException`.

## Review Notes
- The performance benchmark numbers (phpredis ~150k ops/sec vs Predis ~30k ops/sec) are approximate and in line with commonly cited benchmarks, though actual numbers vary significantly by hardware, PHP version, and Redis configuration.
- `Redis::SERIALIZER_JSON` was added in phpredis 5.3.2 and can be disabled at compile time with `--disable-redis-json`. The post does not mention version requirements, which is acceptable for a general guide.
- The feature comparison table accurately reflects the current state of both libraries.
