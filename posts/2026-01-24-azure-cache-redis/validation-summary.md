# Validation Summary: How to Handle Azure Cache for Redis

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Cache for Redis
- Azure Managed Redis
- Redis and Redis Cluster
- StackExchange.Redis
- C# / .NET
- ASP.NET Core health checks
- Node.js
- ioredis
- Azure Key Vault and application configuration

## Sources Consulted
- Microsoft Learn: Azure Cache for Redis overview - https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-overview
- Microsoft Learn: Azure Cache for Redis planning FAQ - https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-planning-faq
- Microsoft Learn: Azure Cache for Redis retirement FAQ - https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/retirement-faq
- Microsoft Learn: Best practices for Azure Cache for Redis connection resilience - https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-best-practices-connection
- Microsoft Learn: Azure Cache for Redis development FAQs - https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-development-faq
- Microsoft Learn: Best practices for Azure Cache for Redis Enterprise tiers - https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-best-practices-enterprise-tiers
- Microsoft Learn: Configure Azure Cache for Redis - https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-configure
- StackExchange.Redis official configuration documentation - https://stackexchange.github.io/StackExchange.Redis/Configuration.html
- Redis cluster specification and hash tag documentation - https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/
- ioredis official documentation - https://github.com/redis/ioredis and https://redis.github.io/ioredis/

## Issues Found
- The tier list omitted Enterprise Flash and described Premium as having "Enterprise features." I added Enterprise Flash and changed the Premium description to "Advanced features" to avoid conflating Premium with Redis Enterprise tiers.
- The post did not mention Microsoft's announced Azure Cache for Redis retirement timeline. I added a short caveat in the introduction recommending Azure Managed Redis evaluation for new deployments.
- The StackExchange.Redis C# example used `ConfigurationOptions.PoolSize`, which is not part of the official StackExchange.Redis configuration surface. I removed it and used `ClientName` for diagnostics instead.
- The StackExchange.Redis disposal code could create the lazy connection during disposal. I changed it to dispose only when the lazy connection has already been created.
- The ioredis example labeled `maxRetriesPerRequest` as a connection pool setting. I changed the comment to identify it as a request retry setting.
- The write-through transaction example updated Redis before the database and implied Redis transactions could provide cross-system consistency. I changed the flow to update the database first and clarified that the Redis transaction only makes Redis commands atomic.
- The Redis Cluster diagram labeled hash slot ranges as keys. I changed those labels to slots.
- The cluster batch example queued batch operations without awaiting their returned tasks. I captured and awaited both tasks after `batch.Execute()`.
- The multi-key cluster example depended on an omitted `Crc16` helper and could still be misleading for cross-slot commands. I replaced it with individual `GET` operations to avoid cross-slot multi-key command errors.
- The metrics example declared `_cache` but used `_redis`, and its `GetInfoValue` helper was not defined. I added the `RedisConnectionManager` field, constructor, and helper methods for parsing StackExchange.Redis `INFO` output.
- The timeout troubleshooting snippet used `ResponseTimeout`, which is not a current StackExchange.Redis configuration option. I removed that line.
- The memory pressure example was named "sliding expiration" but implemented a one-time expiration. I renamed it to `SetWithExpirationAsync` and used `StringSetAsync` with an expiration argument.
- The best-practices list recommended "connection pooling" for StackExchange.Redis. I changed it to recommend reusing a `ConnectionMultiplexer`, matching Microsoft guidance.

## Review Notes
The post is technically valid after correction. Some snippets remain illustrative and assume surrounding application types such as `Product`, `IProductRepository`, `CacheStatistics`, and required `using` statements exist elsewhere in the application.
