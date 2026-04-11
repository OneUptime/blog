# Validation Summary: How to Use LASTSAVE in Redis to Check Last Save Time

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (LASTSAVE, BGSAVE, SAVE, INFO persistence commands)
- Python (redis-py library)
- Node.js (node-redis v4 library)
- Go (go-redis/v9 library)
- Bash scripting (redis-cli, GNU date)

## Sources Consulted
- Redis official documentation for LASTSAVE: https://redis.io/docs/latest/commands/lastsave/
- Redis persistence documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- redis-py source code and documentation (lastsave() response callback returns datetime)
- node-redis v4 documentation and GitHub issues (lastSave() returns Date object): https://github.com/redis/node-redis/issues/2650
- go-redis/v9 package documentation: https://pkg.go.dev/github.com/redis/go-redis/v9

## Issues Found

1. **Python `lastsave()` return type (all 4 Python examples)**: redis-py's `lastsave()` returns a `datetime.datetime` object, not a Unix timestamp integer. The original code called `datetime.datetime.fromtimestamp(timestamp)` on the return value, which would raise a `TypeError` since it expects a numeric type. Fixed by extracting the timestamp with `.timestamp()` before performing arithmetic.

2. **Node.js `lastSave()` return type**: node-redis v4's `lastSave()` returns a `Date` object, not a raw Unix timestamp. The original code treated the return value as a number and did `new Date(timestamp * 1000)`, which would produce an incorrect date. Fixed to use `saveDate.getTime()` for age calculations.

3. **Incorrect example timestamps in comments**: The timestamps 1711900800 and 1711897200 correspond to dates in March/April 2024, not 2026 as claimed in the comments. Also, March 31, 2026 is a Tuesday, not a Friday. Updated to use correct 2026 timestamps (1774958400 for 12:00 UTC, 1774944000 for 08:00 UTC) with the correct day-of-week.

4. **Missing `redis-cli` prefix in AOF section**: The command `INFO persistence | grep aof_last` was shown in a bash code block without the `redis-cli` prefix, making it invalid as a shell command. Added `redis-cli` prefix.

## Review Notes
- The `date -d @timestamp` syntax used in the Basic Usage and Backup Verification sections is GNU date specific (Linux). It will not work on macOS, which uses `date -r timestamp` instead. This is acceptable since the bash script targets Linux servers, but readers on macOS should be aware.
- The Go example using go-redis/v9 `LastSave(ctx).Result()` correctly returns `(int64, error)` and the subsequent `time.Unix(lastSave, 0)` conversion is correct.
- The INFO persistence field names (`rdb_bgsave_in_progress`, `rdb_last_bgsave_status`, `rdb_last_bgsave_time_sec`, `rdb_changes_since_last_save`) are all valid Redis fields.
- The post correctly notes that LASTSAVE reflects RDB saves only and does not track AOF rewrites.
- The Node.js code uses top-level `await`, which requires ES modules or Node.js 14.8+ with `--experimental-repl-await`. This is a common simplification in blog posts.
