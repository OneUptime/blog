# Validation Summary: How to Use Bitwise XOR (^) Operator in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (bitwise operators: `^`, `|`, `&`, `>>`)

## Sources Consulted
- MySQL 8.0 Reference Manual — Bit Functions and Operators: https://dev.mysql.com/doc/refman/8.0/en/bit-functions.html
- MySQL 8.0 Reference Manual — Type Conversion in Expression Evaluation (NULL handling): https://dev.mysql.com/doc/refman/8.0/en/type-conversion.html

## Issues Found
1. **Incorrect alternative in "Checking for Exactly One Flag" section** (line 101): The suggested alternative `(permissions & 1) != (permissions & 2)` was incorrect. When both READ (bit 0) and WRITE (bit 1) are set, `permissions & 1` evaluates to 1 and `permissions & 2` evaluates to 2. Since `1 != 2` is TRUE, the condition falsely matches rows where both flags are set. The comparison is flawed because the two sides produce values from different bit positions (result is either 0 or 1 vs 0 or 2), so they are unequal whenever at least one bit is set. Fixed to `(permissions & 3) IN (1, 2)`, which correctly matches only when exactly one of the two bits is set.

## Review Notes
- All bitwise arithmetic examples (XOR, OR, AND) were manually verified and are correct.
- The parity check formula was verified with multiple inputs and correctly computes odd parity of the lower 4 bits.
- The claim that operands are treated as 64-bit unsigned integers is consistent with MySQL documentation (BIGINT handling for bit operations).
- NULL behavior with `^` is correct per MySQL semantics.
- The self-reversing property `a ^ b ^ b = a` stated in the summary is correct.
