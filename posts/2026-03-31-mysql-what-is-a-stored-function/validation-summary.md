# Validation Summary: What Is a Stored Function in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (stored functions / stored routines)
- SQL (DDL, DML, DELIMITER usage)

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE FUNCTION Statement — https://dev.mysql.com/doc/refman/8.0/en/create-function.html
- MySQL 8.0 Reference Manual: CREATE PROCEDURE and CREATE FUNCTION — https://dev.mysql.com/doc/refman/8.0/en/create-procedure.html
- MySQL 8.0 Reference Manual: Stored Program Restrictions — https://dev.mysql.com/doc/refman/8.0/en/stored-program-restrictions.html
- MySQL 8.0 Reference Manual: Binary Logging of Stored Programs — https://dev.mysql.com/doc/refman/8.0/en/stored-programs-logging.html
- MySQL 8.0 Reference Manual: Adding a Loadable Function — https://dev.mysql.com/doc/refman/8.0/en/adding-loadable-function.html

## Issues Found

1. **Incorrect UDF terminology in Overview**: The post described stored functions as "also called a user-defined function or UDF." In MySQL, UDFs (User-Defined Functions) specifically refer to loadable functions compiled from external code (C/C++), not SQL-based stored functions. Fixed by removing the UDF alias and adding a clarifying note distinguishing the two.

2. **Oversimplified DETERMINISTIC and replication claim**: The post stated DETERMINISTIC is "Required for binary log replication of functions." This is inaccurate. With statement-based binary logging, functions must be declared DETERMINISTIC *or* NO SQL/READS SQL DATA to be created and executed; with row-based logging, this restriction does not apply. The `log_bin_trust_function_creators` variable can also bypass the restriction. Fixed with a more accurate description.

3. **Missing DELIMITER in `get_customer_tier` example**: The second code example contained semicolons inside a BEGIN...END block but did not use DELIMITER, which would cause a syntax error in the mysql command-line client. The first example correctly used DELIMITER but the second did not. Fixed by adding `DELIMITER $$` and `DELIMITER ;` to be consistent and correct.

4. **Inaccurate NO SQL description**: The post described NO SQL as "Does not read or write tables." Per MySQL docs, NO SQL means "the routine contains no SQL statements," which is a stricter definition (e.g., even `SET @x = 1` is a SQL statement). Fixed to match the official definition.

## Review Notes
- The comparison table correctly states that stored functions cannot use transaction control (COMMIT, ROLLBACK, START TRANSACTION), which is confirmed by MySQL docs on stored program restrictions.
- The data access characteristics (NO SQL, CONTAINS SQL, etc.) are advisory only in MySQL — the server does not enforce them. The post does not mention this caveat, but it is not incorrect as written.
- All SQL syntax in code examples is correct and would execute successfully in MySQL 8.0+.
