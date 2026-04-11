# Validation Summary: How to Write a Redis Key Cleanup Script

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (SCAN, KEYS, DEL, TTL, LTRIM, LLEN, TYPE commands)
- Bash scripting (redis-cli, xargs, SCAN-based iteration)
- Python 3 with redis-py library
- redis-cli CLI tool (--scan, --pattern, -a, --no-auth-warning flags)

## Sources Consulted
- redis-cli --help output (verified on redis-cli 7.0.11): confirmed `--scan`, `--pattern`, `-a`, `--no-auth-warning`, `-h`, `-p` flags
- redis-py 7.4.0 Python library documentation: verified `Redis()` constructor params, `scan()`, `ttl()`, `type()`, `llen()`, `ltrim()` APIs
- Redis SCAN command documentation (https://redis.io/commands/scan): confirmed cursor-based iteration semantics
- Redis KEYS command documentation (https://redis.io/commands/keys): confirmed blocking behavior warning
- Redis TTL command documentation (https://redis.io/commands/ttl): confirmed -1 return for no expiry, -2 for non-existent key

## Issues Found
- **Bug: `xargs` cannot call shell functions.** The original bash script defined `cli_cmd()` as a shell function and then used it with `xargs -L "$BATCH_SIZE" cli_cmd DEL`. Since `xargs` executes external commands (not shell functions), this would fail at runtime with "cli_cmd: command not found". **Fix:** Replaced the `cli_cmd` shell function with a `CLI_CMD` string variable (`CLI_CMD="redis-cli -h $REDIS_HOST -p $REDIS_PORT"`). The variable word-splits correctly when unquoted, making it compatible with both direct invocation (`$CLI_CMD SCAN ...`) and `xargs` (`xargs -L "$BATCH_SIZE" $CLI_CMD DEL`).

## Review Notes
- The `sleep 0.01` between SCAN iterations relies on fractional second support in `sleep`, which works on Linux (GNU coreutils) and macOS (BSD) but may not work on minimal/embedded systems. Acceptable for the target audience.
- The `find_keys_without_ttl` function's `max_count` parameter limits total keys scanned, not the number of no-TTL keys returned. The naming could be clearer but the logic is functionally correct.
- The SCAN command description as "non-blocking" is a common and acceptable simplification. Each SCAN call still briefly blocks Redis, but the per-iteration cost is small compared to KEYS scanning the entire keyspace.
