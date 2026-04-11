# Validation Summary: How to Monitor Memory Usage with Performance Schema in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- MySQL Performance Schema
- Performance Schema memory instrumentation (`memory_summary_global_by_event_name`, `memory_summary_by_thread_by_event_name`, `memory_summary_by_user_by_event_name`)

## Sources Consulted
- MySQL 8.0 Reference Manual — Performance Schema Memory Summary Tables: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-memory-summary-tables.html
- MySQL 8.0 Reference Manual — Performance Schema setup_instruments Table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-setup-instruments-table.html
- MySQL 8.0 Reference Manual — Query Cache removal: https://dev.mysql.com/doc/refman/8.0/en/query-cache.html
- MySQL 8.0 Reference Manual — Performance Schema threads Table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-threads-table.html

## Issues Found
1. **`memory/sql/Query_cache` instrument does not exist in MySQL 8.0** (appeared in two places). The Query Cache was deprecated in MySQL 5.7.20 and fully removed in MySQL 8.0. The `memory/sql/Query_cache` Performance Schema instrument therefore does not exist in MySQL 8.0+. Replaced both references with `memory/sql/THD::main_mem_root`, which is a valid and commonly used memory instrument in MySQL 8.0.
   - Line 20 (verification query): Changed `WHERE NAME = 'memory/sql/Query_cache'` to `WHERE NAME = 'memory/sql/THD::main_mem_root'`.
   - Line 94 (user account query): Changed `OR EVENT_NAME = 'memory/sql/Query_cache'` to `OR EVENT_NAME = 'memory/sql/THD::main_mem_root'`.

## Review Notes
- All memory summary table names (`memory_summary_global_by_event_name`, `memory_summary_by_thread_by_event_name`, `memory_summary_by_user_by_event_name`) are correct for MySQL 8.0.
- Column names (`CURRENT_COUNT_USED`, `CURRENT_NUMBER_OF_BYTES_USED`, `HIGH_NUMBER_OF_BYTES_USED`) are valid for the memory summary tables.
- The `SUBSTRING_INDEX(EVENT_NAME, '/', 2)` technique for grouping by subsystem is a correct and common approach.
- The snapshot-based memory growth detection technique is sound.
- The claim that memory instruments are enabled by default in MySQL 8.0 is accurate — most memory instruments are enabled by default when `performance_schema = ON`.
- The `memory/sql/THD::main_mem_root` instrument used in the per-thread query is a valid, well-known instrument in MySQL 8.0.
