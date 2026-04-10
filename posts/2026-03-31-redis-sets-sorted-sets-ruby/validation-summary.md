# Validation Summary: How to Use Redis Sets and Sorted Sets in Ruby

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Sets and Sorted Sets data structures)
- Ruby
- redis-rb gem

## Sources Consulted
- redis-rb gem API documentation (https://rubydoc.info/gems/redis)
- redis-rb GitHub repository and README (https://github.com/redis/redis-rb)
- Redis official command reference for SET commands (https://redis.io/docs/latest/commands/?group=set)
- Redis official command reference for Sorted Set commands (https://redis.io/docs/latest/commands/?group=sorted-set)

## Issues Found
1. **`sadd` called with multiple member arguments instead of an array** (lines 21, 24): The post used `redis.sadd('tags:post:1', 'ruby', 'redis', 'tutorial')` passing three separate member arguments. In redis-rb, `sadd` accepts `(key, member)` where `member` is either a single value or an Array. Passing multiple members as separate arguments raises `ArgumentError: wrong number of arguments`. Fixed both calls to use array syntax: `redis.sadd('tags:post:1', ['ruby', 'redis', 'tutorial'])`.

## Review Notes
- The post uses `zrevrange` and `zrangebyscore`, which were deprecated at the Redis protocol level in Redis 6.2 in favor of the unified `ZRANGE` command with `REV` and `BYSCORE` options. redis-rb still supports these methods for backward compatibility, so they work correctly, but future versions of the gem may remove them. This is not an error today but worth noting for a future update.
- In redis-rb 5.x, `sadd` returns an Integer (count of elements added) rather than a Boolean. The post does not display `sadd` return values, so this is not an issue, but readers using `sadd` in conditionals should be aware of `sadd?` which returns a Boolean.
- All other code examples (set operations, sorted set operations, score queries, zincrby, zrem, and the trending articles example) are technically correct and use proper redis-rb API conventions.
