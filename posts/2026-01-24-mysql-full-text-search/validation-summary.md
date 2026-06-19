# Validation Summary: How to Handle Full-Text Search in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL full-text search
- InnoDB FULLTEXT indexes
- MySQL MATCH() AGAINST() search modes
- MySQL full-text stopwords and tuning variables
- MySQL Connector/Python
- Python

## Sources Consulted
- MySQL 8.4 Reference Manual: Full-Text Search Functions - https://dev.mysql.com/doc/refman/8.4/en/fulltext-search.html
- MySQL 8.4 Reference Manual: Boolean Full-Text Searches - https://dev.mysql.com/doc/refman/8.4/en/fulltext-boolean.html
- MySQL 8.4 Reference Manual: InnoDB Startup Options and System Variables - https://dev.mysql.com/doc/refman/8.4/en/innodb-parameters.html
- MySQL 8.4 Reference Manual: Full-Text Stopwords - https://dev.mysql.com/doc/refman/8.4/en/fulltext-stopwords.html
- MySQL 8.4 Reference Manual: Fine-Tuning MySQL Full-Text Search - https://dev.mysql.com/doc/refman/8.4/en/fulltext-fine-tuning.html
- MySQL Connector/Python Developer Guide: MySQLCursor Class - https://dev.mysql.com/doc/connector-python/en/connector-python-api-mysqlcursor.html

## Issues Found
- The post showed `SET GLOBAL innodb_ft_min_token_size = 2` and `SET GLOBAL innodb_ft_max_token_size = 84`. These variables are documented as non-dynamic InnoDB system variables, so changing them requires configuration in `my.cnf` and a MySQL restart. I replaced the runtime `SET GLOBAL` examples with comments directing readers to configure them in `my.cnf` and restart.
- The quick reference said to rebuild an index after a full-text configuration change with `OPTIMIZE TABLE articles`. MySQL's fine-tuning documentation says InnoDB FULLTEXT indexes should be rebuilt after relevant configuration changes by dropping and re-adding the index. I changed the quick-reference example to use `ALTER TABLE ... DROP INDEX` followed by `ALTER TABLE ... ADD FULLTEXT INDEX`.

## Review Notes
- The post's core SQL syntax for creating FULLTEXT indexes and using natural language, boolean, and query expansion searches matches MySQL documentation.
- Boolean full-text search examples are valid for InnoDB because they use leading `+` and `-` operators, which InnoDB supports.
- The advanced category examples assume an `articles.category_id` column and a `categories` table that are not defined in the sample schema. This is acceptable as an advanced pattern, but a future revision could make the assumption explicit.
