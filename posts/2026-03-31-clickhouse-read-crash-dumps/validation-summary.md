# Validation Summary: How to Read ClickHouse Crash Dumps

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (server crash handling, debug symbols, system tables)
- GDB (GNU Debugger)
- addr2line (binutils)
- Linux core dump configuration (ulimit, /proc/sys/kernel/core_pattern)
- systemd service unit configuration
- AddressSanitizer / UBSan
- dmesg / journalctl (OOM kill detection)

## Sources Consulted
- ClickHouse official install docs (Debian/Ubuntu packages): https://clickhouse.com/docs/en/install
- ClickHouse troubleshooting guide: https://clickhouse.com/docs/en/guides/troubleshooting
- ClickHouse system.stack_trace table docs: https://clickhouse.com/docs/en/operations/system-tables/stack_trace
- ClickHouse system.crash_log table docs: https://clickhouse.com/docs/en/operations/system-tables/crash_log
- ClickHouse introspection functions (addressToSymbol, demangle, addressToLine): https://clickhouse.com/docs/en/sql-reference/functions/introspection
- ClickHouse SignalHandlers.cpp source code on GitHub
- Linux core(5) man page: https://man7.org/linux/man-pages/man5/core.5.html
- systemd LimitCORE documentation

## Issues Found

1. **Non-existent `clickhouse-symbolizer` tool**: The post referenced a `clickhouse-symbolizer` tool described as "bundled with ClickHouse." No such standalone tool exists in ClickHouse packages. Replaced with accurate information about ClickHouse's built-in automatic symbolization (when debug symbols are installed) and the SQL introspection functions (`addressToSymbol`, `demangle`) available via `system.stack_trace`.

2. **Inaccurate crash log example**: The example crash output used the text `Signal 11. Received 1 times. More likely there is a bug in ClickHouse.` with `Stack trace (use flamegraph.pl or addr2line):`. This wording does not match actual ClickHouse crash output. Replaced with accurate format showing the `########## Short fault info ############` header, version/build info line, `Received signal 11` message, `Signal description: Segmentation fault`, and numbered stack trace entries, matching the real output from ClickHouse's SignalHandlers.

3. **Summary section reference to `clickhouse-symbolizer`**: Updated the closing summary paragraph to remove the reference to the non-existent tool.

## Review Notes
- The post uses `/usr/bin/clickhouse-server` as the binary path for GDB and addr2line. In practice this is a symlink to `/usr/bin/clickhouse` (the single-binary architecture). This works correctly since the symlink resolves, but readers should be aware the canonical binary is `/usr/bin/clickhouse`.
- The `clickhouse-common-static-dbg` package name is correct for Debian/Ubuntu. RPM-based distributions use `clickhouse-common-static-dbg` as well (available from the ClickHouse RPM repository).
- The post could mention ClickHouse's `system.crash_log` system table, which stores crash information queryable via SQL after the server restarts, but this is an enhancement rather than a correction.
