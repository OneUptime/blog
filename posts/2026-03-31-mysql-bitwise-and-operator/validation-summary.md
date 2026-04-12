# Validation Summary: How to Use Bitwise AND (&) Operator in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (bitwise AND operator `&`)
- SQL (DDL, DML, bitwise operations)

## Sources Consulted
- MySQL 8.0 Reference Manual: Bit Functions and Operators (https://dev.mysql.com/doc/refman/8.0/en/bit-functions.html)
- MySQL 8.0 Reference Manual: Cast Functions and Operators — BIGINT unsigned behavior for bitwise operations (https://dev.mysql.com/doc/refman/8.0/en/cast-functions.html)

## Issues Found
- **Summary used "toggle" instead of "clear"**: The final summary paragraph said "combine with `UPDATE` to toggle flags efficiently." The UPDATE example in the post demonstrates *clearing* a bit using `permissions & ~2`, which is a clear operation (AND with NOT). Toggling (flipping a bit regardless of its current state) is done with XOR (`^`), not AND. Changed "toggle" to "clear" to match the actual operation shown.

## Review Notes
- All bitwise AND calculations in the examples are mathematically correct (12&10=8, 7&3=3, 255&15=15, 42&1=0, 43&1=1, 255&240=240).
- The permission flags pattern (READ=1, WRITE=2, DELETE=4, ADMIN=8) and the associated SQL queries are correct and follow standard bitmask conventions.
- The UPDATE example removes WRITE permission from Bob, who only has READ (permissions=1). The operation is valid and produces the correct result (1 & ~2 = 1, unchanged), but a more illustrative example might remove a permission the user actually has. This is a pedagogical note, not a technical error.
- The `~` (bitwise NOT) operator usage is correct for MySQL.
- The claim that MySQL performs bitwise operations on BIGINT UNSIGNED values is accurate per MySQL documentation.
- NULL behavior (`NULL & 7` returns NULL) is correct.
