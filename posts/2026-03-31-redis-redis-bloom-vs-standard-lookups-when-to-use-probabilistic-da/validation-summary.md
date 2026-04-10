# Validation Summary: Redis Bloom vs Standard Lookups: When to Use Probabilistic Structures

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis (core commands: SADD, SISMEMBER, SCARD, ZINCRBY, ZSCORE, PFADD, PFCOUNT, PFMERGE)
- RedisBloom module (BF.RESERVE, BF.ADD, BF.MADD, BF.EXISTS, CF.RESERVE, CF.ADD, CF.EXISTS, CF.DEL, CMS.INITBYDIM, CMS.INCRBY, CMS.QUERY, TOPK.RESERVE, TOPK.ADD, TOPK.LIST, TOPK.QUERY)
- Redis Stack
- Python redis-py client library
- HyperLogLog (built-in Redis)

## Sources Consulted
- Redis official documentation for Bloom filter commands: https://redis.io/docs/latest/commands/?group=bf
- Redis official documentation for Cuckoo filter commands: https://redis.io/docs/latest/commands/?group=cf
- Redis official documentation for Count-Min Sketch commands: https://redis.io/docs/latest/commands/?group=cms
- Redis official documentation for Top-K commands: https://redis.io/docs/latest/commands/?group=topk
- Redis official documentation for HyperLogLog: https://redis.io/docs/latest/commands/?group=hyperloglog
- RedisBloom GitHub repository (source code): https://github.com/RedisBloom/RedisBloom
- Bloom filter optimal size formula: m = -n * ln(p) / (ln(2))^2

## Issues Found
No technical issues found. All command syntax, memory estimates, and explanations are accurate.

## Review Notes
- **Bloom filter memory math verified**: For 10M items at 1% FPR, the formula yields -10^7 * ln(0.01) / (ln(2))^2 = ~95.85M bits = ~12MB. The ~1.2MB figure for 1M items in the comparison table is also correct.
- **HyperLogLog "fixed at 12KB"**: Redis HLL actually uses *up to* 12KB (it starts with a sparse encoding for small cardinalities). The 12KB figure is the standard maximum and is the commonly cited number, so this is acceptable for the comparison context.
- **CMS counter size**: The post claims 8 bytes per counter (width * depth * 8 = 8KB for a 200x5 sketch). The RedisBloom CMS struct uses `long long *array` for counters, which is 8 bytes on 64-bit systems. Some research suggests `uint32_t` may be used in certain versions. The 8-byte claim is defensible but readers should verify against their specific RedisBloom version if precise memory accounting is needed.
- **Pipeline atomicity comment in Python code**: The code comment says "BF.EXISTS + BF.ADD atomically using pipeline." In redis-py, `r.pipeline()` defaults to `transaction=True` (wrapping commands in MULTI/EXEC), so "atomically" is justified. However, this is not a true compare-and-swap — another client could add the same key between pipeline construction and execution. For the stated use case (skip re-sending welcome emails), this is acceptable.
- **Cuckoo filter deletion caveat**: The post correctly shows CF.DEL but does not mention the caveat that deleting items not previously added can corrupt the filter and cause false negatives. This is a known limitation documented in Redis docs. Not an error in the post, but worth noting for readers.
