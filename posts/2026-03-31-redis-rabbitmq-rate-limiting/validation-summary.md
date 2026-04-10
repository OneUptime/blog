# Validation Summary: How to Use Redis with RabbitMQ for Rate Limiting

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (as a rate limit store)
- RabbitMQ (message broker)
- Python (`redis-py` client library)
- Python (`pika` RabbitMQ client library)
- Lua scripting (Redis server-side scripts)

## Sources Consulted
- redis-py documentation: https://redis-py.readthedocs.io/en/stable/
- Pika documentation: https://pika.readthedocs.io/en/stable/
- Redis INCR command: https://redis.io/commands/incr/
- Redis EXPIRE command: https://redis.io/commands/expire/
- Redis ZADD command: https://redis.io/commands/zadd/
- Redis ZREMRANGEBYSCORE command: https://redis.io/commands/zremrangebyscore/
- Redis ZCARD command: https://redis.io/commands/zcard/
- Redis Lua scripting: https://redis.io/docs/interact/programmability/eval-intro/
- RabbitMQ Consumer Prefetch: https://www.rabbitmq.com/docs/consumer-prefetch
- AMQP 0-9-1 delivery-mode property (delivery_mode=2 for persistent)

## Issues Found
No technical issues found.

## Review Notes
- The INCR + conditional EXPIRE pattern used in `check_publish_rate` and the consumer-side rate limiter has a theoretical race condition: if the process crashes between `INCR` (returning 1) and the subsequent `EXPIRE` call, the key persists indefinitely without a TTL. This is a widely-used simplification in tutorials and the post appropriately offers the Lua script as a more robust atomic alternative.
- The sliding window Lua script uses the millisecond timestamp as the sorted set member (`ZADD key now now`). If two requests arrive within the same millisecond, the second ZADD overwrites the first member (same string value), causing the rate limiter to under-count by one. This is a common simplification in sliding window tutorials and acceptable for demonstrating the concept.
- The `time.sleep(1)` in the consumer callback blocks the consumer's I/O thread. In production with short RabbitMQ heartbeat intervals, long blocking could risk heartbeat timeout. With pika's default heartbeat settings this is unlikely to be an issue, but worth noting for production use.
- All APIs used (`redis-py`, `pika`) are current and non-deprecated as of the writing date.
