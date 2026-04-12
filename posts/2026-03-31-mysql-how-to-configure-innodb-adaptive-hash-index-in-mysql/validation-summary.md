# Validation Summary: How to Configure InnoDB Adaptive Hash Index in MySQL

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MySQL 5.7 and 8.0
- InnoDB Storage Engine
- InnoDB Adaptive Hash Index (AHI)
- INFORMATION_SCHEMA.INNODB_METRICS
- SHOW ENGINE INNODB STATUS

## Sources Consulted
- MySQL 8.0 Adaptive Hash Index Documentation: https://dev.mysql.com/doc/refman/8.0/en/innodb-adaptive-hash.html
- MySQL 5.7 Adaptive Hash Index Documentation: https://dev.mysql.com/doc/refman/5.7/en/innodb-adaptive-hash.html
- MySQL 8.0 INNODB_METRICS Table Documentation: https://dev.mysql.com/doc/refman/8.0/en/innodb-information-schema-metrics-table.html
- MySQL 8.0 InnoDB System Variables: https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html
- MySQL btr0sea.cc source reference: https://dev.mysql.com/doc/dev/mysql-server/9.0.1/btr0sea_8cc.html

## Issues Found

### Issue 1: Incorrect status variable query for monitoring AHI
**What was wrong:** The post queried `performance_schema.global_status` for four status variable names (`Innodb_adaptive_hash_searches`, `Innodb_adaptive_hash_searches_btree`, `Innodb_adaptive_hash_hash_searches`, `Innodb_adaptive_hash_non_hash_searches`). None of these exist as server status variables in MySQL 5.7 or 8.0. Two of the names (`Innodb_adaptive_hash_hash_searches`, `Innodb_adaptive_hash_searches_btree`) are entirely fictitious. The other two exist only in MariaDB 10.5+, not MySQL.

**What was changed:** Replaced the query with the correct approach: querying `INFORMATION_SCHEMA.INNODB_METRICS WHERE SUBSYSTEM = 'adaptive_hash_index'`, which exposes the real counters `adaptive_hash_searches` and `adaptive_hash_searches_btree`. Updated the explanatory text to name the two key counters and what they measure.

**Why:** In MySQL, AHI metrics are exposed through the INNODB_METRICS table, not through server status variables. Using the original query would return no results.

### Issue 2: Inconsistent source file reference
**What was wrong:** Line 130 referenced `btr0sea.ic` as the file to look for in semaphore waits, while line 99 correctly referenced `btr0sea.c`. The MySQL documentation consistently references `btr0sea.c` in its guidance about AHI latch contention.

**What was changed:** Changed `btr0sea.ic` to `btr0sea.c` to match the official MySQL documentation and the earlier reference in the same post.

**Why:** Consistency with official MySQL docs and internal consistency within the post.

## Review Notes
- The `innodb_adaptive_hash_index_parts` default of 8 and valid range (1-512) are correct for MySQL 5.7+/8.0.
- The actual source file on disk is `btr0sea.cc` (C++ extension) since MySQL 5.6+, but the MySQL documentation and SHOW ENGINE INNODB STATUS output reference it as `btr0sea.c`. The post follows the documentation convention, which is appropriate.
- The `innodb_adaptive_hash_index` variable is correctly described as dynamic (can be SET GLOBAL at runtime), while `innodb_adaptive_hash_index_parts` is correctly described as read-only (requires restart).
- Note that in MySQL 8.4+, the adaptive hash index is deprecated. If the post targets future MySQL versions, a deprecation note may be warranted.
