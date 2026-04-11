# Validation Summary: How to Use TIME() Function to Extract Time in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (TIME(), HOUR(), MINUTE(), SECOND(), EXTRACT(), ADDTIME(), TIMEDIFF(), TIMESTAMPDIFF(), TIME_TO_SEC(), CURTIME())
- SQL date/time functions and indexing strategies

## Sources Consulted
- MySQL 8.0 Reference Manual — Date and Time Functions: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_time
- MySQL 8.0 Reference Manual — Fractional Seconds in Time Values: https://dev.mysql.com/doc/refman/8.0/en/fractional-seconds.html
- MySQL 8.0 Reference Manual — Functional Key Parts (functional indexes): https://dev.mysql.com/doc/refman/8.0/en/create-index.html#create-index-functional-key-parts
- MySQL 8.0 Reference Manual — TIMESTAMPDIFF: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_timestampdiff

## Issues Found

1. **Fractional seconds output was incorrect (line 131)**: The post claimed `SELECT TIME('2026-03-31 14:22:07.413')` returns `14:22:07.413000` (zero-padded to 6 digits). The TIME() function preserves fractional seconds as given in the input — the result is `14:22:07.413` (3 fractional digits matching the input's precision). Fixed the comment to show the correct output.

2. **TIMESTAMPDIFF used incorrectly with TIME values (line 84)**: The original code used `TIMESTAMPDIFF(SECOND, TIME(scheduled_at), CURTIME())`, but TIMESTAMPDIFF is documented to accept date or datetime expressions, not TIME values. Replaced with `TIME_TO_SEC(TIME(scheduled_at)) - TIME_TO_SEC(CURTIME())`, which is the correct way to compute a second-level difference between two TIME values.

3. **Performance Note incorrectly claimed HOUR() is index-friendly (lines 154-162)**: The post presented `WHERE HOUR(created_at) < 12` as an "index-friendly alternative" to `WHERE TIME(created_at) < '12:00:00'`. This is incorrect — any function wrapping an indexed column (including HOUR()) prevents the optimizer from using that index. Both expressions cause full table scans. Fixed by correcting the explanation and adding two legitimate index-friendly alternatives: functional indexes (MySQL 8.0.13+) and generated columns with regular indexes.

## Review Notes
- The `HOUR(TIME(created_at))` usage in the aggregation example is redundant since `HOUR()` accepts DATETIME values directly, but it is not technically wrong.
- The shift-based join example using `BETWEEN s.start_time AND s.end_time` assumes shifts don't cross midnight. Shifts spanning midnight (e.g., 22:00 to 06:00) would need additional logic, but this is a scope/edge-case concern rather than a correctness error.
