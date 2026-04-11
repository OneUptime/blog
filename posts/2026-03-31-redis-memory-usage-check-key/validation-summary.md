# Validation Summary: How to Use MEMORY USAGE in Redis to Check Key Memory

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (7+)
- `MEMORY USAGE` command
- `OBJECT ENCODING` command
- `redis-cli` (CLI tool with `--scan` flag)
- Bash scripting for Redis key auditing

## Sources Consulted
- Redis official documentation for MEMORY USAGE: https://redis.io/docs/latest/commands/memory-usage/
- Redis official documentation for OBJECT ENCODING: https://redis.io/docs/latest/commands/object-encoding/
- Redis configuration reference for `hash-max-listpack-entries` (default 128 in Redis 7+)
- Redis documentation on data type internals and encoding thresholds

## Issues Found
- **Comparing Encodings section: incorrect hashtable encoding claim.** The original post showed a hash with only 9 small fields (`f1 v1` through `f9 v9`) and claimed `OBJECT ENCODING` would return `"hashtable"`. This is incorrect under default Redis 7+ configuration, where `hash-max-listpack-entries` defaults to 128. A hash with 9 small-value fields would still use the compact `"listpack"` encoding. **Fix applied:** Rewrote the section to explicitly lower `hash-max-listpack-entries` to 3 via `CONFIG SET` to demonstrate the encoding switch, then restore the default. Added a brief explanation of why the threshold is lowered.

## Review Notes
- The exact byte counts in the examples (56, 152, 163, etc.) are illustrative and will vary depending on Redis version, platform, and allocator. This is acceptable for a tutorial — the concepts are correct even if the exact numbers differ.
- The bash scripts correctly rely on `redis-cli` switching to raw output mode when stdout is piped/redirected, which strips the `(integer)` prefix and returns plain numbers suitable for arithmetic.
- The post references `SAMPLES 0` for exact measurement and `SAMPLES 5` as the default — both are correct per official documentation.
- The mermaid diagram accurately represents the components included in the MEMORY USAGE calculation.
