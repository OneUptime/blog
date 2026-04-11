# Validation Summary: How to Use LOAD DATA INFILE to Skip Header Rows in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (LOAD DATA INFILE statement)
- Bash/shell utilities (wc, tail)

## Sources Consulted
- MySQL 8.0 Reference Manual — LOAD DATA Statement: https://dev.mysql.com/doc/refman/8.0/en/load-data.html
- MySQL 8.0 Reference Manual — LINES STARTING BY and TERMINATED BY syntax

## Issues Found

1. **Incorrect description of LINES STARTING BY behavior** (line 60): The post stated that `LINES STARTING BY` "causes MySQL to skip any line that does not begin with the specified prefix." Per MySQL documentation, MySQL searches for the first occurrence of the prefix *anywhere* in the line, not just at the beginning. Lines that do not *contain* the prefix are skipped, and when found, everything before and including the prefix is stripped. Fixed the wording to say "does not contain" and added clarification about the stripping behavior.

2. **File path mismatch in shell example** (lines 119-128): The `tail` command wrote the output to `users_no_header.csv` in the current working directory, but the subsequent `LOAD DATA INFILE` statement referenced `/tmp/users_no_header.csv`. This inconsistency would cause a file-not-found error at import time. Fixed by changing the `tail` output path to `/tmp/users_no_header.csv` to match the SQL statement.

## Review Notes
- The shell example uses `LOAD DATA INFILE` (server-side file read) via `mysql -e`. This requires the MySQL server process to have read access to `/tmp/users_no_header.csv`. Users connecting to a remote MySQL server would need `LOAD DATA LOCAL INFILE` instead. This is a valid approach for local servers but could be noted in a future revision.
- The `wc -l` suggestion for verifying row counts is correct but could be slightly misleading: `wc -l` counts newline characters, so a file without a trailing newline will report one fewer line than expected. This edge case is minor and does not warrant a fix.
- All SQL syntax (`IGNORE n ROWS`, `FIELDS TERMINATED BY`, `LINES STARTING BY ... TERMINATED BY`, `OPTIONALLY ENCLOSED BY`) is correct per MySQL 8.0 documentation.
