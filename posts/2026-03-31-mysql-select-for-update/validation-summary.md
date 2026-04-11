# Validation Summary: How to Use SELECT ... FOR UPDATE in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0+)
- InnoDB storage engine
- SQL locking reads (SELECT ... FOR UPDATE)
- performance_schema.data_locks

## Sources Consulted
- MySQL 8.0 Reference Manual: Locking Reads (https://dev.mysql.com/doc/refman/8.0/en/innodb-locking-reads.html)
- MySQL 8.0 Reference Manual: InnoDB Locking (https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html)
- MySQL 8.0 Reference Manual: SELECT Statement (https://dev.mysql.com/doc/refman/8.0/en/select.html)
- MySQL 8.0 Reference Manual: The data_locks Table (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-locks-table.html)
- MySQL 8.0 Reference Manual: Server Error Message Reference for ERROR 3572 (https://dev.mysql.com/doc/mysql-errors/8.0/en/server-error-reference.html)

## Issues Found
No technical issues found.

## Review Notes
- The subquery locking note (line 64) is a correct simplification — the `FOR UPDATE` clause applies to the outer query's `FROM` tables. However, in practice InnoDB locks rows as they are scanned, so depending on query optimization (e.g., semi-join conversion), inner table rows may also be locked during execution. This is a valid simplification for a tutorial but readers implementing critical locking logic with subqueries should test actual lock behavior.
- The "no index" locking example correctly warns to avoid this pattern. It could additionally note that InnoDB places next-key locks on every clustered index record during a full table scan, effectively locking the entire table including gaps, but the current description is sufficient for the target audience.
- The `performance_schema.data_locks` table is MySQL 8.0+ only. Users on MySQL 5.7 would need `INFORMATION_SCHEMA.INNODB_LOCKS` instead, but since the post already targets MySQL 8.0 features (SKIP LOCKED, NOWAIT), this is consistent.
