# Validation Summary: How to Implement Cache-Aside Pattern with Azure Cache for Redis and Azure SQL

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Cache for Redis
- Azure Managed Redis
- Azure SQL Database
- Redis
- Cache-aside pattern
- C# / .NET
- StackExchange.Redis
- Dapper
- Node.js
- node-redis
- node-mssql

## Sources Consulted
- Microsoft Learn: Cache-Aside pattern - https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside
- Microsoft Learn: Azure Cache for Redis retirement / what's new - https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-whats-new
- Microsoft Learn: What is Azure Cache for Redis? - https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-overview
- StackExchange.Redis documentation - https://stackexchange.github.io/StackExchange.Redis/
- StackExchange.Redis API reference for LockTakeAsync / LockReleaseAsync - https://docs.dndocs.com/n/StackExchange.Redis/2.12.4/api/StackExchange.Redis.IDatabaseAsync.html
- Redis documentation: Distributed locks - https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/
- node-redis documentation / README - https://github.com/redis/node-redis
- Redis command documentation: SETEX / expiration semantics - https://redis.io/docs/latest/commands/setex/
- node-mssql documentation - https://tediousjs.github.io/node-mssql/

## Issues Found
- The prerequisites implied that a new Azure Cache for Redis Standard-or-higher instance was the default choice. Microsoft announced the Azure Cache for Redis retirement timeline, and as of 2026-06-01 new customers are blocked from creating new Basic, Standard, or Premium caches. Updated the prerequisite to refer to an existing Azure Cache for Redis instance or Azure Managed Redis for new deployments.
- The C# sample cached category-level result sets but `UpdateProductAsync` invalidated only the individual product key. Updated it to read the previous category, update the database, and invalidate the product key plus both old and new category cache keys when needed.
- The Node.js sample's `updateProduct` function updated only `Name` and `Price`, even though the post's model and C# sample include `Description`, `Category`, and `LastModified`. Updated it to update the same fields and invalidate both old and new category cache keys when a category changes.
- The Node.js Redis client called `connect()` without awaiting the returned promise before issuing Redis commands. Updated the CommonJS sample to keep the connection promise and await it before cache operations.
- The cache stampede example acquired a Redis lock with `SET NX` semantics but released it by deleting the lock key directly. That can delete another caller's lock if the first lock expires and is reacquired. Updated the sample to use StackExchange.Redis `LockTakeAsync` with a unique token and `LockReleaseAsync` with the same token.
- The monitoring section stated a fixed P99 latency target for Azure Cache for Redis. Reworded it to track latency against the application's baseline, service tier, payload size, and network configuration because a universal P99 value is not guaranteed.

## Review Notes
The core cache-aside explanation, SQL table definition, Redis TTL use, Dapper query patterns, parameterized SQL usage, and general write-then-invalidate ordering match the consulted documentation. Future revisions should consider making the sample return nullable C# reference types explicitly if the surrounding project enables nullable reference type warnings.
