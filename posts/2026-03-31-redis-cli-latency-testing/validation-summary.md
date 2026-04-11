# Validation Summary: How to Use Redis CLI --latency for Latency Testing

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis (redis-cli)
- Bash scripting (cron job example)

## Sources Consulted
- Redis CLI source code (redis-cli.c): https://github.com/redis/redis/blob/unstable/src/redis-cli.c (lines 8160-8400, latency mode implementations)
- Redis CLI official documentation: https://redis.io/docs/latest/develop/tools/cli/
- Redis CLI documentation on GitHub: https://github.com/redis/redis-doc/blob/master/docs/connect/cli.md

## Issues Found
No technical issues found.

## Review Notes
- The `--latency-dist` simulated output shown in the post (with `#` bar charts and percentages) is a simplified representation. The actual output uses ANSI 256-color escape codes to render a color spectrum where single characters (`.`, `-`, `*`, `#`, `1`-`9`, `A`-`Q`) represent latency buckets and background colors indicate sample density. This cannot be accurately represented in markdown, so the simplification is acceptable, but readers should expect the real output to look quite different in their terminal.
- The cron script (`redis-cli --latency -i 10 2>&1 | tail -1`) works correctly because when output is piped (non-TTY mode), `--latency` with `-i` samples for the specified duration, prints one result, and exits automatically. This non-obvious behavior is not explained in the post but the script is correct.
- The `--intrinsic-latency` command requires a duration argument (e.g., `redis-cli --intrinsic-latency 100` for 100 seconds of testing), which the post omits. Since the post only describes the flag conceptually without showing a command example, this is acceptable.
- The latency interpretation table provides reasonable general guidelines but is not from official Redis documentation. Values will vary by deployment.
