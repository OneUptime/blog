# Validation Summary: How to Debug RESP Protocol Issues in Redis

## Status
validated

## Post Type
Tutorial / Debugging Guide

## Technologies Covered
- Redis (RESP protocol, redis-cli, MONITOR command)
- tcpdump (network packet capture)
- netcat (raw TCP testing)
- Python (RESP encoding examples)
- Bash / shell utilities

## Sources Consulted
- `redis-cli --help` output (redis-cli 7.0.11) — verified all CLI flags mentioned in the post
- Redis RESP protocol specification (https://redis.io/docs/reference/protocol-spec/) — verified RESP encoding format, CRLF requirements, bulk string byte counts, and inline vs multibulk command formats
- Python 3 `str.encode()` / `len()` behavior — verified Unicode string length vs UTF-8 byte length claims

## Issues Found

1. **Invalid `--resp` flag reference (line 15):** The post stated redis-cli has a `--resp` flag. This flag does not exist. The correct flags for RESP protocol selection are `-2` (RESP2) and `-3` (RESP3). Changed `--resp` to `-3` (RESP3).

2. **Invalid `--resp3` flag (lines 15, 19):** The post used `--resp3` as a long-form flag. redis-cli does not accept `--resp3` — the correct flag is `-3`. Changed both occurrences to `-3`.

3. **`--show-pushes` missing required argument (line 19):** The post used `--show-pushes` without an argument. This flag requires a `yes` or `no` value (e.g., `--show-pushes yes`). Added the required `yes` argument.

4. **Wrong byte count in netcat RESP example (line 62):** The bulk string length for "mykey" was specified as `$6`, but "mykey" is 5 bytes. Changed `$6` to `$5`.

## Review Notes
- The `--verbose` flag is valid in redis-cli 7.0.11 but its behavior is mainly relevant in cluster mode and may not produce the "see raw RESP bytes" behavior implied by the text. This is a minor presentation issue, not a technical error.
- The tcpdump example uses `-i lo` which is the Linux loopback interface name. On macOS, the loopback interface is `lo0`. Since the post doesn't specify a platform, this is acceptable but worth noting.
- The MONITOR command carries significant performance overhead in production. The post doesn't warn about this, which could be a useful addition in the future.
- The Python pipelining desync example uses pseudocode (`encode()`, `parse()`) that wouldn't run standalone, but it clearly illustrates the concept, which is appropriate for a debugging guide.
