# Validation Summary: How to Estimate Redis Hardware Requirements

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis (server, CLI, persistence with RDB/AOF)
- redis-cli (INFO command sections: memory, cpu, stats)
- redis-benchmark (load testing tool)
- AWS ElastiCache (cache.t3, cache.r6g node types)
- GCP Memorystore for Redis (Basic and Standard tiers)

## Sources Consulted
- Redis official documentation for INFO command fields (memory, cpu, stats sections): https://redis.io/commands/info
- Redis official documentation for redis-benchmark and its `-t` flag: https://redis.io/docs/management/optimization/benchmarks/
- AWS ElastiCache supported node types and memory specifications: https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/CacheNodes.SupportedTypes.html
- GCP Memorystore for Redis tier and configuration documentation: https://cloud.google.com/memorystore/docs/redis/memorystore-for-redis-overview

## Issues Found
1. **AWS cache.t3.medium RAM incorrect**: Listed as 3.22 GB but the documented value is 3.09 GiB. Changed to 3.09 GB.
2. **GCP Memorystore tier naming incorrect**: Used non-existent "M2" and "M4" suffixes (e.g., "STANDARD M2 13 GB"). GCP Memorystore for Redis uses only "Basic" and "Standard" tiers with a configurable memory size. Changed to "Basic tier, X GB" / "Standard tier, X GB" format.
3. **redis-benchmark invalid test name**: The `-t` flag included `hget`, which is not a predefined benchmark test. Valid hash-related test is `hset` only. Replaced `hget` with `lpush`, which is a valid predefined test.

## Review Notes
- The per-key overhead estimate of 64 bytes is a reasonable simplification but actual overhead varies (50-100+ bytes) depending on key size, value type, and jemalloc allocation granularity.
- The `total_net_input_bytes` and `total_net_output_bytes` fields referenced in the network section were added in Redis 6.0+. On older Redis versions, these fields are not available.
- The CPU throughput estimates (100K ops/sec per vCPU for simple commands) are conservative. Modern hardware with Redis 7.x can often achieve 200K+ ops/sec per core for simple GET/SET operations.
- The fork overhead section correctly accounts for worst-case copy-on-write doubling, which is appropriate for capacity planning even though real-world COW overhead is typically lower.
