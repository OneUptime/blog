# Validation Summary: How to Profile Redis Commands with LATENCY HISTOGRAM

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis 7.0+ (LATENCY HISTOGRAM command)
- Python (redis-py client library)
- Redis latency monitoring framework (SLOWLOG, LATENCY RESET, CONFIG RESETSTAT)

## Sources Consulted
- Redis official documentation for LATENCY HISTOGRAM: https://redis.io/docs/latest/commands/latency-histogram/
- Redis official documentation for LATENCY RESET: https://redis.io/docs/latest/commands/latency-reset/
- Redis official documentation for CONFIG RESETSTAT: https://redis.io/docs/latest/commands/config-resetstat/
- Redis 7.0 default redis.conf for `latency-tracking` default value

## Issues Found

### Issue 1: `latency-tracking` described as requiring explicit enablement
- **What was wrong:** The post stated "Latency tracking must be enabled in redis.conf or at runtime," implying it is off by default. In Redis 7.0+, `latency-tracking` is enabled by default (`yes`).
- **What was changed:** Rewrote the section to clarify that latency tracking is enabled by default, and the commands shown are for verification or re-enabling if previously disabled.

### Issue 2: Incorrect use of `LATENCY RESET` to reset histogram data
- **What was wrong:** The post claimed `LATENCY RESET` and `LATENCY RESET GET SET HSET` would reset histogram data. `LATENCY RESET` only resets latency spike events used by `LATENCY LATEST` and `LATENCY HISTORY`. It accepts event names (e.g., `command`, `fork`, `fast-command`), not Redis command names like GET or SET. It does not affect `LATENCY HISTOGRAM` data.
- **What was changed:** Replaced the section with the correct command `CONFIG RESETSTAT`, which is the documented way to clear latency histogram data. Added a note explaining the distinction between `LATENCY RESET` (spike events) and `CONFIG RESETSTAT` (histogram data).

## Review Notes
- The `latency-tracking-info-percentiles` config controls what percentiles appear in `INFO commandstats` output, not in `LATENCY HISTOGRAM` output. The post could be clearer about this distinction, but it's not technically wrong as presented.
- The Python scripts use `datetime.utcnow()` which has a deprecation warning in Python 3.12+. For newer Python versions, `datetime.now(datetime.UTC)` is preferred. This is minor and the code still works correctly.
- The SLOWLOG comparison table states SLOWLOG is available in "All versions" — technically it was introduced in Redis 2.2.12, but this is accurate enough for practical purposes since no one runs versions that old.
