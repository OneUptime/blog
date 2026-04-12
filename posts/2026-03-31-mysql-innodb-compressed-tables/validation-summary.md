# Validation Summary: How to Use InnoDB Compressed Tables in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 5.6, 5.7, and 8.0
- InnoDB storage engine
- InnoDB table compression (ROW_FORMAT=COMPRESSED)
- zlib compression algorithm
- INFORMATION_SCHEMA views (INNODB_CMP, INNODB_CMP_PER_INDEX)
- pt-online-schema-change, gh-ost (referenced as tools)

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Table Compression — https://dev.mysql.com/doc/refman/8.0/en/innodb-compression.html
- MySQL 8.0 Reference Manual: Creating Compressed Tables — https://dev.mysql.com/doc/refman/8.0/en/innodb-compression-usage.html
- MySQL 8.0 Reference Manual: innodb_file_format removal — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA INNODB_CMP Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-cmp-table.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA TABLES Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-tables-table.html

## Issues Found

1. **Outdated `innodb_file_format` / Barracuda references**: The post stated compressed tables require the "Barracuda file format (the default in MySQL 5.7+ and 8.0)." In MySQL 8.0, the `innodb_file_format` system variable was removed entirely — the Barracuda/Antelope file format concept no longer applies. Fixed the introductory paragraph to clarify version-specific behavior: Barracuda is required in 5.6 and earlier, default in 5.7, and the concept was removed in 8.0.

2. **Invalid `SHOW VARIABLES LIKE 'innodb_file_format'` in MySQL 8.0**: The prerequisites section included this command, but it returns an empty result in MySQL 8.0 since the variable no longer exists. Removed it from the main code block and added a note that it only needs to be checked on MySQL 5.6 or earlier.

3. **Misleading `data_length AS uncompressed_bytes` alias**: For compressed InnoDB tables, `data_length` in `information_schema.tables` reflects the on-disk (compressed) size, not the uncompressed size. The alias `uncompressed_bytes` was misleading. Changed it to `data_bytes` to avoid confusion.

## Review Notes
- The KEY_BLOCK_SIZE comparison table omits the value 2 (which is listed as valid in the text). This is not technically wrong — it's just an incomplete reference table. The text correctly lists all valid values (1, 2, 4, 8, 16).
- The claim that "smaller values compress more aggressively" is a simplification. Smaller KEY_BLOCK_SIZE means the target page size is smaller, which can lead to more compression failures and page splits, not necessarily higher compression ratios. The general advice about CPU overhead trade-offs is sound.
- The INFORMATION_SCHEMA query for checking compression effectiveness only shows `data_length` (compressed size). To compare compressed vs. uncompressed sizes meaningfully, one could compare the table size before and after enabling compression, or use `INNODB_CMP` statistics. The post could benefit from clarifying this in a future revision.
