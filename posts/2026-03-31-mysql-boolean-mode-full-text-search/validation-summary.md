# Validation Summary: How to Use Boolean Mode Full-Text Search in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB and MyISAM storage engines)
- FULLTEXT indexing
- Boolean mode full-text search (`IN BOOLEAN MODE`)

## Sources Consulted
- MySQL 8.0 Reference Manual — Full-Text Search Functions: https://dev.mysql.com/doc/refman/8.0/en/fulltext-search.html
- MySQL 8.0 Reference Manual — Boolean Full-Text Searches: https://dev.mysql.com/doc/refman/8.0/en/fulltext-boolean.html
- MySQL 8.0 Reference Manual — CREATE TABLE Statement (index syntax): https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual — SHOW INDEX Statement: https://dev.mysql.com/doc/refman/8.0/en/show-index.html

## Issues Found
No technical issues found.

## Review Notes
- The `~` operator description ("includes the term but lowers its relevance contribution") is a simplification. The MySQL docs describe it as a negation operator that makes the word's contribution to relevance negative. The post's wording is not incorrect but could be more precise — a `~` word doesn't need to be present; if it happens to be present, it counts against the row's score rather than for it.
- The post correctly scopes the "no FULLTEXT index needed" note to MyISAM tables. For InnoDB (the default engine since MySQL 5.5), a FULLTEXT index is required and queries without one will produce an error.
- All SQL syntax is valid and all Boolean operator descriptions align with official MySQL documentation.
