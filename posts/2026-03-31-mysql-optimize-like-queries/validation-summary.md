# Validation Summary: How to Optimize LIKE Queries in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (B-Tree indexes, FULLTEXT indexes, LIKE operator)
- SQL (DDL: CREATE INDEX, ALTER TABLE; DML: SELECT, EXPLAIN)
- MySQL Generated Columns (STORED)

## Sources Consulted
- MySQL 8.0 Reference Manual — LIKE operator and index usage: https://dev.mysql.com/doc/refman/8.0/en/index-btree-hash.html
- MySQL 8.0 Reference Manual — FULLTEXT indexes and Boolean Mode: https://dev.mysql.com/doc/refman/8.0/en/fulltext-boolean.html
- MySQL 8.0 Reference Manual — CREATE INDEX (prefix indexes): https://dev.mysql.com/doc/refman/8.0/en/create-index.html
- MySQL 8.0 Reference Manual — Generated Columns: https://dev.mysql.com/doc/refman/8.0/en/create-table-generated-columns.html
- MySQL 8.0 Reference Manual — String Functions (REVERSE, LOWER, SUBSTRING_INDEX): https://dev.mysql.com/doc/refman/8.0/en/string-functions.html

## Issues Found
No technical issues found.

## Review Notes
- The EXPLAIN output is presented in a simplified format rather than MySQL's actual tabular output. This is acceptable for readability in a blog context.
- Generated columns with STORED keyword require MySQL 5.7+. The post does not specify a minimum version, but all techniques shown are compatible with MySQL 5.7 and 8.0+.
- FULLTEXT indexes on InnoDB tables require MySQL 5.6+. The post correctly notes FULLTEXT is for word-level searches but does not mention the minimum word length (`ft_min_word_len` for MyISAM, `innodb_ft_min_token_size` for InnoDB, default 3-4 characters) which can affect search results for very short terms.
- The reverse index trick for suffix searches is a well-known and correct technique. The use of `REVERSE()` on the LIKE pattern correctly repositions the `%` wildcard to the trailing position.
