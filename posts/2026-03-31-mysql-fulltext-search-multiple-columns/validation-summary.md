# Validation Summary: How to Search Across Multiple Columns with Full-Text Search in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB full-text search)
- FULLTEXT indexes (composite and single-column)
- MATCH AGAINST syntax (natural language and boolean mode)
- EXPLAIN for query plan inspection

## Sources Consulted
- MySQL 8.0 Reference Manual: Full-Text Search Functions — https://dev.mysql.com/doc/refman/8.0/en/fulltext-search.html
- MySQL 8.0 Reference Manual: Natural Language Full-Text Searches — https://dev.mysql.com/doc/refman/8.0/en/fulltext-natural-language.html
- MySQL 8.0 Reference Manual: Full-Text Restrictions — https://dev.mysql.com/doc/refman/8.0/en/fulltext-restrictions.html
- MySQL 8.0 Reference Manual: Fine-Tuning MySQL Full-Text Search — https://dev.mysql.com/doc/refman/8.0/en/fulltext-fine-tuning.html
- MySQL Blog: Rankings with InnoDB Full-Text Search — https://dev.mysql.com/blog-archive/rankings-with-innodb-full-text-search/

## Issues Found

### Issue 1: Incorrect claim that column order affects relevance scoring
- **What was wrong:** The "Column Order Matters" section claimed "MySQL weights matches in earlier columns slightly higher" and that placing important columns first gives them a relevance boost. This is not supported by the official MySQL documentation. MySQL's full-text relevance is based on TF-IDF (term frequency / inverse document frequency) and does not consider column position within the index.
- **What was changed:** Renamed section to "Column Order Does Not Affect Relevance," corrected the explanation, and added an example showing how to achieve per-column weighting using separate FULLTEXT indexes with manual score combination.

### Issue 2: Misleading "You Cannot Mix Indexes in One MATCH" example
- **What was wrong:** The example labeled as an ERROR showed two separate MATCH expressions combined with OR (`MATCH(title) AGAINST('query') OR MATCH(body) AGAINST('query')`). This query is perfectly valid if separate FULLTEXT indexes exist on `title` and `body`. Additionally, the "CORRECT" alternative used `MATCH(title, body)` which would itself fail because no FULLTEXT index covers exactly `(title, body)` — the composite index was defined on `(title, excerpt, body)`.
- **What was changed:** Replaced the error example with a genuine error case (`MATCH(title, body)` with no matching index). Added the correct fix showing all three columns must be listed. Added a note that multiple MATCH expressions with OR are valid when separate indexes exist.

### Issue 3: Summary repeated incorrect column-ordering claim
- **What was wrong:** The summary stated "Earlier columns receive slightly higher relevance weighting."
- **What was changed:** Replaced with "Column order in the index does not affect relevance scoring."

## Review Notes
- The rest of the post (CREATE TABLE syntax, ALTER TABLE syntax, MATCH AGAINST query patterns, boolean mode operators, EXPLAIN usage, separate vs composite index guidance) is technically accurate.
- The manual weighting technique added in the fix (using separate FULLTEXT indexes with multiplied scores) is a well-established MySQL pattern for achieving per-column relevance boosting.
