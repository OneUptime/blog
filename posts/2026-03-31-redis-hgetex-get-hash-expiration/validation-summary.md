# Validation Summary: How to Use HGETEX in Redis to Get Hash Fields with Expiration

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis 8.0+
- HGETEX command
- Hash field-level expiration (HEXPIRE, HTTL, HPTTL)
- HMGET (for comparison)

## Sources Consulted
- HGETEX official documentation: https://redis.io/docs/latest/commands/hgetex/
- HMGET official documentation: https://redis.io/docs/latest/commands/hmget/
- HEXPIRE official documentation: https://redis.io/docs/latest/commands/hexpire/
- HTTL official documentation: https://redis.io/docs/latest/commands/httl/
- HPTTL official documentation: https://redis.io/docs/latest/commands/hpttl/
- Redis 8.0 new commands reference: https://redis.io/docs/latest/commands/redis-8-0-commands/
- Redis 7.4 new commands reference: https://redis.io/docs/latest/commands/redis-7-4-commands/

## Issues Found

1. **Incorrect Redis version (High severity)**: The post stated HGETEX was introduced in Redis 7.4 in three places (description, intro section, summary). HGETEX was actually introduced in Redis 8.0. Redis 7.4 introduced hash field expiration commands (HEXPIRE, HTTL, etc.) but not HGETEX. Fixed all three occurrences to say Redis 8.0.

2. **Incorrect HMGET syntax in comparison table (High severity)**: The comparison table showed `HMGET key FIELDS ...` but HMGET does not use the `FIELDS` keyword. The correct syntax is `HMGET key field ...`. Fixed the table entry.

3. **Incorrect output in "Get multiple fields with expiry update" example (High severity)**: The example claimed that `user_id` would retain TTL -1 after `HGETEX session:xyz EX 1800 FIELDS 3 user_id token cache`. This is wrong — the EX option applies to ALL specified fields, so user_id also gets TTL 1800s. Fixed the output and explanation.

4. **Missing HEXPIRE output line for 2-field case (Low severity)**: In the same example, `HEXPIRE session:xyz 600 FIELDS 2 token cache` returns an array with 2 entries, but only one was shown. Added the missing second result line.

## Review Notes
- The HGETEX syntax, parameter options (EX, PX, EXAT, PXAT, PERSIST), and return value format are all correct per official documentation.
- The HEXPIRE, HTTL, and HPTTL commands used in examples have correct syntax and were correctly introduced in Redis 7.4.
- The mermaid diagram accurately depicts the HGETEX flow.
- The post claims HGETEX without an expiry option behaves "identically to HMGET." This is functionally correct (both return field values without modifying TTL), but there is a subtle difference: HGETEX is categorized as `@write` in Redis ACL categories while HMGET is `@read`, so they are not identical from a permissions perspective.
- The use cases listed are all valid and practical applications of HGETEX.
