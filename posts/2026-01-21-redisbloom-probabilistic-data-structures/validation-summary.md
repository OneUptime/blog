# Validation Summary: How to Use RedisBloom for Probabilistic Data Structures

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis
- Redis Stack
- RedisBloom
- Bloom filters
- Cuckoo filters
- Count-Min Sketch
- Top-K
- HyperLogLog
- Python
- redis-py
- Docker

## Sources Consulted
- Redis Bloom filter documentation: https://redis.io/docs/latest/develop/data-types/probabilistic/bloom-filter/
- Redis Top-K documentation: https://redis.io/docs/latest/develop/data-types/probabilistic/top-k/
- Redis probabilistic data structures with redis-py: https://redis.io/docs/latest/develop/clients/redis-py/prob/
- Redis BF.RESERVE command reference: https://redis.io/docs/latest/commands/bf.reserve/
- Redis CF.RESERVE command reference: https://redis.io/docs/latest/commands/cf.reserve/
- Redis CMS.INCRBY command reference: https://redis.io/docs/latest/commands/cms.incrby/
- Redis TOPK.RESERVE command reference: https://redis.io/docs/latest/commands/topk.reserve/
- Redis TOPK.INCRBY command reference: https://redis.io/docs/latest/commands/topk.incrby/
- Redis TOPK.COUNT command reference: https://redis.io/docs/latest/commands/topk.count/
- redis-py RedisBloom command API reference: https://redis.readthedocs.io/en/latest/redismodules.html
- redis-py Bloom command source/API details: https://redis.readthedocs.io/en/latest/_modules/redis/commands/bf/commands.html
- redis-py RedisBloom info response classes: https://raw.githubusercontent.com/redis/redis-py/master/redis/commands/bf/info.py

## Issues Found
- The post described all probabilistic structures as having constant memory and O(1) operations. Redis command docs show operation costs vary by command and configuration, so this was changed to "predictable memory" and "fast operations" with configurable overhead.
- The Bloom filter example marked a negative result as "False (probably)". Bloom filters guarantee negative answers, so the comment now says "False (definitely not present)".
- The scaling Bloom filter used the wrong redis-py keyword argument, `nonscaling=False`. redis-py documents this as `noScale`, so the example was corrected to `noScale=False`.
- The username checker docstring had the return semantics reversed, and the example placeholder database lookup made the printed output for `alice` incorrect. The docstring and placeholder were corrected.
- The Cuckoo filter info example used non-existent redis-py properties `num_buckets` and `num_items`. These were corrected to `bucketNum` and `insertedNum`.
- The session-management example used `time.time()` without importing `time`. The missing import was added to the code block.
- The Count-Min Sketch examples passed alternating item/increment lists to redis-py's `cms().incrby()`. redis-py expects separate item and increment lists, so all CMS calls were corrected.
- The API rate tracker created static CMS keys but wrote to time-windowed keys that had not been initialized. The example now initializes the current time-windowed sketches before writing to them.
- The API rate-limit example recorded per-user counts in a `:user` CMS key but queried the endpoint CMS key. The `check_rate_limit()` example now supports and uses `by_user=True`.
- The Top-K examples used `topk().create()`, but redis-py exposes `topk().reserve()` for `TOPK.RESERVE`. These calls were corrected.
- The Top-K examples passed alternating item/increment lists to redis-py's `topk().incrby()`. redis-py expects separate item and increment lists, so all Top-K increment calls were corrected.
- The Top-K example used `TOPK.COUNT`, which Redis documents as deprecated as of RedisBloom 2.4. The deprecated example call was removed.
- The visitor analytics example used redis-py's CMS `incrby()` with the wrong argument shape. These calls were corrected to separate item and increment lists.

## Review Notes
The unique visitor example remains approximate: Bloom filter false positives can undercount unique visitors. For standalone cardinality estimation, the post correctly points readers to Redis HyperLogLog.
