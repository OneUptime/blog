# Validation Summary: How to Use FT._LIST in Redis to List All Search Indexes

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis (Redis Stack)
- RediSearch module (FT._LIST, FT.CREATE, FT.INFO, FT.DROPINDEX, FT.ALIASADD)
- Python redis-py client library

## Sources Consulted
- Redis official documentation for FT._LIST: https://redis.io/docs/latest/commands/ft._list/
- Redis official documentation for FT.CREATE: https://redis.io/docs/latest/commands/ft.create/
- Redis official documentation for FT.INFO: https://redis.io/docs/latest/commands/ft.info/
- Redis official documentation for FT.DROPINDEX: https://redis.io/docs/latest/commands/ft.dropindex/
- redis-py client library documentation: https://redis-py.readthedocs.io/

## Issues Found
No technical issues found.

## Review Notes
- The `FT.INFO` parsing pattern (`dict(zip(info[::2], info[1::2]))`) works correctly for top-level fields but would flatten nested structures (like `attributes` or `index_definition`) into single list values. This is fine for the fields accessed in the example (`num_docs` and `index_options`) but would need more careful handling for deeply nested fields. This is not an error in the post since the example only accesses top-level scalar/list fields.
- The underscore prefix explanation is accurate — `FT._LIST` has remained with the `_` prefix across RediSearch versions and has not been promoted to a non-underscore command name.
- The cleanup script uses `FT.DROPINDEX` which correctly drops only the index structure without deleting the underlying hash documents. This is the recommended command (the older `FT.DROP` which also deleted documents is deprecated).
