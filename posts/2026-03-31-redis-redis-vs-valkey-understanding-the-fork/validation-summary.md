# Validation Summary: Redis vs Valkey: Understanding the Fork

## Status
validated

## Post Type
Guide / Comparison

## Technologies Covered
- Redis (8.x)
- Valkey (7.2 / 8.x)
- redis-py (Python client)
- redis-cli / valkey-cli
- RDB persistence and replication (REPLICAOF)
- AWS ElastiCache, MemoryDB
- GCP Memorystore
- Azure Cache for Redis
- DigitalOcean Managed Caching

## Sources Consulted
- Redis licensing announcement: https://redis.io/blog/redis-adopts-dual-source-available-licensing/
- Redis license page: https://redis.io/legal/licenses/
- Linux Foundation Valkey launch: https://www.linuxfoundation.org/press/linux-foundation-launches-open-source-valkey-community
- AWS ElastiCache/MemoryDB Valkey support: https://aws.amazon.com/blogs/database/amazon-elasticache-and-amazon-memorydb-announce-support-for-valkey/
- GCP Memorystore for Valkey GA: https://cloud.google.com/blog/products/databases/announcing-general-availability-of-memorystore-for-valkey
- DigitalOcean Managed Valkey: https://www.digitalocean.com/blog/introducing-managed-valkey
- Valkey CLI documentation: https://valkey.io/topics/cli/
- redis-py documentation and source code
- Redis and Valkey configuration documentation

## Issues Found
- **Incomplete license information**: The post only listed RSAL and SSPL as Redis 8.x license options. Redis 8.0 (May 2025) added AGPLv3 as a third license option, making it a tri-license model. Updated the license section, feature comparison table, and background paragraph to include AGPLv3.

## Review Notes
- The Python code example uses `redis.Redis()` without `decode_responses=True`, meaning `.get()` returns `bytes` (e.g., `b"value"`) rather than `str`. This is technically correct but could surprise beginners. Not changed since it is valid code.
- The `SLAVEOF` mention in the migration section is fine as context, and the actual command shown is the current `REPLICAOF` syntax.
- All cloud provider offerings in the table were verified as accurate. Azure correctly shows no Valkey offering; DigitalOcean's managed Valkey launched April 2025.
- The AGPLv3 addition to Redis 8.0 is notable because AGPLv3 is an OSI-approved open-source license, which partially addresses the open-source concerns that motivated the Valkey fork. The post's framing remains fair — the fork was driven by the original RSAL/SSPL change, and Valkey remains under the more permissive BSD license.
