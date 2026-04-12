# Validation Summary: How to Understand InnoDB Row Formats in MySQL

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- MySQL 8.0
- InnoDB storage engine
- InnoDB row formats (REDUNDANT, COMPACT, DYNAMIC, COMPRESSED)
- Percona Toolkit (pt-online-schema-change)

## Sources Consulted
- MySQL 8.0 Reference Manual — InnoDB Row Formats: https://dev.mysql.com/doc/refman/8.0/en/innodb-row-format.html
- MySQL 8.0 Reference Manual — innodb_default_row_format: https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_default_row_format
- MySQL 8.0 Reference Manual — innodb_large_prefix removal: https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_large_prefix
- MySQL 8.0 Reference Manual — InnoDB FULLTEXT Indexes: https://dev.mysql.com/doc/refman/8.0/en/innodb-fulltext-index.html
- MySQL 8.0 Reference Manual — Multi-Valued Indexes: https://dev.mysql.com/doc/refman/8.0/en/create-index.html#create-index-multi-valued

## Issues Found
1. **`innodb_large_prefix` reference is outdated (line 48):** The post stated DYNAMIC "Supports index key prefixes up to 3072 bytes (when `innodb_large_prefix = ON`)". The `innodb_large_prefix` system variable was deprecated in MySQL 5.7.7 and removed entirely in MySQL 8.0. In MySQL 8.0, the 3072-byte index key prefix limit is always enabled for DYNAMIC and COMPRESSED row formats. Fixed to clarify the version-specific behavior.

2. **Incorrect claim about full-text and multi-valued indexes (line 49):** The post stated DYNAMIC "Enables full-text and multi-valued indexes in MySQL 8.0". InnoDB full-text indexes have been supported across all row formats since MySQL 5.6. Multi-valued indexes (for JSON arrays, introduced in MySQL 8.0.17) also work regardless of row format. Removed this incorrect bullet point.

## Review Notes
- The "50-70% compression" claim for COMPRESSED format is on the optimistic end. Actual ratios vary significantly depending on data characteristics, but the qualifier "for text-heavy tables" makes it reasonable.
- The post correctly notes that COMPRESSED cannot be used with general tablespaces in MySQL 8.0.
- The recommendation for `pt-online-schema-change` for large table conversions is sound practical advice.
- All SQL syntax examples are correct and would execute as shown.
