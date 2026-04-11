# Validation Summary: How to Analyze Redis Core Dumps for Debugging

## Status
validated

## Post Type
Tutorial / Debugging Guide

## Technologies Covered
- Redis (6.2+)
- GDB (GNU Debugger)
- Linux core dumps (ulimit, kernel.core_pattern)
- AddressSanitizer (ASAN)

## Sources Consulted
- Redis official source code (`src/config.c`) for config directive verification across versions 6.2, 7.0, 7.2, 7.4
- Redis official `redis.conf` annotated configuration file (https://github.com/redis/redis/blob/unstable/redis.conf)
- GDB documentation for command syntax verification
- Linux man pages for `ulimit`, `core(5)`, and `/proc/sys/kernel/core_pattern`

## Issues Found

### 1. Incorrect config directive: `crash-memlog-enabled`
- **What was wrong:** The post used `crash-memlog-enabled yes` which is not a valid Redis configuration directive.
- **What was changed:** Corrected to `crash-memcheck-enabled yes`, which is the actual Redis config option (introduced in Redis 6.2) that controls the fast memory check performed as part of crash logging.
- **Why:** Using a non-existent config directive would cause Redis to fail to start or silently ignore the option, leaving the feature unconfigured.

### 2. Incorrect config directive: `disable-thp-warning`
- **What was wrong:** The post used `disable-thp-warning no` which is not a valid Redis configuration directive.
- **What was changed:** Corrected to `disable-thp yes`, which is the actual Redis config option (introduced in Redis 6.2) that controls whether Redis attempts to disable Transparent Huge Pages for its process.
- **Why:** The correct option name is `disable-thp`, not `disable-thp-warning`. The default and recommended value is `yes` (disable THP), as THP can cause latency spikes and increased memory usage during fork operations.

## Review Notes
- The `use-exit-on-panic` config option is valid but is a hidden config (marked with `HIDDEN_CONFIG` flag in Redis 7.2+). It does not appear in the default `redis.conf` file. This is technically correct but readers may not find it in their config file template.
- The compile-from-source command (`make CFLAGS="-g -O0" LDFLAGS="-rdynamic"`) works but Redis also provides a built-in `make noopt` target that handles debug builds more cleanly.
- The AddressSanitizer section works but Redis also provides a `make SANITIZER=address` target in newer versions for a more integrated ASAN build.
- The common crash patterns section uses illustrative file names and line numbers that may not match current Redis source code, but this is acceptable as they are presented as examples of patterns rather than exact references.
