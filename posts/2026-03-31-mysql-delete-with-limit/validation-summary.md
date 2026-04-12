# Validation Summary: How to Use DELETE with LIMIT in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB) — DELETE with LIMIT, ORDER BY, multi-table DELETE restrictions
- Bash scripting — iterative batch deletion loop
- Python — mysql.connector for batch deletion

## Sources Consulted
- MySQL 8.0 Reference Manual: DELETE Statement — https://dev.mysql.com/doc/refman/8.0/en/delete.html
- MySQL 8.0 Reference Manual: ROW_COUNT() — https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_row-count
- MySQL 8.0 Reference Manual: Multi-Table DELETE — https://dev.mysql.com/doc/refman/8.0/en/delete.html (multi-table syntax section)
- Python mysql.connector documentation — https://dev.mysql.com/doc/connector-python/en/

## Issues Found
1. **ROW_COUNT() called in a separate MySQL session (Bash script)**: The original Bash script ran the DELETE in one `mysql` invocation and then called `SELECT ROW_COUNT()` in a second, separate `mysql` invocation. Since `ROW_COUNT()` returns the affected row count of the previous statement *within the same session*, this would not return the row count from the DELETE — it would return -1 or 0 because no prior statement existed in that new session. **Fix**: Combined the DELETE and `SELECT ROW_COUNT()` into a single `mysql -sN -e "..."` invocation so both run in the same session, and captured the output directly into the `AFFECTED` variable.

## Review Notes
- The multi-table DELETE workaround uses `LIMIT 1000` on the orders subquery, which limits the number of *orders* selected, not the number of *order_items* deleted. A single cancelled order could have many order items, so the actual number of rows deleted from `order_items` may exceed 1000. This is not incorrect but is a behavioral difference worth noting for readers who need precise batch size control on the target table.
- The batch size recommendations in the table are reasonable general guidance but are not sourced from official MySQL documentation. Actual optimal batch sizes depend on row size, index count, hardware, and workload — readers should benchmark for their specific environment.
- The Python example correctly uses `cursor.rowcount` which is the standard DB-API 2.0 way to get affected rows after a DML statement.
