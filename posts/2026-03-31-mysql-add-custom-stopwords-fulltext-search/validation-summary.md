# Validation Summary: How to Add Custom Stopwords for Full-Text Search in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB storage engine)
- InnoDB Full-Text Search
- MySQL server variables (`innodb_ft_server_stopword_table`, `innodb_ft_user_stopword_table`)

## Sources Consulted
- MySQL 8.0 Reference Manual: Full-Text Stopwords (https://dev.mysql.com/doc/refman/8.0/en/fulltext-stopwords.html)
- MySQL 8.0 Reference Manual: InnoDB Full-Text Index (https://dev.mysql.com/doc/refman/8.0/en/innodb-fulltext-index.html)
- MySQL 8.0 Reference Manual: Boolean Full-Text Searches (https://dev.mysql.com/doc/refman/8.0/en/fulltext-boolean.html)
- MySQL 8.0 Reference Manual: OPTIMIZE TABLE Statement (https://dev.mysql.com/doc/refman/8.0/en/optimize-table.html)
- MySQL 8.0 Reference Manual: innodb_optimize_fulltext_only (https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_optimize_fulltext_only)

## Issues Found

1. **Incorrect claim that OPTIMIZE TABLE avoids locking**: The post stated "prefer `OPTIMIZE TABLE` to avoid locking" compared to DROP INDEX + ADD FULLTEXT INDEX. This is incorrect — MySQL documentation states that online DDL is NOT supported for InnoDB tables containing FULLTEXT indexes, meaning OPTIMIZE TABLE uses the table copy method, which is not lock-free. Removed the misleading locking claim and reworded to present OPTIMIZE TABLE as an alternative approach.

2. **Missing `innodb_optimize_fulltext_only=ON` for OPTIMIZE TABLE**: The post showed a bare `OPTIMIZE TABLE docs;` command to rebuild full-text indexes. The MySQL documentation requires setting `innodb_optimize_fulltext_only=ON` before running OPTIMIZE TABLE for it to target the full-text index specifically. Added the required SET GLOBAL statements before and after OPTIMIZE TABLE.

3. **VARCHAR(30) presented as a strict requirement**: The post stated the stopword table "must have a single `VARCHAR(30)` column named `value`" and repeated `VARCHAR(30)` in the summary. The official MySQL documentation requires a single `VARCHAR` column named `value` but does not mandate a specific length — `VARCHAR(30)` is used in the docs' example but is not a hard requirement. Changed to `VARCHAR` without a specific length in the descriptive text (the CREATE TABLE example still uses `VARCHAR(30)` which is fine as an example).

## Review Notes
- The `db_name/table_name` slash format for the stopword variable is correct and matches official documentation (this is a MySQL-specific convention that differs from the usual dot notation).
- The session-level `innodb_ft_user_stopword_table` variable is correctly documented and the usage is accurate.
- The my.cnf configuration snippet omits quotes around the value. This should work per MySQL's option file rules, but quoting the value would be safer practice. Not changed since it is technically valid.
- The BOOLEAN MODE stopword test comment ("Should return no results if 'function' is a stopword") is correct — stopwords are not indexed, so queries for them return no matches even in BOOLEAN MODE. However, the truncation operator (`function*`) can bypass stopword filtering, which is not mentioned. This is an edge case omission, not an error.
