# Validation Summary: How MySQL B-Tree Indexes Work Internally

## Status
validated

## Post Type
Technical explainer / Reference

## Technologies Covered
- MySQL (InnoDB storage engine)
- B+ Tree data structure
- InnoDB clustered and secondary indexes
- InnoDB page structure and fill factor
- MySQL performance_schema for index usage monitoring

## Sources Consulted
- MySQL 8.0 Reference Manual — InnoDB Parameters (`innodb_fill_factor`): https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_fill_factor
- MySQL 8.0 Reference Manual — Sorted Index Builds: https://dev.mysql.com/doc/refman/8.0/en/sorted-index-builds.html
- MySQL 8.0 Reference Manual — InnoDB Physical Structure: https://dev.mysql.com/doc/refman/8.0/en/innodb-physical-structure.html
- MySQL 8.0 Reference Manual — CREATE TABLE Statement (`KEY_BLOCK_SIZE`): https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual — InnoDB Index Types: https://dev.mysql.com/doc/refman/8.0/en/innodb-index-types.html
- MySQL 8.0 Reference Manual — performance_schema.table_io_waits_summary_by_index_usage: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-table-io-waits-summary-by-index-usage-table.html

## Issues Found

### Issue 1: Incorrect `innodb_fill_factor` default value
- **What was wrong:** The comment `-- Default: not set, uses ~93% fill` implied the variable has no default. The actual default is `100`. With this default, InnoDB reserves 1/16 of space in clustered index pages (~93.75% fill), but the variable itself is always set.
- **What was changed:** Updated the comment to `-- Default: 100 (leaves 1/16 free in clustered index pages, ~93% fill)`.

### Issue 2: `KEY_BLOCK_SIZE` incorrectly used to control page fill
- **What was wrong:** The example used `KEY_BLOCK_SIZE=0` in a `CREATE TABLE` statement with the comment "Let InnoDB choose optimal page fill." `KEY_BLOCK_SIZE` actually controls InnoDB table compression page size, not page fill factor. Setting it to 0 specifies the default compressed page size (half of `innodb_page_size`), and has no effect on fill factor.
- **What was changed:** Replaced the incorrect `CREATE TABLE ... KEY_BLOCK_SIZE=0` example with an explanation that the default `innodb_fill_factor` of 100 is already optimal for append-only tables, and showed the correct `SET GLOBAL innodb_fill_factor = 80` syntax for random-insert workloads where a lower fill factor can help.

## Review Notes
- The post correctly identifies that InnoDB uses B+ Trees (not plain B-Trees) and accurately describes the doubly-linked leaf node structure.
- The clustered index, secondary index, and covering index explanations are all accurate.
- The `innodb_fill_factor` variable is a global setting, not per-table. The post now correctly demonstrates it with `SET GLOBAL`. There is no per-table mechanism to control page fill factor.
- The performance_schema query for checking index usage is correct and practical.
- All SQL syntax in the post is valid MySQL.
