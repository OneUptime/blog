# Validation Summary: How to Prevent Recursive Triggers in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0+)
- MySQL Triggers (BEFORE/AFTER)
- MySQL Stored Program Restrictions (ERROR 1442)

## Sources Consulted
- MySQL 8.0 Reference Manual: Stored Program Restrictions — https://dev.mysql.com/doc/refman/8.0/en/stored-program-restrictions.html
- MySQL 8.0 Reference Manual: Trigger Syntax and Examples — https://dev.mysql.com/doc/refman/8.0/en/trigger-syntax.html
- MySQL 8.0 Error Reference (ERROR 1442, ER_CANT_UPDATE_USED_TABLE_IN_SF_OR_TRG) — https://dev.mysql.com/doc/mysql-errors/8.0/en/server-error-reference.html
- MySQL 8.0 Reference Manual: InnoDB System Variables — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html
- MySQL Bug #25489: Allow recursive triggers — https://bugs.mysql.com/bug.php?id=25489

## Issues Found

1. **Fabricated system variable `innodb_recursive_triggers`**: The post claimed MySQL has a system variable called `innodb_recursive_triggers` that controls trigger recursion. This variable does not exist in any version of MySQL. Removed all references to it, including from the Tags and Description metadata.

2. **False claim about `@@innodb_lock_wait_timeout`**: The post stated that `@@innodb_lock_wait_timeout` indirectly controls trigger recursion. This variable controls how long InnoDB transactions wait for row locks (default 50 seconds) and has no relation to trigger recursion. Removed this claim entirely.

3. **Incorrect direct recursion behavior**: The post claimed that when an AFTER UPDATE trigger issues an UPDATE on the same table, MySQL "silently suppresses" the nested trigger and the inner UPDATE "does run" without re-firing. This is wrong. MySQL raises ERROR 1442 and blocks the entire operation. The inner UPDATE does NOT run. Corrected the example to show the actual error and replaced the workaround with the correct approach: using a BEFORE trigger with `SET NEW.column = value`.

4. **Incorrect error for indirect recursion**: The post claimed indirect recursion produces `ERROR 1436 (HY000): Thread stack overrun`. In reality, MySQL raises ERROR 1442 for indirect recursion as well, because the original table is still "in use" by the invoking statement. Corrected the error message.

5. **Invalid prevention strategies**: The original strategies (conditional value-change checks and session variable flags) do not work in MySQL because ERROR 1442 is raised at the storage engine level before any trigger body logic executes. Replaced with strategies that actually work: (1) BEFORE triggers with SET NEW for same-table modifications, and (2) breaking circular trigger chains by handling one direction in application code.

6. **Incorrect introductory claims**: The intro stated recursive triggers cause a "max recursion depth exceeded" error or "silently does nothing." Neither is accurate for MySQL — ERROR 1442 is raised immediately. Corrected the introduction.

## Review Notes
- The post's topic (preventing recursive triggers) is valid and useful, but the original content appeared to conflate MySQL's behavior with that of other databases (e.g., SQL Server or PostgreSQL) where recursive triggers are possible and controlled by configuration settings.
- MySQL has a longstanding feature request (Bug #25489) to allow recursive triggers, but as of MySQL 8.0 this is not supported.
- The `SET NEW.column` approach in BEFORE triggers is the officially recommended pattern for modifying the current row without issuing a separate DML statement.
