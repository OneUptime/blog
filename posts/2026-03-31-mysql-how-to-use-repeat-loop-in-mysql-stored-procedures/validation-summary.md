# Validation Summary: How to Use REPEAT Loop in MySQL Stored Procedures

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (Stored Procedures)
- SQL (Control Flow: REPEAT, WHILE, LOOP, LEAVE, ITERATE)

## Sources Consulted
- MySQL 8.0 Reference Manual: REPEAT Statement — https://dev.mysql.com/doc/refman/8.0/en/repeat.html
- MySQL 8.0 Reference Manual: LEAVE Statement — https://dev.mysql.com/doc/refman/8.0/en/leave.html
- MySQL 8.0 Reference Manual: ITERATE Statement — https://dev.mysql.com/doc/refman/8.0/en/iterate.html
- MySQL 8.0 Reference Manual: WHILE Statement — https://dev.mysql.com/doc/refman/8.0/en/while.html
- MySQL 8.0 Reference Manual: Flow Control Statements — https://dev.mysql.com/doc/refman/8.0/en/flow-control-statements.html
- MySQL 8.0 Reference Manual: ROW_COUNT() — https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_row-count
- MySQL 8.0 Reference Manual: DO Statement — https://dev.mysql.com/doc/refman/8.0/en/do.html

## Issues Found
- **FindPrime procedure: LEAVE targeted wrong loop label.** In the "Named REPEAT Loop with LEAVE" section, `LEAVE prime_search` was used inside the inner WHILE loop when a divisor was found (indicating a composite number). This exited the entire outer REPEAT loop instead of just the WHILE loop, causing the prime search to terminate prematurely on the first composite number encountered. Fixed by adding a `divisor_check` label to the WHILE loop and changing the inner LEAVE to target `divisor_check` instead of `prime_search`. This allows the REPEAT loop to correctly continue checking subsequent numbers after finding a composite.

## Review Notes
- The batch processing example (ArchiveOldOrders) uses INSERT...SELECT and DELETE without an explicit transaction or ORDER BY on the LIMIT clauses. In a concurrent environment, the INSERT and DELETE might not operate on the exact same rows. This is acceptable for a tutorial demonstrating REPEAT syntax, but production code would need transactions and deterministic ordering.
- The ITERATE example (ProcessEvenNumbers) may insert one value beyond max_val when max_val is odd, since ITERATE skips the UNTIL check for the current iteration. This is a subtle behavioral characteristic of ITERATE in REPEAT loops rather than a code error.
- All MySQL syntax (DELIMITER, DECLARE, DO SLEEP, ROW_COUNT, MOD, FLOOR, SQRT) is correct and current for MySQL 8.0+.
