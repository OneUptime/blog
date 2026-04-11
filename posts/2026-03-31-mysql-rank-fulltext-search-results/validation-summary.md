# Validation Summary: How to Rank Full-Text Search Results in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB full-text search)
- SQL (MATCH AGAINST, EXPLAIN, ALTER TABLE)
- Full-text search modes (Natural Language, Boolean, Query Expansion)

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Full-Text Indexes — https://dev.mysql.com/doc/refman/8.0/en/innodb-fulltext-index.html
- MySQL 8.0 Reference Manual: Natural Language Full-Text Searches — https://dev.mysql.com/doc/refman/8.0/en/fulltext-natural-language.html
- MySQL 8.0 Reference Manual: Full-Text Searches with Query Expansion — https://dev.mysql.com/doc/refman/8.0/en/fulltext-query-expansion.html
- MySQL 8.0 Reference Manual: EXPLAIN Output Format — https://dev.mysql.com/doc/refman/8.0/en/explain-output.html

## Issues Found
1. **Incorrect algorithm name (BM25)**: The post claimed MySQL uses the "BM25 (Best Match 25) algorithm" for InnoDB full-text search. The official MySQL documentation does not name BM25 as the ranking algorithm. The docs describe the relevance computation in general terms: "Relevance is computed based on the number of words in the row (document), the number of unique words in the row, the total number of words in the collection, and the number of rows that contain a particular word." Fixed both the introductory section and the summary to use accurate language matching the official documentation.

2. **Incorrect EXPLAIN terminology**: The post stated to verify that EXPLAIN output shows `fulltext` as the "key type." In MySQL's EXPLAIN output, `fulltext` appears in the `type` column (the access/join type), not a "key type" column. Fixed to say "in the `type` column."

## Review Notes
- All SQL syntax is correct and follows standard MySQL full-text search patterns.
- The claim that MySQL caches duplicate MATCH AGAINST expressions within a single query is confirmed by the official docs: "the MySQL optimizer notices that the two MATCH() calls are identical and invokes the full-text search code only once."
- The query expansion explanation is accurate per the docs.
- Natural Language Mode being the default is confirmed by the docs.
- The blended scoring formula using LOG() is valid MySQL syntax and a reasonable approach.
