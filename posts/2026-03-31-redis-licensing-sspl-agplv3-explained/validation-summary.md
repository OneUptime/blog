# Validation Summary: Understanding Redis Licensing (SSPL, AGPLv3, Dual License)

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- Redis (server and licensing)
- Server Side Public License (SSPL)
- Redis Source Available License v2 (RSALv2)
- AGPLv3
- Valkey (Redis fork)
- Docker (Valkey container example)

## Sources Consulted
- Redis official blog: "Redis Adopts Dual Source-Available Licensing" (https://redis.io/blog/redis-adopts-dual-source-available-licensing/)
- Redis official blog: "Redis is now available under AGPLv3" (https://redis.io/blog/agplv3/)
- MongoDB SSPL documentation (https://www.mongodb.com/legal/licensing/server-side-public-license)
- Valkey official documentation (https://valkey.io/)
- Valkey Docker Hub (https://hub.docker.com/r/valkey/valkey)
- AWS blog: "Why AWS Supports Valkey" (https://aws.amazon.com/blogs/opensource/why-aws-supports-valkey/)
- AWS blog: "Migrating to Amazon ElastiCache for Valkey" (https://aws.amazon.com/blogs/database/migrating-to-elasticache-for-valkey-best-practices-and-a-customer-success-story/)

## Issues Found

1. **Description incorrectly referenced AGPLv3 instead of RSALv2**: The description line stated "from BSD to SSPL and AGPLv3" but the March 2024 licensing change was to SSPL and RSALv2, not AGPLv3. Fixed to "from BSD to SSPL and RSALv2".

2. **AWS ElastiCache table row incorrectly claimed AWS has a commercial license**: The compliance table stated "AWS has a commercial license" for ElastiCache. In reality, AWS responded to the Redis licensing change by migrating to Valkey rather than obtaining a commercial license from Redis Ltd. Fixed to "AWS migrated to Valkey".

## Review Notes
- **Redis 8 AGPLv3 addition (2025)**: After the March 2024 change covered in this post, Redis subsequently added AGPLv3 as a third license option in 2025 with Redis 8, making it tri-licensed (RSALv2 + SSPLv1 + AGPLv3). The post's title mentions AGPLv3 but the body only discusses it in the context of historical module licensing. A future update could note the 2025 AGPLv3 addition.
- **Redis modules licensing history is simplified**: The post states modules "previously used AGPLv3" and the 2024 change moved them to RSALv2. The actual history is more complex — modules went through AGPLv3 -> Apache 2.0 + Commons Clause -> RSAL v1 -> RSAL + SSPL -> RSALv2 + SSPL over the period 2018-2024. The simplification is acceptable for the post's scope but readers should be aware the transition was not direct.
- **Valkey Docker command and CLI commands are correct**: `docker run -d --name valkey -p 6379:6379 valkey/valkey:8` and `valkey-cli` commands are valid.
