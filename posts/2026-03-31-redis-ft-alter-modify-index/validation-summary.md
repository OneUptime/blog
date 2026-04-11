# Validation Summary: How to Use FT.ALTER in Redis to Modify Search Indexes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- RediSearch (FT.ALTER, FT.CREATE, FT.SEARCH, FT.INFO, FT.DROPINDEX)
- Redis GEO field type and geo queries

## Sources Consulted
- Official Redis FT.ALTER documentation: https://redis.io/docs/latest/commands/ft.alter/
- Official Redis FT.CREATE documentation: https://redis.io/docs/latest/commands/ft.create/
- Official Redis FT.SEARCH documentation: https://redis.io/docs/latest/commands/ft.search/

## Issues Found

1. **SKIPINITIALSCAN logic inverted in introduction**: The post stated that existing keys are re-indexed "if you use `SKIPINITIALSCAN` carefully," which inverts the meaning. SKIPINITIALSCAN *prevents* re-indexing of existing documents. Without it, existing documents are re-indexed by default. Fixed to clarify that re-indexing happens by default and SKIPINITIALSCAN suppresses it.

2. **Basic syntax missing SKIPINITIALSCAN parameter**: The syntax block omitted the optional `[SKIPINITIALSCAN]` parameter that appears between the index name and `SCHEMA ADD` in the official documentation. Added it.

3. **GEO coordinate order reversed in HSET example**: The example used `"51.5074,-0.1278"` for London, but 51.5074 is the latitude and -0.1278 is the longitude. Redis GEO fields require `"longitude,latitude"` format. Fixed to `"-0.1278,51.5074"`.

4. **GEO coordinate order reversed in FT.SEARCH query**: The query used `@location:[51.5 -0.12 5 km]` with latitude first. The correct syntax is `@location:[longitude latitude radius unit]`. Fixed to `@location:[-0.12 51.5 5 km]`.

## Review Notes
- The post claims FT.ALTER supports adding multiple fields in a single command. While the official docs show a single-field syntax example, this does work in practice and is widely documented in Redis tutorials.
- The Summary section lists supported field types as TEXT, NUMERIC, TAG, GEO, and VECTOR. Redis also supports GEOSHAPE as a field type, which is not mentioned. This is a minor omission rather than an error.
- The bash script for manual re-indexing is a reasonable workaround but adds a dummy `_indexed` field to every key. A note that this field could be cleaned up afterward might be helpful.
