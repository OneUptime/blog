# Validation Summary: How to Debug Redis Core Dumps with gdb

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (server, RDB persistence, crash reporting)
- GDB (GNU Debugger)
- Linux core dump configuration (`ulimit`, `/proc/sys/kernel/core_pattern`)

## Sources Consulted
- Redis source code (`rdb.c`, `server.c`) for function names and crash report format
- Redis configuration documentation for `crash-log-enabled`, `crash-memlog-enabled`, and `logfile` directives (introduced in Redis 6.2)
- Redis Makefile documentation for `make noopt` target
- GDB manual for `bt`, `frame`, `info locals`, `print`, `info threads`, `thread`, `x` (examine memory), and `thread apply all bt` commands
- Linux kernel documentation for `/proc/sys/kernel/core_pattern` format specifiers (`%e`, `%p`)

## Issues Found
- **Incorrect Redis function name in example backtrace**: The backtrace example used `rdbSaveObjectLen` which is not a real Redis function. The actual function for saving length-encoded values in the RDB format is `rdbSaveLen` (in `rdb.c`). Changed the backtrace frame `#1` from `rdbSaveObjectLen (rdb=0x7f3a20015b20, o=0x7f3a20003210)` to `rdbSaveLen (rdb=0x7f3a20015b20, len=128)` with corrected parameter names and types to match the real function signature.

## Review Notes
- The `crash-log-enabled` and `crash-memlog-enabled` configuration directives were introduced in Redis 6.2. The post does not specify a minimum Redis version; readers using older versions will not have these options available.
- The example backtrace is illustrative (addresses are fabricated), which is appropriate for a tutorial. The remaining function names (`rdbSaveObject`, `rdbSaveRio`) are real Redis functions.
- The I/O threads feature mentioned in the "Checking Thread State" section was introduced in Redis 6.0. This is worth noting for readers on older versions.
