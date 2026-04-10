# Validation Summary: Redis Community Edition vs Redis Enterprise

## Status
validated

## Post Type
Comparison / Reference Guide

## Technologies Covered
- Redis Community Edition (CE)
- Redis Enterprise
- Redis Cloud
- Redis Cluster
- Redis modules (RedisJSON, RediSearch, RedisTimeSeries, RedisBloom, RedisAI)
- CRDTs (Conflict-free Replicated Data Types)
- Valkey
- KeyDB

## Sources Consulted
- Redis official documentation: https://redis.io/docs/
- Redis Cluster specification: https://redis.io/docs/reference/cluster-spec/
- Redis licensing announcement (March 2024): https://redis.io/blog/redis-adopts-dual-source-available-licensing/
- Redis CLI cluster create documentation: https://redis.io/docs/management/scaling/
- Valkey project: https://valkey.io/
- Redis Enterprise documentation: https://redis.io/docs/about/redis-enterprise/

## Issues Found

### 1. Incorrect license stated for Redis CE (line 15)
- **What was wrong:** The overview stated Redis CE was "Open source (BSD-3-Clause as of Redis 7.4+)". This directly contradicts the note on line 18 and is factually incorrect — Redis 7.4 moved AWAY from BSD-3-Clause to RSALv2/SSPL dual license.
- **What was changed:** Corrected to "Source-available (RSALv2/SSPL dual license as of Redis 7.4+)".
- **Why:** BSD-3-Clause applied to Redis versions prior to 7.4. The license change in March 2024 (Redis 7.4) moved to RSALv2/SSPL, which is source-available but not OSI-approved open source.

### 2. Cluster create command had insufficient nodes (lines 50-53)
- **What was wrong:** The `redis-cli --cluster create` command specified `--cluster-replicas 1` (1 replica per primary) but only provided 3 node addresses. With 3 primaries and 1 replica each, 6 nodes are required. The command as written would fail with an error.
- **What was changed:** Added 3 additional node addresses (10.0.0.4:7003, 10.0.0.5:7004, 10.0.0.6:7005) and updated the comment to clarify "6 nodes total with replicas".
- **Why:** `--cluster-replicas 1` requires N primary nodes + N replica nodes. With the minimum of 3 primaries, that's 6 nodes total.

### 3. Resharding incorrectly described as requiring downtime (line 55)
- **What was wrong:** The comment said "Resharding requires downtime coordination". Redis Cluster resharding is an online operation — the cluster continues serving requests throughout.
- **What was changed:** Changed to "Resharding is online but requires careful coordination". Also updated the limitations bullet to note that clients may receive ASK/MOVED redirections during resharding.
- **Why:** `redis-cli --cluster reshard` performs live migration of hash slots between nodes. Clients may be temporarily redirected via ASK responses, but the cluster does not go down.

### 4. Imprecise licensing version range in Licensing Note section (lines 157-159)
- **What was wrong:** Stated "Redis 7.x: RSALv2/SSPL dual-license" which incorrectly implies all Redis 7.x versions use this license. Redis 7.0 and 7.2 were still BSD-3-Clause. Also referenced a non-existent "Redis Community Edition license."
- **What was changed:** Corrected to show "Redis <= 7.2: BSD-3-Clause (OSI open source)" and "Redis 7.4+: RSALv2/SSPL dual-license (source-available, not OSI open source)". Removed the incorrect "Redis Community Edition license" reference.
- **Why:** The license change only took effect starting with Redis 7.4. Earlier 7.x releases remain under BSD-3-Clause.

## Review Notes
- The feature comparison table marks RedisJSON, RediSearch, RedisTimeSeries, and RedisBloom as "No" for Community Edition. While these modules are not bundled with the base Redis CE server, they are available as loadable modules and are included in the freely available Redis Stack distribution. The table is a simplification but not strictly wrong, and the modules section does acknowledge they can be installed separately.
- RedisAI is listed as an Enterprise feature. RedisAI has been deprecated/archived by Redis. This isn't corrected since the post focuses on comparing editions rather than module lifecycle, but readers should be aware RedisAI may not be available going forward.
- The "Up to 500 shards per cluster" claim for Redis Enterprise could not be verified against current documentation and may vary by version or deployment type.
- AWS ElastiCache for Redis is noted in the cloud options. AWS has been transitioning ElastiCache toward Valkey compatibility; readers should check current AWS documentation for the latest branding and compatibility details.
