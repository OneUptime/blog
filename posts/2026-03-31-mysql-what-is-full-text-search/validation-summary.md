# Validation Summary: What Is Full-Text Search in MySQL

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- MySQL (5.6+ for InnoDB FULLTEXT support)
- InnoDB storage engine
- MyISAM storage engine
- MySQL FULLTEXT indexes
- MATCH...AGAINST syntax (Natural Language, Boolean, Query Expansion modes)

## Sources Consulted
- MySQL 8.0 Reference Manual: Full-Text Search Functions — https://dev.mysql.com/doc/refman/8.0/en/fulltext-search.html
- MySQL 8.0 Reference Manual: Natural Language Full-Text Searches — https://dev.mysql.com/doc/refman/8.0/en/fulltext-natural-language.html
- MySQL 8.0 Reference Manual: Boolean Full-Text Searches — https://dev.mysql.com/doc/refman/8.0/en/fulltext-boolean.html
- MySQL 8.0 Reference Manual: Full-Text Restrictions — https://dev.mysql.com/doc/refman/8.0/en/fulltext-restrictions.html
- MySQL 8.0 Reference Manual: InnoDB Full-Text Index — https://dev.mysql.com/doc/refman/8.0/en/innodb-fulltext-index.html
- MySQL 8.0 Reference Manual: innodb_ft_min_token_size — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_ft_min_token_size
- MySQL 8.0 Reference Manual: innodb_ft_server_stopword_table — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_ft_server_stopword_table

## Issues Found
1. **Incorrect 50% threshold attribution to InnoDB**: The post stated "Words that appear in more than 50% of rows (the InnoDB default threshold) are considered 'too common' and ignored." The 50% threshold is a MyISAM-specific behavior, not InnoDB. InnoDB uses a BM25/TF-IDF-based ranking algorithm and does not apply a hard 50% document frequency cutoff. Fixed the sentence to clarify that the 50% threshold applies to MyISAM and that InnoDB uses document frequency as part of its BM25-based ranking instead.

## Review Notes
- All SQL syntax (CREATE TABLE, ALTER TABLE, MATCH...AGAINST, boolean operators, query expansion) is correct and current.
- The `innodb_ft_min_token_size` default of 3 is correct.
- The `information_schema.INNODB_FT_DEFAULT_STOPWORD` table reference is correct.
- The `innodb_ft_server_stopword_table` system variable and its `db_name/table_name` format are correct.
- The boolean operator list covers the most common operators but omits `~` (negate relevance) and `()` (grouping). This is acceptable as the post doesn't claim to be exhaustive.
- The advice to rebuild the FULLTEXT index after changing `innodb_ft_min_token_size` is correct and important.
