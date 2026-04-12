# Validation Summary: How to Create a MySQL Function with RETURNS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (CREATE FUNCTION, RETURNS, DETERMINISTIC characteristics)
- SQL (stored routines, scalar functions, binary logging)

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE FUNCTION Statement for Stored Functions — https://dev.mysql.com/doc/refman/8.0/en/create-procedure.html
- MySQL 8.0 Reference Manual: Stored Routine Binary Logging — https://dev.mysql.com/doc/refman/8.0/en/stored-programs-logging.html
- MySQL 8.0 Reference Manual: Restrictions on Stored Programs — https://dev.mysql.com/doc/refman/8.0/en/stored-program-restrictions.html
- MySQL 8.0 Reference Manual: SHOW FUNCTION STATUS — https://dev.mysql.com/doc/refman/8.0/en/show-function-status.html

## Issues Found

1. **`GetEmployeeSalary` incorrectly marked `DETERMINISTIC`**: This function reads from a table (`SELECT salary FROM employees`). Since the underlying data can change, the same input (employee_id) can return different results over time. Changed `DETERMINISTIC` to `NOT DETERMINISTIC`. The existing `READS SQL DATA` clause already satisfies binary logging requirements independently.

2. **`YearsEmployed` incorrectly marked `DETERMINISTIC`**: This function calls `CURDATE()`, which returns a different value each day. The same input (hire_date) will produce different results on different days, making it non-deterministic. Changed `DETERMINISTIC` to `NOT DETERMINISTIC`. The existing `NO SQL` clause still satisfies binary logging requirements.

3. **Misleading phrase "non-deterministic DDL statements"**: The original text stated functions "cannot contain non-deterministic DDL statements." The qualifier "non-deterministic" is not meaningful for DDL in MySQL terminology. Stored functions cannot execute DDL statements at all because DDL causes implicit commits, which are prohibited in stored functions. Changed to "execute DDL or other statements that cause implicit commits."

4. **Misleading `DETERMINISTIC` key clause description**: The original wording "`DETERMINISTIC` - required when binary logging is enabled" incorrectly implied that DETERMINISTIC specifically is required for binary logging. In reality, the binary logging requirement is satisfied by any one of `DETERMINISTIC`, `NO SQL`, or `READS SQL DATA`. Reworded to clarify the distinction between the semantic meaning of DETERMINISTIC and the binary logging requirement.

## Review Notes
- The `NO SQL` characteristic on `YearsEmployed` (which calls `CURDATE()`) and `GetTimestamp` (which calls `NOW()`) is debatable — `CONTAINS SQL` would be more semantically accurate since these built-in functions are SQL expressions. However, MySQL does not enforce these characteristics, and `NO SQL` is a widely used convention in this context. Left as-is since it's not technically wrong from MySQL's enforcement perspective.
- The output tables were verified against the sample data and all computed values are correct, including the DECIMAL precision widening for the multiplication in `salary_with_raise` (DECIMAL(10,2) * DECIMAL(3,2) = DECIMAL(14,4), producing 4 decimal places).
- The `SHOW CREATE FUNCTION SalaryGrade\G` uses the mysql client `\G` formatting directive, which is appropriate for a MySQL tutorial context.
