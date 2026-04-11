# Validation Summary: How to Implement Multi-Language Support in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (utf8mb4 character set, collations, full-text search, ngram parser)
- SQL (DDL, DML, JOIN patterns, COALESCE fallback logic)
- Unicode / UCA (Unicode Collation Algorithm)

## Sources Consulted
- MySQL 8.0 Reference Manual: Character Sets and Collations — https://dev.mysql.com/doc/refman/8.0/en/charset.html
- MySQL 8.0 Reference Manual: utf8mb4 Character Set — https://dev.mysql.com/doc/refman/8.0/en/charset-unicode-utf8mb4.html
- MySQL 8.0 Reference Manual: Collation Naming Conventions — https://dev.mysql.com/doc/refman/8.0/en/charset-collation-names.html
- MySQL 8.0 Reference Manual: ngram Full-Text Parser — https://dev.mysql.com/doc/refman/8.0/en/fulltext-search-ngram.html
- MySQL 8.0 Reference Manual: CREATE DATABASE Syntax — https://dev.mysql.com/doc/refman/8.0/en/create-database.html
- MySQL 8.0 Reference Manual: FULLTEXT Indexes — https://dev.mysql.com/doc/refman/8.0/en/innodb-fulltext-index.html

## Issues Found
- **"accent-aware" description of `utf8mb4_unicode_ci`**: The post described `utf8mb4_unicode_ci` as providing "accent-aware comparison." This is incorrect — `utf8mb4_unicode_ci` is accent-**insensitive**, meaning accented and unaccented characters are treated as equal in comparisons (e.g., `e` = `é`). Changed "accent-aware" to "accent-insensitive" to accurately describe the collation behavior.

## Review Notes
- The `utf8mb4_sv_0900_ai_ci` collation referenced in the post is a MySQL 8.0+ collation (UCA 9.0.0). Readers on MySQL 5.7 would not have access to `_0900_` collations; they would use `utf8mb4_swedish_ci` instead. The post doesn't specify a MySQL version, but this is worth noting.
- The composite index `(lang_code, product_id)` suggested in the Indexing section is useful for queries filtering by `lang_code` first. Since the PRIMARY KEY is `(product_id, lang_code)`, lookups by `product_id` are already covered. The additional index is a valid optimization for language-first access patterns.
- The ngram parser configuration (`ngram_token_size` system variable) is not mentioned; the default token size of 2 may not be optimal for all CJK use cases. This is not an error but could be a useful addition in the future.
