# Validation Summary: How to Store Related Objects in Redis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis
- redis-py
- Python
- Redis hashes
- Redis sets
- Redis sorted sets
- Redis pipelines
- Mermaid diagrams

## Sources Consulted
- Redis hashes documentation: https://redis.io/docs/latest/develop/data-types/hashes/
- Redis sets documentation: https://redis.io/docs/latest/develop/data-types/sets/
- Redis sorted sets documentation: https://redis.io/docs/latest/develop/data-types/sorted-sets/
- Redis ZADD command documentation: https://redis.io/docs/latest/commands/zadd/
- Redis ZRANGE command documentation: https://redis.io/docs/latest/commands/zrange/
- redis-py guide: https://redis.io/docs/latest/develop/clients/redis-py/
- redis-py command reference: https://redis.readthedocs.io/en/stable/commands.html
- redis-py pipelines and transactions documentation: https://redis.io/docs/latest/develop/clients/redis-py/transpipe/

## Issues Found
- The one-to-many example said it initialized an empty orders set, but Redis sets are created when the first member is added. Changed the comment to say the set is created when the first order ID is added.
- The denormalization example said recent posts were fetched with a single query and no additional lookups. The code performs one sorted-set read followed by pipelined post hash reads, while avoiding additional author lookups. Updated the docstring to describe batched post lookups and no additional author lookups.

## Review Notes
The Python code blocks parse successfully with Python 3. The examples use current redis-py command APIs such as `hset(..., mapping=...)`, `hmget`, `sadd`, `sinter`, `sunion`, `zadd`, `zrange`/`zrevrange`, `zinter`, `zcard`, and pipelines. The post is accurate for standalone Redis usage; in Redis Cluster, multi-key set and sorted-set operations require keys to be in the same hash slot.
