# Validation Summary: How to Use LOOP and REPEAT in MySQL Stored Procedures

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL stored procedures
- SQL (LOOP, REPEAT, WHILE constructs)
- LEAVE and ITERATE flow control statements

## Sources Consulted
- MySQL 8.0 Reference Manual — LOOP Statement: https://dev.mysql.com/doc/refman/8.0/en/loop.html
- MySQL 8.0 Reference Manual — REPEAT Statement: https://dev.mysql.com/doc/refman/8.0/en/repeat.html
- MySQL 8.0 Reference Manual — WHILE Statement: https://dev.mysql.com/doc/refman/8.0/en/while.html
- MySQL 8.0 Reference Manual — LEAVE Statement: https://dev.mysql.com/doc/refman/8.0/en/leave.html
- MySQL 8.0 Reference Manual — ITERATE Statement: https://dev.mysql.com/doc/refman/8.0/en/iterate.html
- MySQL 8.0 Reference Manual — SLEEP() Function: https://dev.mysql.com/doc/refman/8.0/en/miscellaneous-functions.html#function_sleep

## Issues Found
1. **ITERATE description inaccurate for LOOP construct (line 124)**: The text said ITERATE "jumps back to the loop condition check." A LOOP has no built-in condition — that is its defining characteristic. ITERATE restarts the loop from the beginning. Changed to "jumps back to the beginning of the loop," which is accurate for all loop types and consistent with the MySQL documentation ("ITERATE means 'start the loop again'").

## Review Notes
- The Fibonacci procedure was traced through all 10 iterations; the output table is correct.
- The BuildCSV REPEAT example was traced; the output is correct.
- The LogEvenNumbers ITERATE example was traced; the output is correct.
- The WaitForJobCompletion example references a `batch_jobs` table not created in the setup section, but this is acceptable as it is a conceptual example illustrating the REPEAT pattern.
- The REPEAT syntax correctly omits the semicolon before the UNTIL keyword, matching MySQL's requirement.
- The comparison table accurately describes the differences between LOOP, REPEAT, and WHILE.
- All DELIMITER usage is correct throughout the post.
