# Validation Summary: How to Use perf Tools with ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux perf (performance counters for Linux)
- ClickHouse (columnar database)
- Brendan Gregg's FlameGraph scripts
- DWARF debug symbols
- Hardware PMU events (CPU cycles, cache references, branch misses)

## Sources Consulted
- Linux perf documentation (man perf-record, man perf-stat, man perf-report)
- Linux kernel sysctl documentation for `kernel.perf_event_paranoid` and `kernel.kptr_restrict`
- Brendan Gregg's FlameGraph repository: https://github.com/brendangregg/FlameGraph
- ClickHouse official documentation on profiling and debug symbol packages
- pgrep man page for `-x` exact match flag

## Issues Found
No technical issues found.

## Review Notes
- The command `perf record -p ... -g --call-graph dwarf` uses both `-g` and `--call-graph dwarf`. The `-g` flag is technically redundant when `--call-graph dwarf` is explicitly specified (since `--call-graph dwarf` overrides the default frame-pointer mode implied by `-g`). However, this is an extremely common pattern in perf tutorials and works correctly, so no change was made.
- The "Profiling a Specific Query" section uses `-g` without `--call-graph dwarf`, which defaults to frame-pointer-based call graphs. If ClickHouse was compiled with `-fomit-frame-pointer` (common with optimization flags), call graphs may be incomplete. Using `--call-graph dwarf` would be more robust, but this is a quality consideration rather than a correctness error.
- The `perf_event_paranoid=1` setting allows unprivileged CPU profiling. For full kernel-level tracing, a value of `-1` or running as root would be needed. Since profiling a server process typically requires root anyway, this is adequate for the use cases shown.
