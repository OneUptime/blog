# Validation Summary: How to Monitor Redis Memory with RedisInsight

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (server, CLI commands, configuration)
- RedisInsight (official Redis GUI tool)
- Docker (for RedisInsight installation)
- Homebrew (macOS installation)

## Sources Consulted
- Redis official documentation for CONFIG SET, MEMORY USAGE, SLOWLOG, INFO memory, OBJECT ENCODING commands
- Redis 7.0 release notes regarding ziplist-to-listpack migration
- RedisInsight Docker Hub page (`redis/redisinsight`)
- Homebrew Formulae page for `redis-insight` cask (https://formulae.brew.sh/cask/redis-insight)
- Redis official download page (https://redis.io/insight/)
- Redis stable redis.conf for `activedefrag`, `hash-max-listpack-entries`, `set-max-intset-entries` parameter names and defaults

## Issues Found
1. **OBJECT ENCODING comment referenced "ziplist" instead of "listpack"** (line 166): The comment `# Internal encoding (ziplist, hashtable, etc.)` was outdated. In Redis 7.0+, the compact encoding was renamed from `ziplist` to `listpack`. Changed to `(listpack, hashtable, etc.)`.

2. **Memory efficiency table referenced "ziplist encoding" for listpack config** (line 193): The table row for `hash-max-listpack-entries` said "to use ziplist encoding". Since `hash-max-listpack-entries` is a Redis 7+ parameter that controls listpack encoding (not ziplist), changed to "to use listpack encoding".

## Review Notes
- The Linux AppImage download URL (`https://downloads.redis.io/redisinsight/redisinsight-linux-amd64.AppImage`) could not be verified as a live URL. It may be outdated or use a different path. Users should fall back to downloading from https://redis.io/insight/ if the direct link does not work.
- The navigation path "Analysis Tools > Memory Analysis" may have changed in RedisInsight v3.0+ which introduced a redesigned UI. The feature may now be called "Database Analysis" in newer versions. Not changed since the post doesn't target a specific version and the feature name is recognizable.
- The `slowlog-log-slower-than` value of 1000 (microseconds = 1ms) is correct but aggressive for production; the default is 10000 (10ms). The post's inline comment correctly notes this.
- All Redis CLI commands (`INFO memory`, `MEMORY USAGE`, `DBSIZE`, `SCAN`, `CONFIG SET/GET`, `TTL`, `PTTL`, `SLOWLOG`) are syntactically correct and use valid parameters.
- The `CONFIG SET activedefrag yes` parameter name is correct (no hyphens, matches redis.conf).
- `CONFIG SET maxmemory 2gb` correctly uses Redis's human-readable unit format.
