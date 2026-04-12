# Validation Summary: How to Create a FULLTEXT Index in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB and MyISAM storage engines)
- FULLTEXT indexes
- Full-text search (natural language, boolean, and query expansion modes)

## Sources Consulted
- MySQL 8.0 Reference Manual: Full-Text Search Functions — https://dev.mysql.com/doc/refman/8.0/en/fulltext-search.html
- MySQL 8.0 Reference Manual: CREATE INDEX Statement — https://dev.mysql.com/doc/refman/8.0/en/create-index.html
- MySQL 8.0 Reference Manual: ALTER TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual: Full-Text Stopwords — https://dev.mysql.com/doc/refman/8.0/en/fulltext-stopwords.html
- MySQL 8.0 Reference Manual: Fine-Tuning MySQL Full-Text Search — https://dev.mysql.com/doc/refman/8.0/en/fulltext-fine-tuning.html

## Issues Found
1. **Incorrect ALTER TABLE syntax**: The `ALTER TABLE` example used `ALTER TABLE articles ADD FULLTEXT INDEX ft_title ON articles (title)`, which includes an erroneous `ON articles` clause. The `ON table_name` syntax belongs to `CREATE INDEX`, not `ALTER TABLE`. Fixed to `ALTER TABLE articles ADD FULLTEXT INDEX ft_title (title)`.

## Review Notes
- The stopwords section mentions `SET GLOBAL innodb_ft_enable_stopword = 0` but does not note that existing FULLTEXT indexes need to be rebuilt (e.g., via `OPTIMIZE TABLE` or drop/recreate) for the change to take effect on already-indexed data. This is not strictly wrong since the post only says "to disable stopwords," but readers may benefit from that clarification in a future update.
- The minimum word length section correctly advises dropping and recreating the index after changing `innodb_ft_min_token_size`. An alternative approach is `OPTIMIZE TABLE articles`, which also rebuilds the FULLTEXT index and may be simpler for tables with multiple FULLTEXT indexes.
