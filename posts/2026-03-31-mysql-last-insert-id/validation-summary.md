# Validation Summary: How to Use LAST_INSERT_ID() in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (LAST_INSERT_ID() function)
- SQL (AUTO_INCREMENT, INSERT, stored procedures)

## Sources Consulted
- MySQL 8.0 Reference Manual: LAST_INSERT_ID() — https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_last-insert-id
- MySQL 8.0 Reference Manual: AUTO_INCREMENT Handling in InnoDB — https://dev.mysql.com/doc/refman/8.0/en/innodb-auto-increment-handling.html
- MySQL 8.0 Reference Manual: ROW_COUNT() — https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_row-count

## Issues Found
1. **Key behavior table: "INSERT that fails" row** — The cell said "0 (unchanged from the previous successful insert)" which is contradictory. The value is not reset to 0; it is simply unchanged from whatever value it held before. Changed to "Unchanged from the previous value" to match the post's own pitfall example which correctly shows the value staying at 5.

2. **Key behavior table: "No AUTO_INCREMENT column" row** — The cell said "0" but LAST_INSERT_ID() is unchanged when inserting into a table without an AUTO_INCREMENT column. It retains its prior value, which may or may not be 0. Changed to "Unchanged from the previous value".

3. **Pitfall section heading** — The heading "The function is reset by a failed INSERT" stated the opposite of what the section content demonstrates. The code example correctly shows LAST_INSERT_ID() is NOT reset by a failed INSERT (it remains at 5). Changed heading to "The function is NOT reset by a failed INSERT".

## Review Notes
- The `LAST_INSERT_ID() + ROW_COUNT() - 1` formula for computing the last ID in a multi-row batch is correct for simple multi-row INSERT ... VALUES statements. However, with `innodb_autoinc_lock_mode=2` (the default in MySQL 8.0) and "bulk inserts" like INSERT ... SELECT, auto-increment values may not be consecutive across statements, making this formula unreliable in those specific scenarios. The post's example uses a simple VALUES insert which is safe, but a caveat could be added in the future.
- The sequence counter pattern using `UPDATE ... SET seq_val = LAST_INSERT_ID(seq_val + 1)` is taken directly from the MySQL documentation and is correct.
- All SQL syntax is valid and all code examples would work as described.
- The mermaid diagrams are syntactically correct and accurately illustrate the concepts.
