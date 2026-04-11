# Validation Summary: How to Use HSETEX in Redis to Set Hash Fields with Expiration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis 8.0+
- HSETEX command (hash field set with expiration)
- HTTL / HPTTL (hash field TTL inspection)
- HEXPIRE (hash field expiration, pre-8.0 approach)
- HGETDEL (hash get-and-delete)

## Sources Consulted
- [HSETEX | Redis Official Documentation](https://redis.io/docs/latest/commands/hsetex/) — confirmed syntax, version (8.0.0), return values, and all options (FNX, FXX, EX, PX, EXAT, PXAT, KEEPTTL)
- [HGETDEL | Redis Official Documentation](https://redis.io/docs/latest/commands/hgetdel/) — confirmed existence and Redis 8.0 availability
- [Redis 8.0 Commands Reference](https://redis.io/docs/latest/commands/redis-8-0-commands/) — confirmed HSETEX is a Redis 8.0 command, not 7.4

## Issues Found

1. **Wrong version (critical):** The post claimed HSETEX was introduced in Redis 7.4. It was actually introduced in **Redis 8.0.0**. Redis 7.4 introduced HEXPIRE/HTTL and related per-field expiration commands, but not HSETEX. Fixed all version references throughout the post.

2. **Wrong command syntax (critical):** The post used `HSETEX key seconds FIELDS ...` with seconds as a bare positional argument. The actual syntax requires the `EX` keyword: `HSETEX key EX seconds FIELDS ...`. Fixed all command examples.

3. **HPSETEX does not exist (critical):** The post described a `HPSETEX` command for millisecond-precision TTLs. This command does not exist. HSETEX itself supports millisecond precision via the `PX milliseconds` option. Removed all HPSETEX references and replaced with `HSETEX ... PX ...`.

4. **Wrong return value description:** The post stated HSETEX "Returns the number of new fields created (same as HSET)." The actual return value is `1` if all fields were set, or `0` if no fields were set. Fixed the description and corrected the output in the multiple-fields example (showed `(integer) 2` but should be `(integer) 1`).

5. **Missing command options:** The original syntax section omitted the FNX, FXX, EXAT, PXAT, and KEEPTTL options. Added complete syntax with all options documented.

6. **Mermaid diagram used wrong syntax:** Updated to show `EX 3600` instead of bare `3600`, and corrected the return value description.

## Review Notes
- The HTTL and HPTTL command usage in the examples is correct.
- The HEXPIRE syntax shown in the "before" comparison is correct (it was available since Redis 7.4).
- The comparison table claiming HSET + HEXPIRE is "not atomic" is fair — they are two separate commands and without MULTI/EXEC there is no atomicity guarantee. However, in a MULTI/EXEC block they would be atomic, which the table does not mention. This is a minor nuance, not an error.
- HGETDEL mentioned in the summary is a valid Redis 8.0 command.
