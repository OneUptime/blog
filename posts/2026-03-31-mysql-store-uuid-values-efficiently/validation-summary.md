# Validation Summary: How to Store UUID Values in MySQL Efficiently

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+
- UUID (Universally Unique Identifiers)
- UUID_TO_BIN() and BIN_TO_UUID() functions
- InnoDB B-tree indexing

## Sources Consulted
- MySQL 8.0 Reference Manual: UUID_TO_BIN() and BIN_TO_UUID() — https://dev.mysql.com/doc/refman/8.0/en/miscellaneous-functions.html#function_uuid-to-bin
- MySQL 8.0 Reference Manual: UUID() — https://dev.mysql.com/doc/refman/8.0/en/miscellaneous-functions.html#function_uuid
- MySQL 8.0 Reference Manual: Expression Default Values (8.0.13+) — https://dev.mysql.com/doc/refman/8.0/en/data-type-defaults.html
- MySQL 8.0 Reference Manual: BINARY and VARBINARY Types — https://dev.mysql.com/doc/refman/8.0/en/binary-varbinary.html
- RFC 4122: A Universally Unique IDentifier (UUID) URN Namespace — https://datatracker.ietf.org/doc/html/rfc4122

## Issues Found
No technical issues found.

## Review Notes
- The post states CHAR(36) takes 36 bytes. This is accurate for the raw data, but worth noting that in MySQL 8.0's default character set (utf8mb4), InnoDB index entries for CHAR(36) may reserve more space internally, making the actual savings from switching to BINARY(16) even greater than described.
- The expression default syntax `DEFAULT (UUID())` and `DEFAULT (UUID_TO_BIN(UUID()))` requires MySQL 8.0.13 or later. The post mentions MySQL 8.0 generally, which is acceptable since 8.0.13 is a minor patch within the 8.0 series.
- The swap_flag discussion correctly notes it is only meaningful for UUID v1 values. This is important since UUID v4 (random) values are increasingly common in application code, and the swap flag would not improve ordering for those.
