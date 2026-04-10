# Validation Summary: Why You Should Not Use DEL for Large Keys in Redis

## Status
validated

## Post Type
Tutorial / Best Practices Guide

## Technologies Covered
- Redis (DEL, UNLINK, LTRIM, HSCAN, SSCAN, HDEL, SREM, lazyfree configuration)
- Python (redis-py client library)

## Sources Consulted
- Redis official documentation for DEL: https://redis.io/commands/del/
- Redis official documentation for UNLINK: https://redis.io/commands/unlink/
- Redis official documentation for LTRIM: https://redis.io/commands/ltrim/
- Redis official documentation for HSCAN: https://redis.io/commands/hscan/
- Redis official documentation for SSCAN: https://redis.io/commands/sscan/
- Redis configuration documentation for lazyfree options: https://redis.io/docs/latest/operate/oss_and_stack/management/config-file/
- redis-py API documentation: https://redis-py.readthedocs.io/

## Issues Found
No technical issues found.

## Review Notes
- The bash example showing `RPUSH big:list $(python3 -c "...")` omits the `redis-cli` prefix, which is a common convention in Redis tutorials. It would not be directly executable as a shell command, but serves its illustrative purpose.
- The five `lazyfree-*` config options span multiple Redis versions: `lazyfree-lazy-eviction`, `lazyfree-lazy-expire`, and `lazyfree-lazy-server-del` were introduced in Redis 4.0; `lazyfree-lazy-user-del` in Redis 6.0; and `lazyfree-lazy-user-flush` in Redis 6.2. The post does not distinguish these version differences, which is acceptable since it presents them as a complete recommended configuration block.
- The "Redis is single-threaded" claim is a well-accepted simplification. Redis 6.0+ supports threaded I/O, but command execution (including memory deallocation from DEL) remains single-threaded, making the explanation accurate for the topic at hand.
