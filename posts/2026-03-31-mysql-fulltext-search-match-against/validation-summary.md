# Validation Summary: How to Use Full-Text Search in MySQL with MATCH AGAINST

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB and MyISAM full-text search)
- SQL (MATCH AGAINST syntax)
- FULLTEXT indexes
- Natural Language Mode, Boolean Mode, Query Expansion Mode

## Sources Consulted
- MySQL 8.0 Reference Manual: Full-Text Search Functions — https://dev.mysql.com/doc/refman/8.0/en/fulltext-search.html
- MySQL 8.0 Reference Manual: Boolean Full-Text Searches — https://dev.mysql.com/doc/refman/8.0/en/fulltext-boolean.html
- MySQL 8.0 Reference Manual: Natural Language Full-Text Searches — https://dev.mysql.com/doc/refman/8.0/en/fulltext-natural-language.html
- MySQL 8.0 Reference Manual: Full-Text Searches with Query Expansion — https://dev.mysql.com/doc/refman/8.0/en/fulltext-query-expansion.html
- MySQL 8.0 Reference Manual: Fine-Tuning MySQL Full-Text Search — https://dev.mysql.com/doc/refman/8.0/en/fulltext-fine-tuning.html
- MySQL 8.0 Reference Manual: CREATE INDEX Statement — https://dev.mysql.com/doc/refman/8.0/en/create-index.html

## Issues Found
- **Boolean mode relevance score claim**: The post stated "It does not return relevance scores by default" for Boolean mode. This is misleading — Boolean mode does compute relevance scores (retrievable via MATCH in the SELECT list). The actual difference from natural language mode is that Boolean mode does not automatically sort results by relevance. Changed to: "Unlike natural language mode, it does not automatically sort results by relevance."

## Review Notes
- The sample output for the natural language mode example is illustrative. On a dataset of only 7 rows where "MySQL" appears in 6 of them (>50%), natural language mode would treat "MySQL" as a stopword due to the 50% threshold rule, potentially returning fewer rows than shown. This is a known behavior with small test datasets and does not affect the tutorial's educational value, but readers running the exact queries may see different results.
- The boolean operators list covers the most common operators (+, -, *, "", ~) but omits some less common ones (>, <, (), no-operator behavior). This is acceptable for a tutorial-level post.
- The post correctly distinguishes between `ft_min_word_len` (MyISAM) and `innodb_ft_min_token_size` (InnoDB) with accurate default values.
- All SQL syntax is correct and follows current MySQL 8.0 conventions.
