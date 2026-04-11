# Validation Summary: How to Use HTTL and HPTTL in Redis for Hash Field Time-to-Live

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis 7.4+ (Open Source 7.4.0)
- HTTL command (hash field TTL in seconds)
- HPTTL command (hash field TTL in milliseconds)
- HEXPIRE command (set hash field expiration)
- Redis hash data structures

## Sources Consulted
- Official Redis HTTL documentation: https://redis.io/docs/latest/commands/httl/
- Official Redis HPTTL documentation: https://redis.io/docs/latest/commands/hpttl/
- Official Redis HEXPIRE documentation: https://redis.io/docs/latest/commands/hexpire/

## Issues Found

### 1. Missing HEXPIRE return value in "Check multiple fields at once" example
- **What was wrong:** The `HEXPIRE user:1 3600 FIELDS 2 token cache` command operates on 2 fields and returns an array with 2 elements, but the output block only showed one element (`1) (integer) 1`), omitting the second (`2) (integer) 1`).
- **What was changed:** Added the missing `2) (integer) 1` line to the output block.
- **Why:** Per the official Redis docs, HEXPIRE returns one array entry per field. With `FIELDS 2`, two results must be shown.

### 2. Missing HEXPIRE return value in "Monitoring expiring fields" example
- **What was wrong:** Same issue as above. `HEXPIRE session:xyz 60 FIELDS 2 token temp_data` returns 2 array elements, but only one was shown in the output.
- **What was changed:** Added the missing `2) (integer) 1` line to the output block.
- **Why:** Same reason — HEXPIRE returns one result per field specified.

## Review Notes
- The syntax, return value semantics (-1 for no expiry, -2 for nonexistent field), and version information (Redis 7.4+) are all accurate per the official documentation.
- The post does not mention that HTTL/HPTTL return `(nil)` when the key itself does not exist (as opposed to -2 when the field doesn't exist within an existing key). This is a minor omission but not an error.
- The command syntax correctly includes the required `FIELDS` keyword and `numfields` parameter.
- All HSET, HEXPIRE, HTTL, and HPTTL commands use correct syntax throughout the post.
