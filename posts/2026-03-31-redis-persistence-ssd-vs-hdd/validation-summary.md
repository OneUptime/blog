# Validation Summary: How to Configure Redis Persistence for SSDs vs HDDs

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis (persistence: RDB and AOF)
- Linux I/O monitoring (iostat)
- SSD / HDD / NVMe storage hardware
- redis-cli, redis-benchmark

## Sources Consulted
- Redis official documentation for persistence configuration directives (save, appendonly, appendfsync, no-appendfsync-on-rewrite, rdbcompression, rdbchecksum, auto-aof-rewrite-percentage, auto-aof-rewrite-min-size) — https://redis.io/docs/latest/operate/oss_and_community/rs/references/persistence/
- Redis CONFIG SET command documentation — https://redis.io/docs/latest/commands/config-set/
- Redis INFO command documentation (persistence section, aof_delayed_fsync field) — https://redis.io/docs/latest/commands/info/
- Redis LATENCY LATEST command documentation — https://redis.io/docs/latest/commands/latency-latest/
- Redis 7.0 release notes and redis.conf reference for Multi Part AOF and protected config changes
- redis-benchmark documentation — https://redis.io/docs/latest/operate/oss_and_community/rs/references/client_references/client_cli/

## Issues Found

1. **`iostat` command missing `-m` flag**: The command `iostat -x 1 30` was shown but the sample output displayed columns with MB/s units (`rMB/s`, `wMB/s`). The `-m` flag is required for megabyte output. Fixed to `iostat -xm 1 30`.

2. **Incorrect wording "increase `no-appendfsync-on-rewrite`"**: The directive `no-appendfsync-on-rewrite` is a boolean (`yes`/`no`), not a numeric value. Changed "increase" to "enable".

3. **`CONFIG SET dir` is protected in Redis 7.0+**: The post showed `redis-cli CONFIG SET dir <path>` without noting that Redis 7.0+ classifies `dir` as a protected configuration parameter. Runtime changes require `enable-protected-configs yes` in `redis.conf`. Added a note explaining this.

4. **Outdated AOF symlink approach for Redis 7.0+**: The symlink example only showed linking a single `appendonly.aof` file, which applies to Redis < 7.0. Redis 7.0+ uses Multi Part AOF stored in a directory (default: `appendonlydir`). Added the Redis 7.0+ symlink command for the directory.

## Review Notes
- The `redis-benchmark -n 100000 -q SET key value` command is syntactically valid but runs against a single literal key. For a more realistic throughput benchmark, `-r 100000 SET __rand_int__ myvalue` would distribute across random keys. Acceptable as-is for a quick sanity check.
- The `iostat` sample output is simplified for illustration (e.g., `util` instead of `%util`, combined `await` instead of `r_await`/`w_await`). This is common in blog posts and acceptable for readability.
- All redis.conf directive names, values, and defaults were verified as correct.
