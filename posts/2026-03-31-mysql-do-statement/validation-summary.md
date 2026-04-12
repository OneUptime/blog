# Validation Summary: How to Use DO Statement in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (DO statement)
- MySQL advisory locking functions (GET_LOCK, RELEASE_LOCK)
- MySQL stored procedures

## Sources Consulted
- MySQL 8.0 Reference Manual - DO Statement: https://dev.mysql.com/doc/refman/8.0/en/do.html
- MySQL 8.0 Reference Manual - IF Statement (stored programs): https://dev.mysql.com/doc/refman/8.0/en/if.html
- MySQL 8.0 Reference Manual - Locking Functions: https://dev.mysql.com/doc/refman/8.0/en/locking-functions.html

## Issues Found

### Issue 1: Advisory Locking Pattern used IF...THEN...END IF outside a stored procedure
- **What was wrong:** The "Practical Example: Advisory Locking Pattern" section used `IF @lock_result = 1 THEN ... END IF` as standalone SQL. The `IF...THEN...END IF` flow control construct is only valid inside stored programs (procedures, functions, triggers, events) and would produce a syntax error if run as plain SQL.
- **What was changed:** Wrapped the example in a `CREATE PROCEDURE` block and added a note clarifying that `IF...THEN...END IF` is only valid inside stored programs.
- **Why:** Readers copying the original example would get a MySQL syntax error.

### Issue 2: Limitations section contained inaccurate or unsupported claims
- **What was wrong:** Three listed limitations were not supported by the official MySQL documentation:
  1. "DO cannot be used with expressions that return more than a scalar value" - not documented as a specific limitation.
  2. "It is not available in all SQL modes" - false; the MySQL docs make no mention of SQL modes affecting DO availability.
  3. "Subqueries that return multiple rows are not valid in DO" - not documented as a specific DO limitation.
- **What was changed:** Replaced with accurate limitations from the official documentation: DO cannot reference table columns directly (e.g., `DO id FROM t1` is invalid), DO only evaluates expressions and does not support full query syntax, and DO is preferred in stored functions/triggers because those contexts disallow result-set-producing statements.
- **Why:** The original claims could mislead readers about actual DO behavior and restrictions.

## Review Notes
- The core explanation of DO (syntax, purpose, performance benefit over SELECT) is accurate and well-presented.
- The SLEEP() and RELEASE_LOCK() examples are correct and match documented use cases.
- The stored procedure example is syntactically correct.
- The performance note ("slightly more efficient than SELECT") aligns with official documentation wording.
