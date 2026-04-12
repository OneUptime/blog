# Validation Summary: How to Use JSON.STRLEN in Redis to Get JSON String Length

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- RedisJSON (JSON module for Redis)
- Python (redis-py client library)

## Sources Consulted
- Redis official documentation for JSON.STRLEN: https://redis.io/docs/latest/commands/json.strlen/
- Redis official documentation for JSON.SET: https://redis.io/docs/latest/commands/json.set/
- redis-py client library JSON support: https://redis-py.readthedocs.io/en/stable/redismodules.html

## Issues Found
1. **Incorrect title string length**: `JSON.STRLEN post:1 $.title` was shown returning `(integer) 24`, but "Redis Performance Guide" is 23 characters. Fixed to `(integer) 23`.
2. **Incorrect body string length**: `JSON.STRLEN post:1 $.body` was shown returning `(integer) 87`, but the body string "Redis is a fast in-memory data structure store used as a cache, message broker, and database." is 93 characters. Fixed to `(integer) 93`.
3. **Incorrect default path**: The path parameter description said "defaults to `$`". When no path is provided, `JSON.STRLEN` defaults to the root path (legacy mode `.`), not the JSONPath root `$`. The distinction matters because legacy mode returns a scalar integer while JSONPath mode returns an array. Fixed to "defaults to the root path".

## Review Notes
- All other character counts in the post (hello=5, Hello Redis!=13, Alice=5, London=6, United Kingdom=14) are correct.
- The Python code examples use correct redis-py JSON API calls and the logic is sound.
- The flow diagram accurately represents the behavior of JSON.STRLEN at a high level.
- The comparison table between JSON.STRLEN and JSON.GET + len() is accurate.
