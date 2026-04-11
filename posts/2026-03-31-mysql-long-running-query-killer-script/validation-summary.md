# Validation Summary: How to Write a MySQL Long-Running Query Killer Script

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (information_schema.PROCESSLIST, KILL QUERY, KILL CONNECTION)
- Bash scripting
- Cron scheduling
- MySQL command-line client (`mysql` CLI)

## Sources Consulted
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA PROCESSLIST Table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-processlist-table.html)
- MySQL 8.0 Reference Manual: KILL Statement (https://dev.mysql.com/doc/refman/8.0/en/kill.html)
- MySQL 8.0 Reference Manual: SHOW PROCESSLIST Statement (https://dev.mysql.com/doc/refman/8.0/en/show-processlist.html)
- MySQL 8.0 Reference Manual: mysql Client Options (https://dev.mysql.com/doc/refman/8.0/en/mysql-command-options.html)

## Issues Found
- **Inaccurate replication claim (line 19):** The original text stated "Replication lag causes a read replica to execute queries in the wrong order." This is incorrect — MySQL replication preserves transaction order. Changed to "A large replicated transaction on a read replica holds locks while applying, blocking user queries and causing them to pile up," which accurately describes how replication can produce long-running queries that a killer script would target.

## Review Notes
- The script interpolates `${MAX_SECONDS}` directly into SQL from a command-line argument. Since this is an ops script run by DBAs (not exposed to untrusted input), this is acceptable for a tutorial, but production deployments should validate that the argument is a positive integer.
- The script redirects stderr to `/dev/null` (`2>/dev/null`) on all mysql calls, which suppresses the "Using a password on the command line interface can be insecure" warning but also hides genuine connection errors. A production version could use a MySQL option file (`~/.my.cnf`) instead of passing the password on the command line.
- The `KILL QUERY` vs `KILL CONNECTION` explanation is accurate and well-presented.
- All SQL syntax, MySQL column names, COMMAND values (`Sleep`, `Binlog Dump`, `Binlog Dump GTID`), and internal user names (`system user`, `event_scheduler`) are correct.
