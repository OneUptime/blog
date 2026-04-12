# Validation Summary: How to Use CHAR vs VARCHAR in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (CHAR and VARCHAR data types)
- SQL (DDL and DML syntax)

## Sources Consulted
- MySQL 8.0 Reference Manual — The CHAR and VARCHAR Types: https://dev.mysql.com/doc/refman/8.0/en/char.html
- MySQL 8.0 Reference Manual — String Type Storage Requirements: https://dev.mysql.com/doc/refman/8.0/en/storage-requirements.html#data-types-storage-reqs-strings
- MySQL 8.0 Reference Manual — Data Type Storage Requirements: https://dev.mysql.com/doc/refman/8.0/en/storage-requirements.html
- MySQL 8.0 Reference Manual — Comparison of Functions and Operators (PAD SPACE behavior): https://dev.mysql.com/doc/refman/8.0/en/string-comparison-functions.html

## Issues Found
1. **VARCHAR length prefix description was oversimplified.** The original text stated the length prefix is "1 byte (if M <= 255) or 2 bytes (if M > 255)," implying the prefix depends solely on the declared character length M. Per MySQL documentation, the prefix size depends on the column's maximum possible *byte* length (M × max bytes per character for the charset). For single-byte charsets like latin1, M <= 255 is correct. But for utf8mb4 (4 bytes per character), VARCHAR(64) already has a max byte length of 256, requiring a 2-byte prefix. Fixed the description to clarify this distinction and provide the utf8mb4 threshold (M <= 63).

## Review Notes
- The storage comparison examples assume latin1 (single-byte charset), as noted in a code comment. The byte calculations are correct under that assumption. Readers using utf8mb4 (the modern default) should be aware that CHAR and VARCHAR storage requirements differ accordingly.
- The performance note about CHAR enabling faster full table scans via fixed row offsets is most applicable to MyISAM or MEMORY storage engines. In InnoDB with COMPACT/DYNAMIC row formats (the modern defaults), CHAR columns with multi-byte charsets are stored in a variable-length manner internally, reducing this advantage. This is a minor simplification rather than an error.
- The trailing space comparison behavior (`'hello' = 'hello   '` returning true) is correct for PAD SPACE collations, which are the default in MySQL 8.0. MySQL 8.0 also introduced NO PAD collations (e.g., utf8mb4_0900_ai_ci is actually PAD SPACE, but some UCA 9.0 collations are NO PAD), where trailing spaces would affect comparisons. This is a valid edge case but not an error in the post.
