# Validation Summary: What Is New in Redis 8.0 (Vector Sets, Integrated Modules)

## Status
validated

## Post Type
Reference / Overview

## Technologies Covered
- Redis 8.0
- Redis Vector Sets (VADD, VSIM, VCARD, VDIM, VREM, VINFO, VRANDMEMBER)
- RediSearch (FT.CREATE, FT.SEARCH)
- RedisJSON (JSON.SET, JSON.GET)
- RedisTimeSeries (TS.CREATE)
- RedisBloom (BF.ADD)

## Sources Consulted
- Redis 8 GA announcement blog post (https://redis.io/blog/redis-8-ga/)
- Redis 8.0 release notes (https://redis.io/docs/latest/operate/oss_and_stack/stack-with-enterprise/release-notes/redisce/redisos-8.0-release-notes/)
- Redis Vector Sets documentation — VADD, VSIM, VCARD, VDIM, VREM, VINFO, VRANDMEMBER (https://redis.io/docs/latest/commands/?group=vector_set)
- Redis MODULE UNLOAD documentation (https://redis.io/docs/latest/commands/module-unload/)
- Redis standalone upgrade guide (https://redis.io/docs/latest/operate/oss_and_stack/install/upgrade/standalone/)
- Redis FT.SEARCH documentation (https://redis.io/docs/latest/commands/ft.search/)
- Redis vector search query documentation (https://redis.io/docs/latest/develop/ai/search-and-query/query/vector-search/)
- Redis JSON documentation (https://redis.io/docs/latest/develop/data-types/json/)
- antirez blog post on Vector Sets (https://antirez.com/news/149)

## Issues Found

1. **VSIM example missing WITHSCORES flag** (line 53): The VSIM command example showed similarity scores in the output (e.g., "0.98", "0.95") but did not include the `WITHSCORES` flag in the command. Without `WITHSCORES`, VSIM only returns element names, not scores. Fixed by adding `WITHSCORES` to the command.

2. **Incorrect MODULE UNLOAD upgrade advice** (line 111): The post recommended `MODULE UNLOAD search` when upgrading from Redis 7.x. This command would fail because RediSearch (and the other integrated modules) register custom data types, and Redis does not allow unloading modules that register custom data types. The official upgrade procedure is to remove `loadmodule` directives from the Redis config file before starting Redis 8. Fixed by replacing the MODULE UNLOAD advice with the correct procedure.

3. **FT.SEARCH hybrid query syntax spacing** (line 102): The post had `"(laptop) => [KNN 5 ..."` with spaces around the `=>` operator. The correct Redis query syntax requires no spaces: `"(laptop)=>[KNN 5 ..."`. Spaces around the arrow can cause query parsing errors. Fixed by removing the spaces.

## Review Notes
- Vector Sets are labeled as **beta** in Redis 8.0. The post does not mention this, which could be noted in a future update.
- The post describes Vector Sets as a "first-class data type." The official Redis documentation uses "native data type" instead. This is a stylistic difference rather than a technical error.
- The claim that modules were "Available only in Redis Stack or Redis Enterprise" before 8.0 is slightly imprecise — the modules could also be compiled from source and loaded into vanilla Redis via MODULE LOAD. However, they were not bundled with the open-source distribution, which is the core point being made.
