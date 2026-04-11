# Validation Summary: Redis CLI Flags and Options Cheat Sheet

## Status
validated

## Post Type
Reference / Cheat Sheet

## Technologies Covered
- Redis (redis-cli command-line client)
- Redis Cluster management
- Redis Sentinel
- TLS/SSL connections
- RESP3 protocol

## Sources Consulted
- [Redis CLI official documentation](https://redis.io/docs/latest/develop/tools/cli/) — authoritative reference for all redis-cli flags and options
- [Redis 7.4 source code (redis-cli.c)](https://github.com/redis/redis/blob/7.4/src/redis-cli.c) — verified flag definitions in the `parseOptions()` function
- [Redis Sentinel documentation](https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/) — verified SENTINEL command terminology (replicas vs slaves)
- [redis-cli man page (Linux Command Library)](https://linuxcommandlibrary.com/man/redis-cli) — cross-referenced flag list

## Issues Found

1. **`--resp3` flag does not exist** (Output and Formatting section): Changed `--resp3` to `-3`. The RESP3 protocol mode flag is `-3` (short flag only); there is no long-form `--resp3` option. Similarly, RESP2 mode uses `-2`.

2. **`--quoted-output` flag does not exist** (Output and Formatting section): Changed `--quoted-output` to `--quoted-input`. There is no `--quoted-output` flag in redis-cli. The correct flag is `--quoted-input`, which parses quoted strings in input. Updated the comment accordingly.

3. **`--show-warnings` flag does not exist** (Output and Formatting section): Changed `--show-warnings` to `--show-pushes <yn>`. There is no `--show-warnings` flag in redis-cli. The closest equivalent is `--show-pushes <yn>`, which controls whether RESP3 PUSH messages are displayed. Updated the comment accordingly.

4. **Misleading comment for `--pipe-timeout`** (Running Commands Non-Interactively section): Changed comment from "Pipe mode with stats output" to "Pipe mode with custom timeout (seconds)". The `--pipe-timeout` flag controls how long pipe mode waits for the last reply; it does not control stats output (pipe mode always shows stats on completion).

5. **`SENTINEL slaves` is deprecated** (Sentinel Mode section): Changed `SENTINEL slaves mymaster` to `SENTINEL replicas mymaster`. Since Redis 5.0, the `slaves` terminology has been deprecated in favor of `replicas`. While `SENTINEL slaves` still works for backward compatibility, a current cheat sheet should use modern terminology.

## Review Notes
- The post does not mention the `-3`/`-2` flags' companion `--json` and `--quoted-json` output modes, which were added in Redis 7.0 and are commonly used with RESP3. These could be valuable additions in a future update.
- The `SENTINEL slaves` alias still works at the protocol level for backward compatibility, but all official Redis documentation now uses `replicas`.
- The `--memkeys` and `--keystats` flags (added in recent Redis versions) are not covered but could be useful additions for a "complete reference" cheat sheet.
- The `-v` flag is used for version output; while it works, the officially documented long form is `--version`.
