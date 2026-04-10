# Validation Summary: How to Build a Social Media Notification System with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Lists, Hashes, String counters)
- Python (redis-py client library)
- Redis CLI

## Sources Consulted
- Redis HSET documentation: https://redis.io/docs/latest/commands/hset/
- Redis LPUSH documentation: https://redis.io/docs/latest/commands/lpush/
- Redis LTRIM documentation: https://redis.io/docs/latest/commands/ltrim/
- Redis INCR documentation: https://redis.io/docs/latest/commands/incr/
- Redis SET (NX/EX flags) documentation: https://redis.io/docs/latest/commands/set/
- Redis LRANGE documentation: https://redis.io/docs/latest/commands/lrange/
- redis-py documentation: https://redis-py.readthedocs.io/en/stable/

## Issues Found
1. **Tags listed "Sorted Set" but no Sorted Sets are used**: The post uses Lists, Hashes, and String counters -- not Sorted Sets. Changed tags from "Redis, Notification, List, Sorted Set" to "Redis, Notification, List, Hash".
2. **Description claimed "TTL-based cleanup" but this is not implemented**: The only TTL usage in the post is the 5-minute expiry on deduplication keys, not cleanup of notifications themselves. Changed "TTL-based cleanup" to "deduplication" in the description.

## Review Notes
- The `mark_as_read` function accepts a `user_id` parameter that is never used. This is not a bug (it could be reserved for authorization checks) but is worth noting.
- The `mark_all_as_read` function has a potential race condition: new notifications arriving between the `lrange` call and the pipeline execution would not be marked as read, yet the unread counter would be reset to 0. This is a common trade-off in non-transactional Redis patterns and acceptable for a tutorial, but worth noting for production use.
- All Python code uses current, non-deprecated redis-py APIs. The `hset` with `mapping` parameter is supported since redis-py 3.5.0.
- The Redis CLI `HSET` example with multiple field-value pairs requires Redis 4.0+, which has been standard since 2017.
