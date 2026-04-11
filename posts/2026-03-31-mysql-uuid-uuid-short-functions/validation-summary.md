# Validation Summary: How to Use MySQL UUID and UUID_SHORT Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+
- SQL (DDL and DML)
- UUID v1 (RFC 4122)
- UUID_TO_BIN / BIN_TO_UUID functions
- UUID_SHORT function
- InnoDB clustered indexes

## Sources Consulted
- MySQL 8.0 Reference Manual — UUID(): https://dev.mysql.com/doc/refman/8.0/en/miscellaneous-functions.html#function_uuid
- MySQL 8.0 Reference Manual — UUID_SHORT(): https://dev.mysql.com/doc/refman/8.0/en/miscellaneous-functions.html#function_uuid-short
- MySQL 8.0 Reference Manual — UUID_TO_BIN(): https://dev.mysql.com/doc/refman/8.0/en/miscellaneous-functions.html#function_uuid-to-bin
- MySQL 8.0 Reference Manual — Data Type Default Values: https://dev.mysql.com/doc/refman/8.0/en/data-type-defaults.html
- RFC 4122 — A Universally Unique IDentifier (UUID) URN Namespace

## Issues Found
- **Summary section: "non-sequential integer IDs" was contradictory.** The comparison table marks UUID_SHORT as "Sortable: Yes" and the best practices section describes its output as "sequential-ish IDs." UUID_SHORT() values are monotonically increasing (computed from server startup time plus an incrementing counter), so describing them as "non-sequential" was internally inconsistent. Changed to "compact, sortable integer IDs without auto-increment" to accurately reflect the function's behavior.

## Review Notes
- The expression default syntax `DEFAULT (UUID())` requires MySQL 8.0.13 or later. The post says "MySQL 8.0+" which is close but could be more precise. Not changed since 8.0.13 is a minor point release and the general "8.0+" guidance is standard practice.
- The comparison table lists CHAR(36) storage as 36 bytes. With MySQL 8.0's default utf8mb4 charset, CHAR(36) could in theory reserve up to 144 bytes, though InnoDB's COMPACT/DYNAMIC row formats store only the actual bytes needed for the characters (36 bytes for ASCII-only UUID strings). The table's figure is acceptable for a high-level comparison.
- The post correctly recommends UUID_TO_BIN with swap_flag=1 for InnoDB performance. The MySQL docs confirm the swap flag moves the rapidly varying time component, improving index locality for v1 UUIDs.
- The UUIDv7 recommendation in best practices is forward-looking and accurate (defined in RFC 9562, published May 2024).
