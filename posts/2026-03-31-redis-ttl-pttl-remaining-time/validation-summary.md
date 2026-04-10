# Validation Summary: How to Use TTL and PTTL in Redis to Check Remaining Time

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (TTL, PTTL, SET, EXPIRE, PEXPIRE commands)

## Sources Consulted
- Redis official documentation for TTL: https://redis.io/commands/ttl/
- Redis official documentation for PTTL: https://redis.io/commands/pttl/
- Redis official documentation for EXPIRE: https://redis.io/commands/expire/
- Redis official documentation for PEXPIRE: https://redis.io/commands/pexpire/

## Issues Found
No technical issues found.

## Review Notes
- The return values -1 (no expiry) and -2 (key does not exist) are accurate for Redis 2.8+. Prior to Redis 2.8, both cases returned -1. Since Redis 2.8 was released in 2013, this is not a concern for modern usage.
- The `#` comment syntax used in Redis code blocks is a documentation convention for readability. Redis CLI does not support inline comments, but this is standard practice in tutorials and even in the official Redis documentation examples.
- Example output values (e.g., 298 seconds after setting 300) are realistic and correctly illustrate that some time passes between SET/EXPIRE and TTL check.
