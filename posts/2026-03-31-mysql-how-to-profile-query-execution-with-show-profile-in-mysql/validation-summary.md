# Validation Summary: How to Profile Query Execution with SHOW PROFILE in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (SHOW PROFILE / SHOW PROFILES statements)
- MySQL Performance Schema (mentioned as replacement)

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW PROFILE Statement — https://dev.mysql.com/doc/refman/8.0/en/show-profile.html
- MySQL 5.6 Release Notes (deprecation of profiling) — https://dev.mysql.com/doc/relnotes/mysql/5.6/en/news-5-6-7.html

## Issues Found

1. **Incorrect deprecation version**: The post stated `SHOW PROFILE` was deprecated as of MySQL 5.7.2. It was actually deprecated in MySQL 5.6.7. Fixed to "5.6.7".

2. **SWAPS profile type mislabeled**: The comment for `SHOW PROFILE SWAPS` said "Context switches", but SWAPS shows swap counts. Context switches are a separate profile type (`SHOW PROFILE CONTEXT SWITCHES`). Fixed the comment to "Swap counts" and added the missing `CONTEXT SWITCHES` type.

3. **MEMORY comment inaccuracy**: The post said MEMORY was "not implemented in InnoDB". The MySQL documentation states it is "not currently implemented" in MySQL generally — this is not InnoDB-specific. Fixed to "not currently implemented".

4. **Missing profile types**: The available profile types list omitted `PAGE FAULTS` and `CONTEXT SWITCHES`, both of which are valid options documented in the MySQL manual. Added both.

## Review Notes
- The `SHOW PROFILE` feature remains functional in MySQL 8.x despite its deprecated status, so the tutorial is still practically useful. However, users should be aware that it may be removed in a future MySQL release.
- The "Sending data" explanation is correct and valuable — this status is commonly misunderstood as only network I/O, when it actually includes the storage engine reading and processing rows.
- The example output tables are illustrative and representative of real SHOW PROFILE output, though exact status names and their casing can vary slightly between MySQL versions.
