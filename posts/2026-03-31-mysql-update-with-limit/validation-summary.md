# Validation Summary: How to Use UPDATE with LIMIT in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (UPDATE, LIMIT, ORDER BY, ROW_COUNT(), multi-table UPDATE restrictions)
- Bash scripting (iterative batch processing with mysql CLI)
- Python (mysql.connector library)

## Sources Consulted
- MySQL 8.0 Reference Manual — UPDATE Statement: https://dev.mysql.com/doc/refman/8.0/en/update.html
- MySQL 8.0 Reference Manual — Information Functions (ROW_COUNT()): https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_row-count
- MySQL 8.0 Reference Manual — Subqueries: https://dev.mysql.com/doc/refman/8.0/en/subqueries.html
- mysql.connector Python API documentation: https://dev.mysql.com/doc/connector-python/en/

## Issues Found
1. **Bash script ROW_COUNT() called in a separate session**: The original bash script ran the `UPDATE` in one `mysql` invocation and then called `SELECT ROW_COUNT();` in a second, separate `mysql` invocation. Since `ROW_COUNT()` is session-scoped and returns the affected row count of the previous statement *within the same session*, the second invocation would always return `-1` (no prior applicable statement), causing the loop to never terminate. **Fix:** Combined the `UPDATE` and `SELECT ROW_COUNT();` into a single `mysql -sN -e` invocation so both execute in the same session, and captured the output into the `AFFECTED` variable directly.

2. **Text/example mismatch for LIMIT value**: The paragraph below the `ORDER BY` example stated "MySQL can pick any 1,000 rows" but the accompanying SQL example used `LIMIT 100`. **Fix:** Changed "1,000" to "100" to match the example.

## Review Notes
- The `mysql -p` flag (without an inline password) will prompt for a password interactively, which is fine for manual use but would block in an unattended script. This is acceptable for a tutorial context but readers running automated batch jobs should use a MySQL option file (`~/.my.cnf`) or other credential mechanism instead.
- The Python example correctly uses `cursor.rowcount` which is reliable for `UPDATE` statements with `mysql.connector`.
- The nested subquery workaround for multi-table UPDATE with LIMIT is correct — the derived table (`AS sub`) is necessary to avoid the MySQL restriction against modifying and selecting from the same table in a subquery.
