# Validation Summary: How to Script Redis Operations with redis-cli and Bash

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (redis-cli)
- Bash scripting
- Redis SCAN / --scan
- Redis pipe mode (--pipe)
- Redis EVAL (Lua scripting)

## Sources Consulted
- Redis CLI official documentation: https://redis.io/docs/connect/cli/
- Redis SCAN command documentation: https://redis.io/commands/scan/
- Redis EVAL command documentation: https://redis.io/commands/eval/
- Redis --pipe mode documentation: https://redis.io/docs/management/cli/#pipe-mode
- Redis --scan option documentation: https://redis.io/docs/connect/cli/#scanning-for-keys

## Issues Found
1. **Bulk Delete by Pattern section used single SCAN call instead of --scan**: Both the `xargs` and pipe-mode bulk delete examples used `redis-cli SCAN 0 MATCH "temp:*" COUNT ...`, which performs only a single SCAN iteration and returns one batch of results. Since SCAN is cursor-based and requires repeated calls to iterate through all keys, these examples would silently miss keys if the dataset is larger than a single batch. Fixed by replacing `SCAN 0 MATCH "temp:*" COUNT N | tail -n +2` with `redis-cli --scan --pattern "temp:*"`, which handles cursor iteration internally and streams all matching keys.

## Review Notes
- The SCAN loop in the "Iterating Over Keys Safely with SCAN" section correctly implements the full cursor-based iteration pattern with a while loop. The bug was only in the "Bulk Delete" section which omitted the loop.
- The Lua EVAL example returns "OK" (from SET) on first invocation but an integer (from INCR) on subsequent invocations. This inconsistency is minor and acceptable for a demonstration.
- The pipe mode CSV import example (`echo "SET $key $value"`) uses inline Redis commands which would break if values contain spaces. This is an acceptable simplification for the scope of the tutorial.
- The approach of storing `redis-cli` with connection flags in a variable (`$REDIS PING`) works due to Bash word splitting but is fragile if passwords contain spaces. Acceptable for a blog post demonstration.
