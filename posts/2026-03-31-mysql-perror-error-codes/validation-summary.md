# Validation Summary: How to Use perror to Look Up MySQL Error Codes

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL `perror` command-line utility
- MySQL error codes and OS error codes
- MySQL `performance_schema` error summary tables
- MySQL `SHOW ERRORS` and `SHOW WARNINGS` statements

## Sources Consulted
- MySQL 8.0 Reference Manual — perror utility: https://dev.mysql.com/doc/refman/8.0/en/perror.html
- MySQL 8.0 Release Notes (8.0.13, 8.0.16): https://dev.mysql.com/doc/relnotes/mysql/8.0/en/
- MySQL 8.0 Error Message Reference: https://dev.mysql.com/doc/mysql-errors/8.0/en/
- MySQL 8.0 Performance Schema Error Summary Tables: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-error-summary-tables.html
- MySQL 8.0 ndb_perror utility: https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-programs-ndb-perror.html

## Issues Found

1. **False claim about perror being removed in MySQL 8.0.16** (line 15): The post claimed `perror` was "replaced by `mysql --verbose --help`" and that "perror functionality was merged into the `mysqld` binary" in MySQL 8.0.16. This is entirely incorrect — `perror` remains available in MySQL 8.0, 8.4, and later. The `--ndb` option was removed in 8.0.13 (replaced by `ndb_perror`), but the utility itself was never removed. Fixed the note to accurately describe what changed.

2. **Incorrect use of `--ndb` flag for OS error lookup** (line 55): The post used `perror --ndb 28` to look up OS error code 28. The `--ndb` flag is for NDB Cluster error codes, not OS errors. The correct command is simply `perror 28`. Removed the `--ndb` flag.

3. **Non-functional MySQL 8.0+ alternative** (lines 74-81): The post suggested `mysqld --verbose --help 2>/dev/null | grep 'ER_ACCESS'` as a replacement for `perror`. This command does not work — `mysqld --verbose --help` outputs server configuration options and variables, not error code references. Replaced the entire section with a pointer to the official MySQL Error Message Reference documentation.

4. **Misleading comment about stored procedure** (line 95): The SQL comment said "Get the error message for a specific code via a stored procedure" but the code was a SELECT query against `performance_schema.events_errors_summary_global_by_error`. This table tracks error occurrence statistics (counts, timestamps), not error message text. Fixed the comment to accurately describe what the table provides and selected specific relevant columns.

5. **Incorrect summary claim** (line 133): The summary referenced `mysqld --verbose --help` as an alternative on MySQL 8.0.16+. Updated to point to the MySQL Error Message Reference documentation instead.

## Review Notes
- The `perror` output format shown (with `MY-NNNNNN` prefix) is specific to MySQL 8.0. In MySQL 5.7 and earlier, the format was different (no `MY-` prefix). The post doesn't specify which version's output format is shown, but since 8.0 is current, this is acceptable.
- The bash script in "Using perror in Scripts" uses `grep -oP` (Perl-compatible regex), which works on Linux with GNU grep but not on macOS with BSD grep by default. This is a minor portability note but not an error since MySQL servers typically run on Linux.
- The script's `grep -oP '\d+'` pattern will match ALL numbers in matching lines (timestamps, line numbers, etc.), not just error codes. This could produce false matches, but as a simplified example it's acceptable.
