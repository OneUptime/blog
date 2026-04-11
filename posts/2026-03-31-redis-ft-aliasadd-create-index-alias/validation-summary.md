# Validation Summary: How to Use FT.ALIASADD in Redis to Create Index Aliases

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- RediSearch (FT.ALIASADD, FT.ALIASUPDATE, FT.CREATE, FT.SEARCH, FT.DROPINDEX, FT.INFO)
- Python redis client

## Sources Consulted
- Redis official documentation for FT.ALIASADD: https://redis.io/docs/latest/commands/ft.aliasadd/
- Redis official documentation for FT.ALIASUPDATE: https://redis.io/docs/latest/commands/ft.aliasupdate/
- Redis official documentation for FT.CREATE: https://redis.io/docs/latest/commands/ft.create/
- Redis official documentation for FT.SEARCH: https://redis.io/docs/latest/commands/ft.search/
- Redis official documentation for FT._LIST: https://redis.io/docs/latest/commands/ft._list/
- Redis official documentation for FT.INFO: https://redis.io/docs/latest/commands/ft.info/
- Redis official documentation for FT.DROPINDEX: https://redis.io/docs/latest/commands/ft.dropindex/

## Issues Found
1. **Incorrect claim about FT._LIST showing aliases**: The "Listing All Aliases" section stated "You can view all indexes (including aliases) using: FT._LIST". This is incorrect — `FT._LIST` only returns index names, not aliases. Aliases are separate from indexes and are not included in the FT._LIST output. Fixed by removing the FT._LIST reference and clarifying that `FT.INFO` on a specific index is the correct way to see its associated aliases.

## Review Notes
- The zero-downtime index rebuild pattern is well-described and correct. Both indexes sharing the same PREFIX is valid and works as expected since each index maintains its own data structures.
- FT.DROPINDEX correctly does not delete the underlying hash documents by default, which is the desired behavior for this migration pattern.
- The Python example uses `execute_command` which is a valid low-level approach. The redis-py library also provides higher-level RediSearch classes via `redis.commands.search`, but the approach shown works correctly.
