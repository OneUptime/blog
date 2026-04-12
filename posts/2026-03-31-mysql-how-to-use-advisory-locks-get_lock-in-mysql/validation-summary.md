# Validation Summary: How to Use Advisory Locks (GET_LOCK) in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.7+ and 8.0+)
- MySQL advisory/user-level locking functions: GET_LOCK, RELEASE_LOCK, IS_FREE_LOCK, IS_USED_LOCK, RELEASE_ALL_LOCKS
- Python with mysql-connector-python
- MySQL stored procedures
- MySQL performance_schema.metadata_locks

## Sources Consulted
- [MySQL 8.0 Reference Manual: Locking Functions](https://dev.mysql.com/doc/refman/8.0/en/locking-functions.html)
- [MySQL 8.4 Reference Manual: Locking Functions](https://dev.mysql.com/doc/refman/8.4/en/locking-functions.html)
- [MySQL WL#1159: Allow multiple locks in GET_LOCK()](https://dev.mysql.com/worklog/task/?id=1159)
- [MySQL 8.0 Reference Manual: The metadata_locks Table](https://dev.mysql.com/doc/refman/8.0/en/performance-schema-metadata-locks-table.html)

## Issues Found
- **Lock name case sensitivity was incorrect.** The post stated "Lock names are case-sensitive" with an example claiming `GET_LOCK('MyLock', 5)` and `GET_LOCK('mylock', 5)` are different locks. Per MySQL WL#1159, the implementation converts lock names to lowercase before using them as MDL keys, making comparisons **case-insensitive**. Fixed the claim and updated the example explanation accordingly.

## Review Notes
- All SQL syntax (basic usage, stored procedure, performance_schema query) is correct.
- The GET_LOCK, RELEASE_LOCK, IS_FREE_LOCK, IS_USED_LOCK, and RELEASE_ALL_LOCKS return value descriptions are accurate per the MySQL 8.0 reference manual.
- The Python code using mysql-connector-python is functional and follows correct usage patterns, including proper use of try/finally for lock release.
- The stored procedure example correctly uses SET with GET_LOCK for assignment and SIGNAL for error handling.
- The performance_schema.metadata_locks query uses correct column names (OBJECT_NAME, OWNER_THREAD_ID) and the correct OBJECT_TYPE value ('USER LEVEL LOCK').
- The explanation that advisory locks are per-session (not per-transaction) and survive ROLLBACK is accurate.
- The note about multiple named locks being supported since MySQL 5.7.5 is correct (introduced by WL#1159).
- The note about automatic lock release on connection loss is correct.
