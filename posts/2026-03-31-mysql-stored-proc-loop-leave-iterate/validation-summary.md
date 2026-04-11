# Validation Summary: How to Use LOOP with LEAVE and ITERATE in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (stored procedures, control flow statements)
- SQL (LOOP, LEAVE, ITERATE, WHILE, REPEAT)
- MySQL Cursors

## Sources Consulted
- MySQL 8.0 Reference Manual: LOOP Statement — https://dev.mysql.com/doc/refman/8.0/en/loop.html
- MySQL 8.0 Reference Manual: LEAVE Statement — https://dev.mysql.com/doc/refman/8.0/en/leave.html
- MySQL 8.0 Reference Manual: ITERATE Statement — https://dev.mysql.com/doc/refman/8.0/en/iterate.html
- MySQL 8.0 Reference Manual: WHILE Statement — https://dev.mysql.com/doc/refman/8.0/en/while.html
- MySQL 8.0 Reference Manual: REPEAT Statement — https://dev.mysql.com/doc/refman/8.0/en/repeat.html
- MySQL 8.0 Reference Manual: Cursors — https://dev.mysql.com/doc/refman/8.0/en/cursors.html
- MySQL 8.0 Reference Manual: ROW_COUNT() — https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_row-count
- MySQL 8.0 Reference Manual: DO Statement — https://dev.mysql.com/doc/refman/8.0/en/do.html

## Issues Found
No technical issues found.

## Review Notes
- In the `process_pending_orders` example, `v_customer_id` is declared and fetched from the cursor but never used in the procedure body. This is not a technical error (the code runs correctly), but in production code it would be cleaner to either use it or omit it from the SELECT/FETCH.
- The batch archival example uses a non-atomic INSERT + DELETE pattern. This is a well-known approach for batch archival and is appropriate for a tutorial, though production implementations might want to wrap each batch in a transaction or use a single `INSERT...SELECT` followed by `DELETE...WHERE id IN (...)` for stronger consistency guarantees.
- The `END LOOP` in the comparison section (line 159) omits the end-label, while the full examples include it. Both are valid MySQL syntax — the end-label is optional per the MySQL reference manual.
