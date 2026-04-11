# Validation Summary: How to Use TEXT Data Type in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (TEXT data type, InnoDB storage engine)
- SQL (DDL, DML, INFORMATION_SCHEMA queries)
- Full-text search in MySQL

## Sources Consulted
- MySQL 8.0 Reference Manual: The TEXT Type — https://dev.mysql.com/doc/refman/8.0/en/blob.html
- MySQL 8.0 Reference Manual: Data Type Default Values — https://dev.mysql.com/doc/refman/8.0/en/data-type-defaults.html
- MySQL 8.0.13 Release Notes (TEXT/BLOB default value support) — https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-13.html
- MySQL 8.0 Reference Manual: Server System Variables (max_sort_length) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_max_sort_length
- MySQL 8.0 Reference Manual: CREATE INDEX Statement — https://dev.mysql.com/doc/refman/8.0/en/create-index.html

## Issues Found

1. **Incorrect claim: TEXT columns cannot have a DEFAULT value**
   - **What was wrong:** The post stated "TEXT columns cannot have a DEFAULT value" as a blanket rule. This was true for MySQL versions before 8.0.13, but as of MySQL 8.0.13 (released October 2018), TEXT and BLOB columns support default values.
   - **What was changed:** Updated the limitation to note the version boundary — cannot have defaults before 8.0.13, supported from 8.0.13 onward. Also updated the Summary section which repeated this claim.

2. **Incorrect claim: TEXT cannot be used in GROUP BY without specifying a length**
   - **What was wrong:** TEXT columns can be used in GROUP BY without specifying a length. The actual limitation is that sorting and grouping on TEXT columns only considers the first `max_sort_length` bytes (default 1024), which can produce incorrect groupings for values that differ only beyond that threshold.
   - **What was changed:** Replaced the incorrect GROUP BY claim with the accurate `max_sort_length` limitation.

3. **Misleading description of LONGTEXT as "Binary-safe very large text"**
   - **What was wrong:** LONGTEXT is a character string type that respects character sets and collations. The term "binary-safe" is more appropriate for LONGBLOB, which stores raw bytes without character set interpretation.
   - **What was changed:** Changed the LONGTEXT description from "Binary-safe very large text" to "Very large text, serialized data."

## Review Notes
- The off-page storage claim ("Unlike VARCHAR, TEXT columns store their data off-page") is a simplification. Whether data is stored off-page depends on the InnoDB row format (COMPACT stores first 768 bytes inline; DYNAMIC/COMPRESSED may store entirely off-page for large values). The simplification is acceptable for a blog post audience but readers working on storage optimization should consult the InnoDB row format documentation.
- All SQL examples are syntactically correct and would execute as described.
- The utf8mb4 character calculation (16,383 four-byte characters) is mathematically correct.
