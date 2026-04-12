# Validation Summary: How to Use ROLLBACK TO SAVEPOINT in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB transactions)
- SQL (ROLLBACK TO SAVEPOINT, SAVEPOINT, BEGIN, COMMIT)
- Python (mysql-connector-python library)

## Sources Consulted
- MySQL 8.0 Reference Manual: SAVEPOINT, ROLLBACK TO SAVEPOINT, and RELEASE SAVEPOINT Statements (https://dev.mysql.com/doc/refman/8.0/en/savepoint.html)
- MySQL 8.0 Reference Manual: START TRANSACTION, COMMIT, and ROLLBACK Statements (https://dev.mysql.com/doc/refman/8.0/en/commit.html)
- MySQL 8.0 Reference Manual: Server Error Message Reference, ER_SP_DOES_NOT_EXIST (https://dev.mysql.com/doc/mysql-errors/8.0/en/server-error-reference.html)
- mysql-connector-python API documentation (https://dev.mysql.com/doc/connector-python/en/)

## Issues Found
No technical issues found.

## Review Notes
- The "Practical Use" SQL example shows a sequential INSERT that may fail followed by a ROLLBACK TO SAVEPOINT. In raw SQL, a failed INSERT would produce an error but not automatically execute the next statement in a batch script. The post correctly clarifies this is an application-level pattern and follows up with a proper Python implementation that uses try/except for error handling.
- The Python example uses f-strings for SAVEPOINT names (`f"SAVEPOINT {sp_name}"`). This is the correct approach since SQL identifiers cannot be parameterized, and the names are derived from integer loop indices so there is no injection risk.
- The post correctly notes that savepoints created after a rolled-back-to savepoint are destroyed, which is an important subtlety that is accurately explained in the "Multiple Savepoints" section.
