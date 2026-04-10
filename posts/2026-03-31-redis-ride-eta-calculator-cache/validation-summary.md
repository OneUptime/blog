# Validation Summary: How to Build a Ride ETA Calculator Cache with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (geospatial commands: GEOADD, GEOSEARCH; key-value: GET, SETEX, HSET, EXPIRE)
- Python (redis-py client library)
- Geospatial indexing and coordinate hashing for cache keys

## Sources Consulted
- Redis GEOADD documentation: https://redis.io/docs/latest/commands/geoadd/
- Redis GEOSEARCH documentation: https://redis.io/docs/latest/commands/geosearch/
- Redis GEORADIUS deprecation notice (deprecated since Redis 6.2 in favor of GEOSEARCH): https://redis.io/docs/latest/commands/georadius/
- redis-py Python client documentation: https://redis-py.readthedocs.io/en/stable/
- redis-py `geoadd` signature (accepts flat list `[lon, lat, member, ...]`): https://redis-py.readthedocs.io/en/stable/commands.html#redis.commands.core.CoreCommands.geoadd
- redis-py `geosearch` return format with `withcoord`/`withdist` flags

## Issues Found
1. **Typo and outdated command name in Architecture section**: The text referenced `GEOIRADIUS` (misspelled — the actual Redis command is `GEORADIUS`). Additionally, `GEORADIUS` has been deprecated since Redis 6.2 in favor of `GEOSEARCH`, which is what the code correctly uses. Fixed the Architecture description to reference `GEOSEARCH` to match the code and current Redis best practices.

## Review Notes
- The `ETA_PREFIX` constant is defined in Setup but never used in the code. This is harmless but could be cleaned up in a future revision.
- The placeholder `call_routing_api` uses a simplified Euclidean distance formula (`sqrt(dlat^2 + dlon^2) * 111`) that doesn't apply the longitude cosine correction. This is explicitly labeled as a placeholder, so it's acceptable, but a note about the approximation's limitations at non-equatorial latitudes could be helpful.
- The `geoadd` call uses the list-based API (`geoadd(name, [lon, lat, member])`) which is correct for redis-py >= 4.1.2. Older versions used positional args.
- All other Redis commands (`geosearch`, `hset`, `hgetall`, `setex`, `expire`, `pipeline`) are used correctly with proper argument ordering and types.
- The `geosearch` return value destructuring correctly handles the `(member, distance, (lon, lat))` format when both `withcoord=True` and `withdist=True` are set.
