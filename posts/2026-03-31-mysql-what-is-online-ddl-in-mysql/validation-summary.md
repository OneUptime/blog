# Validation Summary: What Is Online DDL in MySQL

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- MySQL 8.0 (InnoDB)
- Online DDL (ALTER TABLE with ALGORITHM and LOCK clauses)
- Performance Schema (for monitoring DDL progress)

## Sources Consulted
- MySQL 8.0 Reference Manual — Online DDL Operations: https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html
- MySQL 8.0 Reference Manual — ALTER TABLE: https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual — Online DDL Performance and Concurrency: https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-performance.html

## Issues Found

1. **Rename column section missing version note**: The post stated RENAME COLUMN uses `ALGORITHM = INSTANT` without noting this was introduced in MySQL 8.0.28. Before 8.0.28, only INPLACE was supported. Added a version note in the section heading and a SQL comment.

2. **Operations table: Drop column listed as INPLACE**: In MySQL 8.0.29+, DROP COLUMN supports `ALGORITHM = INSTANT`. Updated to `INSTANT (8.0.29+)` for consistency with the Add column entry.

3. **Operations table: Rename column missing version note**: Added `(8.0.28+)` to the INSTANT entry for Rename column.

4. **Operations table: Change column type lock listed as EXCLUSIVE**: The COPY algorithm defaults to SHARED lock (reads allowed, DML blocked), not EXCLUSIVE (all queries blocked). The MySQL docs explicitly state: "A table-copying operation always includes at least the concurrency restrictions of LOCK=SHARED." Changed from EXCLUSIVE to SHARED.

5. **Operations table: Add FOREIGN KEY listed as INPLACE/NONE unconditionally**: Adding a foreign key only uses INPLACE with LOCK=NONE when `foreign_key_checks` is disabled. With the default setting (enabled), only the COPY algorithm is supported. Added `(if foreign_key_checks=0)` to clarify the condition.

## Review Notes
- The three-phase description of INPLACE Online DDL (Initialization, Execution, Commit) is accurate and well-explained.
- The INPLACE algorithm description ("Rebuilds index/table in-place without copying") is a common simplification. Some INPLACE operations do rebuild the clustered index within InnoDB; the distinction from COPY is that it avoids a temporary table at the SQL layer. This is acceptable for a blog post.
- The monitoring query against `performance_schema.events_stages_current` is correct.
- The `KILL QUERY` approach for canceling DDL is correct, though readers should be aware that rolling back an in-progress INPLACE DDL can take as long as the original operation.
- The ADD FULLTEXT INDEX entry correctly shows SHARED lock — concurrent DML is not permitted, but concurrent reads (queries) are allowed.
