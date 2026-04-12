# Validation Summary: How to Use Boolean Operators in MySQL Full-Text Search

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (full-text search, Boolean mode)
- InnoDB and MyISAM storage engines (full-text configuration differences)

## Sources Consulted
- MySQL 8.0 Reference Manual: Full-Text Search Functions — https://dev.mysql.com/doc/refman/8.0/en/fulltext-search.html
- MySQL 8.0 Reference Manual: Boolean Full-Text Searches — https://dev.mysql.com/doc/refman/8.0/en/fulltext-boolean.html
- MySQL 8.0 Reference Manual: Full-Text Stopwords — https://dev.mysql.com/doc/refman/8.0/en/fulltext-stopwords.html
- MySQL 8.0 Reference Manual: Fine-Tuning MySQL Full-Text Search — https://dev.mysql.com/doc/refman/8.0/en/fulltext-fine-tuning.html
- MySQL 8.0 Reference Manual: Server System Variables (ft_min_word_len, innodb_ft_min_token_size) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html

## Issues Found
No technical issues found.

## Review Notes
- The post states MySQL full-text search supports "two modes." Technically there is also Query Expansion mode (`WITH QUERY EXPANSION` / `IN NATURAL LANGUAGE MODE WITH QUERY EXPANSION`), but it is typically considered a modifier of Natural Language mode, so this simplification is acceptable in context.
- The complex boolean expression example description says "Find articles about MySQL indexing" but the query also matches `partition*`. This is a minor descriptive imprecision, not a technical error in the SQL itself.
- All eight boolean operators are accurately described and demonstrated with valid SQL examples.
- The default values for `ft_min_word_len` (4 for MyISAM) and `innodb_ft_min_token_size` (3 for InnoDB) are correct.
- The `information_schema.INNODB_FT_DEFAULT_STOPWORD` table reference is correct for viewing InnoDB default stopwords.
