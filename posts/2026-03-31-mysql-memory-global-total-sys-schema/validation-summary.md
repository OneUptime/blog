# Validation Summary: How to Use the memory_global_total View in MySQL sys Schema

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.7+ / 8.0+)
- MySQL sys Schema (memory views)
- MySQL Performance Schema (memory instrumentation and summary tables)

## Sources Consulted
- MySQL 8.0 Reference Manual: sys Schema memory_global_total view — https://dev.mysql.com/doc/refman/8.0/en/sys-memory-global-total.html
- MySQL 8.0 Reference Manual: sys Schema memory_global_by_current_bytes view — https://dev.mysql.com/doc/refman/8.0/en/sys-memory-global-by-current-bytes.html
- MySQL 8.0 Reference Manual: sys Schema memory_by_user_by_current_bytes view — https://dev.mysql.com/doc/refman/8.0/en/sys-memory-by-user-by-current-bytes.html
- MySQL 8.0 Reference Manual: sys Schema memory_by_host_by_current_bytes view — https://dev.mysql.com/doc/refman/8.0/en/sys-memory-by-host-by-current-bytes.html
- MySQL 8.0 Reference Manual: sys Schema memory_by_thread_by_current_bytes view — https://dev.mysql.com/doc/refman/8.0/en/sys-memory-by-thread-by-current-bytes.html
- MySQL 8.0 Reference Manual: Performance Schema memory_summary_global_by_event_name table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-memory-summary-tables.html
- MySQL 8.0 Reference Manual: Performance Schema setup_instruments table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-setup-instruments-table.html

## Issues Found
No technical issues found.

## Review Notes
- The "Identifying Memory Leaks" section's explanation is slightly nuanced: if a component's `high_alloc` far exceeds `current_alloc`, this typically means memory was allocated and then properly freed, which is normal behavior rather than a leak. A true memory leak would show `current_alloc` staying high or growing over time. The text does acknowledge the alternative ("or the workload was much heavier in the past"), so this is not incorrect, just a subtlety worth noting.
- In MySQL 8.0, most `memory/%` instruments are enabled by default. The post's "Enabling Memory Instrumentation" section is still useful for MySQL 5.7 or cases where instruments have been explicitly disabled, but readers on MySQL 8.0+ may not need this step.
- The memory leak detection query compares formatted string values (`current_alloc != high_alloc`) from the human-readable sys view. This works for detecting differences, but for numeric comparisons the `x$memory_global_by_current_bytes` (raw numeric) variant would be more precise.
