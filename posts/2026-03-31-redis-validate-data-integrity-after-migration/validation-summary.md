# Validation Summary: How to Validate Data Integrity After Redis Migration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (redis-cli, DBSIZE, INFO, TYPE, TTL commands)
- redis-py (Python Redis client library)
- RIOT (Redis Input/Output Tools) compare feature
- Bash scripting

## Sources Consulted
- Redis CLI documentation: https://redis.io/docs/latest/develop/tools/cli/
- Redis DBSIZE command reference: https://redis.io/docs/latest/commands/dbsize/
- Redis TTL command reference: https://redis.io/docs/latest/commands/ttl/
- redis-py documentation: https://redis-py.readthedocs.io/
- RIOT (Redis Input/Output Tools) GitHub: https://github.com/redis/riot

## Issues Found

1. **`redis-cli DBSIZE` output not parsed correctly**: `redis-cli DBSIZE` returns output in the format `(integer) 12345`, not a bare integer. The shell variable would contain the full string, causing the `-eq` integer comparison to fail. Fixed by adding the `--raw` flag to `redis-cli` DBSIZE calls, which outputs just the numeric value.

2. **Missing `-a` password flags on INFO memory commands**: Two `redis-cli INFO memory` commands were missing the `-a` authentication flag that was correctly used elsewhere in the post. Without this flag, the commands would fail on password-protected Redis instances. Fixed by adding `-a "source-pwd"` and `-a "target-pwd"` to the respective commands.

3. **Broken loop termination in TTL validation**: The condition `if issues + (sample_size - 1) == 0` with default `sample_size=500` evaluates to `issues + 499 == 0`, which is never true for non-negative `issues`. This meant the loop would scan every key in the database instead of stopping at the sample size. Fixed by introducing a `checked` counter and breaking when `checked >= sample_size`.

4. **Incorrect RIOT compare command syntax**: The flags `--source-uri`, `--target-uri`, and `--key-pattern` do not match RIOT's actual CLI interface. In RIOT 4.x, the source Redis is specified with the global `-u` option, and the compare subcommand takes its own `-u` for the target. Fixed to use `riot -u <source> compare -u <target>`.

## Review Notes
- The bash key-type distribution check (Level 2) is intentionally inefficient (runs TYPE per key sequentially). The post correctly notes this and offers a faster Python alternative, so no change needed.
- The TTL validation function does not handle `ttl()` returning `-2` (key does not exist), which could occur if a key expires between checking source and target. This is a minor edge case acceptable for a tutorial.
- The `redis-cli` commands will emit an authentication warning (`Warning: Using a password with '-a' option on the command line interface may not be safe`). In production scripts, adding `--no-auth-warning` would suppress this, but it is not necessary for a tutorial context.
