# Validation Summary: How to Use SLEEP() Function in MySQL for Testing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (SLEEP() function, optimizer hints, slow query log, InnoDB locking, KILL QUERY, stored procedures, connection timeout settings)

## Sources Consulted
- MySQL 8.0 Reference Manual: SLEEP() function — https://dev.mysql.com/doc/refman/8.0/en/miscellaneous-functions.html#function_sleep
- MySQL 8.0 Reference Manual: Optimizer Hints (MAX_EXECUTION_TIME) — https://dev.mysql.com/doc/refman/8.0/en/optimizer-hints.html#optimizer-hints-execution-time
- MySQL 8.0 Reference Manual: Server System Variables (wait_timeout, interactive_timeout) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_wait_timeout
- MySQL 5.7 Release Notes (5.7.8 changelog for MAX_EXECUTION_TIME hint) — https://dev.mysql.com/doc/relnotes/mysql/5.7/en/news-5-7-8.html
- MySQL 8.0 Reference Manual: KILL Statement — https://dev.mysql.com/doc/refman/8.0/en/kill.html
- MySQL 8.0 Reference Manual: InnoDB Locking — https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html

## Issues Found

1. **Incorrect MySQL version for MAX_EXECUTION_TIME hint (line 43)**: The post stated the `/*+ MAX_EXECUTION_TIME(N) */` optimizer hint was available from MySQL 5.7.4+. The optimizer hint syntax was actually introduced in MySQL 5.7.8. MySQL 5.7.4 introduced the `max_statement_time` system variable, but the hint form came later. Fixed "5.7.4+" to "5.7.8+".

2. **Incorrect claim about wait_timeout/interactive_timeout killing active SLEEP() (lines 125-132)**: The post incorrectly stated that setting `wait_timeout = 5` would cause `SELECT SLEEP(10)` to be killed at 5 seconds. This is wrong — `wait_timeout` and `interactive_timeout` only apply to **idle** connections (the server waiting for the client to send the next request). An actively executing `SLEEP()` call is not idle; the server is processing a query. The SLEEP(10) would complete normally after 10 seconds. Rewrote the section to correctly demonstrate how these timeouts work: they close connections that are idle between queries, not during query execution.

## Review Notes
- The post correctly warns against using SLEEP() in production, which is important advice.
- The stored procedure example using `DO SLEEP(delay)` is a nice touch — `DO` is the proper way to call a function when you want to discard the return value.
- The KILL QUERY example correctly notes that SLEEP returns 1 when interrupted, and the processlist query is a valid approach to finding the session to kill.
- The lock contention example accurately demonstrates InnoDB row-level locking behavior with `FOR UPDATE`.
