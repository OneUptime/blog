# Validation Summary: How to Use MySQL for Full-Text Search Applications

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB engine)
- MySQL Full-Text Search (FULLTEXT indexes, MATCH...AGAINST syntax)
- MySQL Boolean Mode Search
- MySQL Query Expansion (blind query expansion)

## Sources Consulted
- MySQL 8.0 Reference Manual: Full-Text Search Functions — https://dev.mysql.com/doc/refman/8.0/en/fulltext-search.html
- MySQL 8.0 Reference Manual: Boolean Full-Text Searches — https://dev.mysql.com/doc/refman/8.0/en/fulltext-boolean.html
- MySQL 8.0 Reference Manual: Full-Text Stopwords — https://dev.mysql.com/doc/refman/8.0/en/fulltext-stopwords.html
- MySQL 8.0 Reference Manual: InnoDB Full-Text Index — https://dev.mysql.com/doc/refman/8.0/en/innodb-fulltext-index.html
- MySQL 8.0 Reference Manual: innodb_ft_min_token_size — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_ft_min_token_size

## Issues Found
- **Boolean mode operator descriptions for `>` and `<` were incorrect.** The post stated that `>term` means "term must be present, increase relevance" and `<term` means "term must be present, decrease relevance." According to MySQL documentation, the `>` and `<` operators only modify the relevance contribution of the term — they do **not** require the term to be present (that is the role of the `+` operator). Fixed the descriptions to: `>term` — "increase the term's relevance contribution" and `<term` — "decrease the term's relevance contribution."

## Review Notes
- All SQL syntax (CREATE TABLE, ALTER TABLE, SELECT with MATCH...AGAINST, OPTIMIZE TABLE) is correct and current for MySQL 8.0+.
- The `innodb_ft_min_token_size` default of 3 is correctly stated.
- The custom stopword table format (`'mydb/my_stopwords'` using `database/table` notation) for `innodb_ft_server_stopword_table` is correct.
- The description of query expansion (blind query expansion / automatic relevance feedback) is accurate.
- The TF-IDF based relevance scoring description is accurate for InnoDB full-text search.
- Note that `innodb_ft_min_token_size` requires a server restart to take effect — the post doesn't explicitly mention this, but it is implied by placing the setting in `[mysqld]` config.
