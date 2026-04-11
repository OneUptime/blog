# Validation Summary: What Is a MySQL FULLTEXT Index

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.6+)
- InnoDB storage engine
- MySQL FULLTEXT indexes
- Full-text search (Natural Language Mode, Boolean Mode, Query Expansion)

## Sources Consulted
- MySQL 8.0 Reference Manual: Full-Text Search Functions — https://dev.mysql.com/doc/refman/8.0/en/fulltext-search.html
- MySQL 8.0 Reference Manual: FULLTEXT Indexes — https://dev.mysql.com/doc/refman/8.0/en/innodb-fulltext-index.html
- MySQL 8.0 Reference Manual: Boolean Full-Text Searches — https://dev.mysql.com/doc/refman/8.0/en/fulltext-boolean.html
- MySQL 8.0 Reference Manual: Full-Text Stopwords — https://dev.mysql.com/doc/refman/8.0/en/fulltext-stopwords.html
- MySQL 8.0 Reference Manual: innodb_ft_min_token_size — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_ft_min_token_size
- MySQL 8.0 Reference Manual: INNODB_FT_INDEX_TABLE — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-ft-index-table-table.html

## Issues Found
No technical issues found.

## Review Notes
- The "Checking the FULLTEXT Index" section is correct but omits a practical nuance: to see all indexed words (not just the in-memory cache), you typically need to run `SET GLOBAL innodb_optimize_fulltext_only=ON;` followed by `OPTIMIZE TABLE articles;` before querying `INNODB_FT_INDEX_TABLE`. Without this step, only cached entries are visible. This is not an error but a completeness consideration.
- The limitation about FULLTEXT search not being effective on "very small tables" refers to the 50% threshold rule in natural language mode, where words appearing in more than 50% of rows are treated as stopwords. This rule does not apply in boolean mode. The statement is correct as a general guideline but could be more precise.
- All SQL syntax is valid and uses current, non-deprecated features.
- The boolean mode operators list covers the most common operators but omits less common ones like `>`, `<`, `~`, and `()`. This is appropriate for an introductory tutorial.
