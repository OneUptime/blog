# Validation Summary: How to Use SELECT INTO OUTFILE for Data Export in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (SELECT INTO OUTFILE)
- SQL (GRANT, SHOW VARIABLES)
- Bash scripting (batch export)
- scp / rsync (file transfer)

## Sources Consulted
- MySQL 8.0 Reference Manual — SELECT ... INTO OUTFILE: https://dev.mysql.com/doc/refman/8.0/en/select-into.html
- MySQL 8.0 Reference Manual — Server System Variables (secure_file_priv): https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_secure_file_priv
- MySQL 8.0 Reference Manual — GRANT Statement: https://dev.mysql.com/doc/refman/8.0/en/grant.html
- MySQL 8.0 Reference Manual — LOAD DATA and SELECT INTO OUTFILE field/line options: https://dev.mysql.com/doc/refman/8.0/en/load-data.html

## Issues Found
1. **Broken batch export COUNT query**: The original script used `SELECT COUNT(*) FROM big_table LIMIT $BATCH OFFSET $OFFSET` to check if more rows remain. This is incorrect because `COUNT(*)` aggregates the entire table into a single result row; applying `LIMIT/OFFSET` to that one-row result does not paginate the underlying data. On the first iteration (OFFSET=0), it returns the total row count. On the second iteration (OFFSET=100000), the single result row is skipped entirely, returning an empty result — causing the script to either error out or silently stop after one batch. Fixed by wrapping the paginated query in a subquery: `SELECT COUNT(*) FROM (SELECT 1 FROM big_table LIMIT $BATCH OFFSET $OFFSET) AS t`, which correctly counts how many rows exist in the current batch window.

## Review Notes
- The `ESCAPED BY '\\'` example sets the escape character to backslash, which is already the default. The example is still useful for demonstrating the syntax and is paired with `LINES TERMINATED BY '\r\n'` for Windows-style output, so it serves a purpose.
- The batch export approach using `LIMIT/OFFSET` on very large tables can be slow for later batches since MySQL must scan and discard all preceding rows. For production use, keyset pagination (e.g., `WHERE id > last_seen_id`) would be more performant, but this is an optimization concern rather than a correctness issue.
- All SQL syntax, privilege requirements, `secure_file_priv` behavior, error codes, and file transfer commands are accurate per MySQL 8.0 documentation.
