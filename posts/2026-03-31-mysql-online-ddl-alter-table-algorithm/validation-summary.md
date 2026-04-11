# Validation Summary: How to Use Online DDL in MySQL (ALTER TABLE ALGORITHM)

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL 8.0 (InnoDB storage engine)
- Online DDL (ALGORITHM and LOCK clauses)
- performance_schema for DDL monitoring

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB and Online DDL — https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl.html
- MySQL 8.0 Reference Manual: Online DDL Operations — https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html
- MySQL 8.0 Reference Manual: ALTER TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual: Monitoring ALTER TABLE Progress — https://dev.mysql.com/doc/refman/8.0/en/monitor-alter-table-performance-schema.html
- MySQL 8.0.12 Release Notes — https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-12.html

## Issues Found
1. **Misleading "Test without executing" comment**: The "Checking Which Algorithm Will Be Used" section contained a SQL comment `-- Test without executing` and implied that specifying `ALGORITHM=INSTANT` could be used as a dry-run probe. This is incorrect — MySQL has no dry-run mode for ALTER TABLE. If the operation supports INSTANT, the statement executes and the schema change is applied. If it does not support INSTANT, MySQL returns an error immediately without making changes. Fixed the explanatory text and SQL comment to accurately describe this behavior and recommend testing on a non-production table first.

## Review Notes
- The post says "INSTANT (MySQL 8.0+)" — the INSTANT algorithm was specifically introduced in MySQL 8.0.12, not the initial 8.0 release. This is a minor imprecision common in blog posts and was left as-is since the 8.0 series designation is broadly correct.
- MySQL 8.0.29 expanded INSTANT to support adding columns at any position, not just at the end. The post correctly describes the original 8.0.12 behavior but does not mention this later enhancement.
- The performance_schema monitoring query is correct but omits that `stage/innodb/alter%` instruments and stage event consumers must be enabled first for the query to return results. This is a common prerequisite that readers may need to configure.
