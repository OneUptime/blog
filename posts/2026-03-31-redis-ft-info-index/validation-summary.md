# Validation Summary: How to Use FT.INFO in Redis to Get Search Index Information

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis (Redis Stack)
- RediSearch module (FT.INFO, FT.CREATE, FT._LIST)
- redis-py Python client library
- Bash scripting with redis-cli

## Sources Consulted
- Redis official documentation for FT.INFO: https://redis.io/docs/latest/commands/ft.info/
- Redis official documentation for FT.CREATE: https://redis.io/docs/latest/commands/ft.create/
- Redis official documentation for FT._LIST: https://redis.io/docs/latest/commands/ft._list/
- redis-py library documentation and source (SearchCommands.info() method)

## Issues Found
No technical issues found.

## Review Notes
- The FT.INFO output example is representative and consistent with RediSearch behavior. Exact numeric values (num_terms, num_records, etc.) will vary by environment but the field names and structure are correct.
- The `index_errors` field mentioned in the "Checking for Indexing Failures" section is available in RediSearch 2.6+ (Redis Stack 7.2+). Older versions may not include this field. The post does not specify a version requirement, which is acceptable since most current deployments use Redis Stack 7.2+.
- The Python code uses `r.ft(index_name).info()` which returns a dict in redis-py 4.x and 5.x, making the `.get()` calls correct. Without `decode_responses=True`, the search module's response parser still handles decoding for the `info()` method.
- `FT._LIST` is the current standard command. Future Redis versions may transition to `FT.LIST` (without underscore), but `FT._LIST` remains correct for current Redis Stack releases.
- The bash monitoring script's awk approach works correctly with redis-cli's non-interactive output format where FT.INFO fields and values appear on alternating lines.
