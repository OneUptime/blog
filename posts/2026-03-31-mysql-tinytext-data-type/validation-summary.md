# Validation Summary: How to Use TINYTEXT Data Type in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (TINYTEXT data type, TEXT family, VARCHAR, InnoDB storage)
- SQL (DDL, DML, full-text search)

## Sources Consulted
- MySQL 8.0 Reference Manual: The CHAR and VARCHAR Types — https://dev.mysql.com/doc/refman/8.0/en/char.html
- MySQL 8.0 Reference Manual: The BLOB and TEXT Types — https://dev.mysql.com/doc/refman/8.0/en/blob.html
- MySQL 8.0 Reference Manual: Data Type Default Values — https://dev.mysql.com/doc/refman/8.0/en/data-type-defaults.html
- MySQL 8.0.13 Release Notes (WL #9418: expression defaults for BLOB/TEXT) — https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-13.html
- MySQL 8.0 Reference Manual: String Literals and Character Set Introducers — https://dev.mysql.com/doc/refman/8.0/en/charset-introducer.html
- MySQL 8.0 Reference Manual: InnoDB Row Formats — https://dev.mysql.com/doc/refman/8.0/en/innodb-row-format.html

## Issues Found

### 1. Incorrect claim that TINYTEXT cannot have default values
- **What was wrong:** The comparison table stated default values are "Not allowed" for TINYTEXT, and the accompanying text said "TINYTEXT cannot have a default value." Since MySQL 8.0.13 (October 2018), TEXT and BLOB columns can have expression defaults using the syntax `DEFAULT ('value')`.
- **What was changed:** Updated the table cell from "Not allowed" to "Expression only (since 8.0.13)". Updated the paragraph below the table and the summary section to reflect that TINYTEXT supports expression defaults since MySQL 8.0.13.
- **Why:** The blog post is dated 2026 and does not target a specific MySQL version. MySQL 8.0.13 has been available since 2018, making this a significant inaccuracy for modern MySQL usage.

## Review Notes
- The post describes TINYTEXT as storing data "outside the main row (off-page)." This is an oversimplification. With InnoDB's DYNAMIC row format (default in MySQL 8.0), TINYTEXT values (max 255 bytes) are typically stored inline in the row, not off-page. Off-page storage is only used when the overall row is too large for a B-tree page. However, the practical conclusion — that TEXT types contribute only 9-12 bytes toward the 65,535-byte row-size limit — is correct. This distinction matters if readers try to use TINYTEXT specifically for off-page storage of small values.
- All SQL examples are syntactically correct and would execute as described.
- The byte-vs-character math for utf8mb4 (63 four-byte characters = 252 bytes, fits within 255) is accurate.
- The `_utf8mb4 0xF09F8E89` character set introducer syntax on hex literals is valid MySQL.
