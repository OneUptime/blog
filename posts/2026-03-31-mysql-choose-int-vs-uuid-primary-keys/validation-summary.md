# Validation Summary: How to Choose Between INT and UUID for Primary Keys in MySQL

## Status
validated

## Post Type
Guide

## Technologies Covered
- MySQL (8.0+)
- InnoDB storage engine
- UUID v1, UUID v4, UUID v7
- MySQL built-in functions: `UUID()`, `UUID_TO_BIN()`, `BIN_TO_UUID()`
- `information_schema.tables`

## Sources Consulted
- MySQL 8.4 Reference Manual — Miscellaneous Functions (`UUID()`, `UUID_TO_BIN()`, `BIN_TO_UUID()`) https://dev.mysql.com/doc/refman/8.4/en/miscellaneous-functions.html
- MySQL 8.0 Reference Manual — Integer Types (Storage and Range) https://dev.mysql.com/doc/refman/8.0/en/integer-types.html
- MySQL 8.0 Release Notes — 8.0.13 (expression defaults) https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-13.html
- RFC 9562 — Universally Unique IDentifiers (UUIDs) https://www.rfc-editor.org/rfc/rfc9562
- MySQL InnoDB documentation on defragmentation and `data_free` https://dev.mysql.com/doc/refman/8.0/en/innodb-file-defragmenting.html

## Issues Found

1. **UUID v7 section — misleading code example**: The code `SELECT BIN_TO_UUID(UUID_TO_BIN(UUID(), 1)) AS ordered_uuid;` is not UUID v7. `UUID()` generates UUID v1, and the `swap_flag=1` parameter in `UUID_TO_BIN()` merely rearranges the time-low and time-high bytes for better sequential ordering. The comment also incorrectly called this a "user-defined ordering function" when it is a built-in MySQL function parameter. **Fix**: Rewrote the comment to clarify this is UUID v1 with byte swapping (not UUID v7), and added an explanatory sentence distinguishing the two approaches.

2. **Missing swap_flag on BIN_TO_UUID**: The original code `BIN_TO_UUID(UUID_TO_BIN(UUID(), 1))` omitted the swap_flag on `BIN_TO_UUID`, which means the displayed UUID string would have incorrectly swapped fields rather than matching the original UUID v1 format. **Fix**: Changed to `BIN_TO_UUID(UUID_TO_BIN(UUID(), 1), 1)` for a correct round-trip.

## Review Notes
- The `DEFAULT (UUID_TO_BIN(UUID()))` expression default syntax requires MySQL 8.0.13+. The post does not specify a minimum version, which could confuse users on older MySQL versions.
- The `data_free` column aliased as `fragmented_mb` in the benchmarking query is an approximation — it represents allocated-but-unused space in InnoDB, not a precise fragmentation metric. For tables in a shared tablespace, it reports free space for the entire tablespace. This is a common simplification and not incorrect for a quick comparison, but readers should be aware of the limitation.
- MySQL does not have native UUID v7 support in any released version (through 9.x). Community solutions exist (e.g., lefred/mysql-component-uuid_v7, Percona Server's UUID_VX component). MariaDB 11.7+ has native `UUID_v7()`, but MySQL does not.
