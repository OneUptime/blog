# Validation Summary: How to Migrate from Redis 7 to Redis 8

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Redis 7 (source version)
- Redis 8 (target version)
- RedisJSON, RediSearch, RedisTimeSeries, RedisBloom (now built into Redis 8 core)
- Python redis-py client library
- Redis replication and replica promotion

## Sources Consulted
- Redis Open Source 8.0 release notes: https://redis.io/docs/latest/operate/oss_and_stack/stack-with-enterprise/release-notes/redisce/redisos-8.0-release-notes/
- HGETDEL command documentation: https://redis.io/docs/latest/commands/hgetdel/
- HGETEX command documentation: https://redis.io/docs/latest/commands/hgetex/
- FT._LIST command documentation: https://redis.io/docs/latest/commands/ft._list/
- Redis 8 GA announcement: https://redis.io/blog/redis-8-ga/
- Redis licensing page: https://redis.io/legal/licenses/
- GitHub Redis 8.0.0 release: https://github.com/redis/redis/releases/tag/8.0.0

## Issues Found

1. **Incorrect licensing description (line 19)**: The post stated Redis 8 is "dual-licensed under RSALv2 and SSPLv1." Redis 8 is actually tri-licensed under RSALv2, SSPLv1, and AGPLv3. The AGPLv3 option was added with the Redis 8 GA release. Fixed "dual-licensed under RSALv2 and SSPLv1" to "tri-licensed under RSALv2, SSPLv1, and AGPLv3."

2. **Incorrect HGETEX command syntax (line 124)**: The post had `HGETEX myhash FIELDS 1 field2 EX 60`, placing the expiration option after FIELDS. Per the official Redis documentation, the correct syntax is `HGETEX key [EX seconds | PX milliseconds | ...] FIELDS numfields field [field ...]` — the expiration option must come before the FIELDS keyword. Fixed to `HGETEX myhash EX 60 FIELDS 1 field2`.

## Review Notes
- The `FT._LIST` command is noted in official docs as a temporary command (indicated by the underscore prefix). A SCAN-type replacement may be introduced in the future for databases with large numbers of indices.
- Cross-major-version replication (Redis 7 primary to Redis 8 replica) is a standard upgrade pattern that generally works from older to newer versions, though it is not explicitly guaranteed in the official Redis 8 documentation. The blog post's approach of using replica promotion is the recommended upgrade strategy.
- The GitHub archive download URL (`https://github.com/redis/redis/archive/8.0.0.tar.gz`) is a valid GitHub URL pattern, though the official Redis documentation primarily directs users to Docker, package managers, or redis.io/downloads.
