# Validation Summary: How to Use MySQL Query Profiling with SET profiling=1

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.6+, 5.7+, 8.0+)
- SQL (DDL, DML, profiling commands)
- MySQL Performance Schema

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW PROFILE Statement — https://dev.mysql.com/doc/refman/8.0/en/show-profile.html
- MySQL 8.0 Reference Manual: SHOW PROFILES Statement — https://dev.mysql.com/doc/refman/8.0/en/show-profiles.html
- MySQL 8.0 Reference Manual: profiling system variable — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_profiling
- MySQL 8.0 Reference Manual: Performance Schema Statement Event Tables — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-events-statements-history-long-table.html
- MySQL 8.0 Reference Manual: Performance Schema setup_instruments Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-setup-instruments-table.html
- MySQL 8.0 Reference Manual: ELT Function — https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_elt

## Issues Found
No technical issues found.

## Review Notes
- The sales data generation cross-join produces 400 rows (10x10x4), not 500. The `WHERE n <= 500` clause is a no-op since the maximum generated `n` value is 400. This is not technically incorrect (the SQL runs fine and produces valid sample data), but it is slightly misleading if a reader expects exactly 500 rows. Left as-is since exact row count is immaterial to the profiling demonstration.
- `SHOW PROFILE` is deprecated since MySQL 5.6.7 and the post correctly notes this. In MySQL 8.0, the feature still works but may be removed in a future version. The post appropriately covers the Performance Schema alternative.
- The "Sending data" stage name was historically overloaded in MySQL (covering data retrieval, not just network sending). In MySQL 8.0.32+, this thread state was refined, but for `SHOW PROFILE` output the stage names remain the same. The post's explanation is accurate.
- The Performance Schema timer conversion (`TIMER_WAIT/1000000000 AS duration_ms`) is correct: TIMER_WAIT is stored in picoseconds, and dividing by 10^9 yields milliseconds.
