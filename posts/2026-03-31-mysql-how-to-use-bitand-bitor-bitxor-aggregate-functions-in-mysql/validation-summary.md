# Validation Summary: How to Use BIT_AND(), BIT_OR(), BIT_XOR() Aggregate Functions in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (BIT_AND(), BIT_OR(), BIT_XOR() aggregate functions)
- SQL bitwise operations
- Permission bitmask patterns

## Sources Consulted
- MySQL 8.0 Reference Manual — Aggregate Functions: https://dev.mysql.com/doc/refman/8.0/en/aggregate-functions.html#function_bit-and
- MySQL 8.0 Reference Manual — Bit Functions and Operators: https://dev.mysql.com/doc/refman/8.0/en/bit-functions.html

## Issues Found

1. **Incorrect BIT_AND result in "Understanding Bitwise Operations" example**: The post claimed `BIT_AND(13, 11, 14)` = `1001` = 9, stating "only bit 0 and 3 set in ALL rows." This is wrong because row 3 (14 = `1110`) does not have bit 0 set. The correct result is `1000` = 8 (only bit 3 is set in all three rows). Fixed the binary representation, decimal value, and comment.

2. **Incorrect BIT_XOR result in the same example**: The post claimed `BIT_XOR(13, 11, 14)` = `0000` = 0. The correct calculation is: 13 XOR 11 = 6 (`0110`), then 6 XOR 14 = 8 (`1000`). The result is 8, not 0. Fixed the binary representation, decimal value, and comment.

3. **Incorrect BIT_AND comment in "Checking Universal Flags" section**: The comment for Batch 2 stated `all_verified=1`, but `BIT_AND(3, 3) & 2` = `3 & 2` = 2, not 1. The bitwise AND with 2 preserves the bit value (2), it does not produce a boolean 1. Fixed the comment to show the correct value of 2.

## Review Notes
- The empty-group behavior is correctly documented: BIT_AND() returns `~0` (all bits set), while BIT_OR() and BIT_XOR() return 0.
- The return type `BIGINT UNSIGNED` is correct per MySQL documentation.
- All SQL syntax is valid and all CREATE TABLE / INSERT / SELECT statements are syntactically correct.
- The BIT_XOR change detection pattern is a well-known technique, correctly described with the caveat that equal XOR hashes only indicate the set is "likely" unchanged (not guaranteed, since different sets can produce the same XOR).
