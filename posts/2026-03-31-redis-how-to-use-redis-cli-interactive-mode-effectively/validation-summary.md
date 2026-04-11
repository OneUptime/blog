# Validation Summary: How to Use Redis CLI Interactive Mode Effectively

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis CLI (`redis-cli`)
- Redis server (6.0+ and 7.0+ features referenced)
- Lua scripting with Redis
- RESP3 protocol

## Sources Consulted
- Official Redis CLI documentation: https://redis.io/docs/latest/develop/connect/cli/
- Official Redis commands reference: https://redis.io/docs/latest/commands/

## Issues Found

1. **`CLOSE` listed in tab completion (line 39)**: `CLOSE` is not a valid Redis command. Tab completion for `cl<TAB>` would show `CLIENT` and `CLUSTER` only. Removed `CLOSE` from the example.

2. **`--resp3` long-form flag (line 113)**: The long-form `--resp3` flag does not exist in redis-cli. Only the short form `-3` is valid. Changed `--resp3` to `-3`.

3. **`--intrinsic-latency` mislabeled as "Watch key changes in real time" (line 129)**: `--intrinsic-latency` measures system-level intrinsic latency (kernel scheduler, hypervisor, etc.) — it has nothing to do with watching key changes. Fixed the comment to accurately describe its purpose.

4. **Missing `-r` flag for command repetition (line 133)**: `redis-cli -i 1 INFO memory` would run only once because `-i` (interval) requires `-r` (repeat count) to actually repeat. Changed to `redis-cli -r -1 -i 1 INFO memory` where `-r -1` means infinite repeats.

5. **`--no-auth-warning` in formatting section (line 143)**: The example `redis-cli --no-auth-warning --raw LRANGE mylist 0 -1` included `--no-auth-warning` which is unrelated to output formatting (it suppresses password warnings when using `-a`). Removed the misleading flag and fixed the comment.

6. **`--quoted-output` is not a valid flag (line 149)**: `--quoted-output` does not exist in redis-cli. The valid flag for quoted JSON output is `--quoted-json` (Redis 7.0+). Changed to `--quoted-json` with an updated comment.

7. **`--hex` is not a valid flag (line 159)**: `--hex` does not exist in redis-cli. Changed the example to pipe through `xxd` for hex output (`redis-cli --raw GET mykey | xxd`), which is the standard approach.

## Review Notes
- The `--pipe` mode section shows inline command format. While the official docs describe `--pipe` as accepting "raw Redis protocol" (RESP format), the Redis server does accept inline commands, so the example works in practice for simple cases. For truly large-scale mass insertion, RESP format would be more reliable and performant.
- The `DEBUG SLEEP` command shown in the "Useful Interactive Commands" section may be disabled in production Redis configurations (the `DEBUG` command is often restricted).
- The `LATENCY` commands require `latency-monitor-threshold` to be configured to a non-zero value to produce meaningful data.
