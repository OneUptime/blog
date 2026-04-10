# Validation Summary: How to Train Teams on Redis Operations

## Status
validated

## Post Type
Training Guide / Hands-on Tutorial

## Technologies Covered
- Redis (CLI, persistence, eviction, Sentinel, Cluster)
- redis-cli
- Bash scripting (for loop in eviction exercise)

## Sources Consulted
- Redis official documentation: SET, GET, TTL, EXPIRE, HSET, HGETALL, LPUSH, LRANGE, LLEN commands (https://redis.io/docs/latest/commands/)
- Redis INFO command documentation (https://redis.io/docs/latest/commands/info/)
- Redis CONFIG SET/GET documentation (https://redis.io/docs/latest/commands/config-set/)
- Redis BGSAVE documentation (https://redis.io/docs/latest/commands/bgsave/)
- Redis SLOWLOG documentation (https://redis.io/docs/latest/commands/slowlog-get/)
- Redis eviction policies documentation (https://redis.io/docs/latest/develop/reference/eviction/)
- Redis persistence documentation (https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/)
- redis-cli --bigkeys documentation (https://redis.io/docs/latest/develop/tools/cli/)

## Issues Found
1. **Redundant slowlog-log-slower-than CONFIG SET (Line 94)**: The second `CONFIG SET slowlog-log-slower-than 0` was identical to the first one on line 91, making it a no-op. In the context of the exercise (temporarily log all commands, run slow commands, then examine the slowlog), the intent is clearly to reset the threshold after the test. Changed the value to `10000` (the Redis default of 10ms expressed in microseconds) and updated the comment to `# reset to default (10ms)`.

## Review Notes
- The Level 2 Lab mixes redis-cli interactive commands (CONFIG GET, BGSAVE, KEYS *) with bash shell commands (the `for` loop with `redis-cli` prefix, `redis-cli INFO stats | grep`). This is not technically wrong but could be confusing for beginners. A future revision could split these into separate code blocks with explicit context labels.
- All Redis commands use correct syntax and are current as of Redis 7.x.
- The HSET multi-field syntax used in the Level 1 Lab is supported since Redis 4.0.0.
- The training schedule and knowledge check questions are technically sound and well-structured.
