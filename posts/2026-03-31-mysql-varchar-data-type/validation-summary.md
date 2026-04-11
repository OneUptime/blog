# Validation Summary: How to Use VARCHAR Data Type in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (VARCHAR data type, CHAR comparison, indexing, collation)
- SQL DDL and DML syntax
- InnoDB storage engine (implicit)

## Sources Consulted
- MySQL 8.0 Reference Manual: The CHAR and VARCHAR Types — https://dev.mysql.com/doc/refman/8.0/en/char.html
- MySQL 8.0 Reference Manual: Limits on Table Column Count and Row Size — https://dev.mysql.com/doc/refman/8.0/en/column-count-limit.html
- MySQL 8.0 Reference Manual: CREATE TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual: CREATE INDEX Statement (prefix indexes) — https://dev.mysql.com/doc/refman/8.0/en/create-index.html

## Issues Found
1. **wide_row example exceeded 65,535-byte row limit**: The original example used `VARCHAR(16383) CHARACTER SET utf8mb4` alongside a `TINYINT` column. The byte calculation: 16383×4 + 2 (length prefix) = 65,534 + 1 (TINYINT) + 1 (NULL bitmap for 2 nullable columns) = 65,536, which exceeds MySQL's 65,535-byte maximum row size. This CREATE TABLE would fail with "Row size too large." Fixed by reducing to `VARCHAR(16382)`, which brings the total to 65,532 bytes and leaves room for the additional column and NULL bitmap.

## Review Notes
- The length prefix description ("1 byte for lengths up to 255, 2 bytes for up to 65,535") is a common simplification. The MySQL docs specify that the threshold is based on the maximum *byte* length of the column, not the character count. For multi-byte charsets like utf8mb4, VARCHAR(100) has a max byte length of 400, requiring a 2-byte prefix. This distinction matters when estimating storage precisely but does not affect the correctness of the general explanation.
- The storage comparison example (VARCHAR(100) containing 'hello' = 6 bytes) is accurate for single-byte character sets like latin1. With MySQL 8.0's default utf8mb4, the length prefix would be 2 bytes (since 100×4 = 400 > 255), making it 7 bytes. The example is still valid as a conceptual illustration but readers using utf8mb4 should account for this.
- The claim that TEXT types "do not consume the 65,535-byte row limit" is a slight simplification — TEXT columns contribute 9-12 bytes for their pointer, but the actual data is stored off-page. This is close enough for practical guidance.
- All SQL syntax is correct and would execute successfully on MySQL 5.7+ and 8.0+.
