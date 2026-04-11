# Validation Summary: How to Load Test Redis with redis-benchmark

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- Redis
- redis-benchmark (built-in Redis benchmarking tool)
- Bash scripting

## Sources Consulted
- Redis official documentation on benchmarks: https://redis.io/docs/management/optimization/benchmarks/
- redis-benchmark --help flag reference
- Redis CLI documentation: https://redis.io/docs/ui/cli/

## Issues Found

### 1. Invalid test type `mget` in available command types list
**What was wrong:** The "Available command types" list included `mget`, which is not a valid test type for `redis-benchmark -t`. The supported built-in tests do not include an `mget` benchmark.
**What was changed:** Removed `mget` from the list.

### 2. Duplicate `mset` in available command types list
**What was wrong:** `mset` appeared twice in the available command types list (at position 12 and again at the end).
**What was changed:** Removed the duplicate entry.

### 3. Incorrect use of `-e` flag for custom commands
**What was wrong:** The "Custom Workload with Inline Commands" section used `-e "ZADD ..."` as if `-e` accepts a command string argument. In reality, `-e` is a boolean flag that means "show server errors on stdout" — it does not take an argument and cannot be used to specify custom commands. Additionally, `--cluster` was included unnecessarily and the shell `$((RANDOM))` expressions would only be evaluated once by the shell, not per request.
**What was changed:** Replaced both examples with the correct redis-benchmark syntax for custom commands: passing the command and arguments as positional parameters, using `__rand_int__` placeholders with `-r` for per-request randomization.

## Review Notes
- The "Interpreting Results" section mentions "garbage collection or OS jitter" as a cause of P50/P99 latency gaps. Since Redis is written in C and has no garbage collector, this could be misread as implying Redis has GC. The advice is correct when understood as referring to system-level factors (other processes, kernel scheduling), but could benefit from clarification in a future revision.
- The CSV output format shown matches Redis 7.x expanded CSV output. Older Redis versions (< 7.0) produced simpler two-column CSV output (test name and rps only). The post does not specify a minimum Redis version.
- The `xadd` test type (added in Redis 7.0+) is not listed in the available command types. This is not an error but could be added for completeness in a future update.
