# Validation Summary: How to Optimize Full-Text Search Queries in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB storage engine)
- MySQL FULLTEXT indexes
- MySQL MATCH() ... AGAINST() syntax
- MySQL Boolean Mode, Natural Language Mode, and Query Expansion search modes

## Sources Consulted
- MySQL 8.0 Reference Manual: Full-Text Search Functions — https://dev.mysql.com/doc/refman/8.0/en/fulltext-search.html
- MySQL 8.0 Reference Manual: Boolean Full-Text Searches — https://dev.mysql.com/doc/refman/8.0/en/fulltext-boolean.html
- MySQL 8.0 Reference Manual: InnoDB FULLTEXT Index — https://dev.mysql.com/doc/refman/8.0/en/innodb-fulltext-index.html
- MySQL 8.0 Reference Manual: innodb_ft_min_token_size — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_ft_min_token_size
- MySQL 8.0 Reference Manual: REPAIR TABLE — https://dev.mysql.com/doc/refman/8.0/en/repair-table.html

## Issues Found
1. **REPAIR TABLE used for InnoDB FULLTEXT index rebuild**: The post recommended `REPAIR TABLE articles QUICK;` to rebuild FULLTEXT indexes after changing `innodb_ft_min_token_size`. This is incorrect for InnoDB tables. `REPAIR TABLE` is primarily a MyISAM operation. The MySQL documentation explicitly states that for InnoDB tables, after changing `innodb_ft_min_token_size`, you must drop and re-create the FULLTEXT index. Fixed by replacing the `REPAIR TABLE` command with `ALTER TABLE ... DROP INDEX` followed by `ALTER TABLE ... ADD FULLTEXT INDEX`.

## Review Notes
- The post correctly uses the InnoDB-specific variable `innodb_ft_min_token_size` (default 3) rather than the MyISAM variable `ft_min_word_len` (default 4). This is an important distinction that the post handles well.
- The note about `MATCH()` needing the same column list in both SELECT and WHERE is accurate and a useful optimization tip — MySQL evaluates the expression only once when the arguments match.
- The query expansion caveat about short queries producing irrelevant results is a good practical warning.
- An alternative to dropping and recreating the index for rebuilding is to set `innodb_optimize_fulltext_only=ON` and run `OPTIMIZE TABLE`, but the drop/recreate approach shown is simpler and more straightforward.
