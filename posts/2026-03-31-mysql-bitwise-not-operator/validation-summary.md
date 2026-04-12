# Validation Summary: How to Use Bitwise NOT (~) Operator in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (bitwise operators, specifically the `~` NOT operator)
- SQL (DML: SELECT, UPDATE, INSERT, CREATE TABLE)

## Sources Consulted
- MySQL 8.0 Reference Manual: Bit Functions and Operators (https://dev.mysql.com/doc/refman/8.0/en/bit-functions.html)
- MySQL 8.0 Reference Manual: Operator Precedence (https://dev.mysql.com/doc/refman/8.0/en/operator-precedence.html)

## Issues Found
1. **Operator precedence bug in "Using NOT in Combination with XOR and OR" section (line 78):**
   - **What was wrong:** The expression `(original_flags | 8) ^ 2 & ~1` does not behave as the comment describes. In MySQL, `&` has higher precedence than `^`, so this is parsed as `(original_flags | 8) ^ (2 & ~1)`, which simplifies to `(original_flags | 8) ^ 2`. The `& ~1` (clear bit 0) operation is consumed by the `&` binding to just `2`, so bit 0 is never actually cleared from the overall result.
   - **What was changed:** Added explicit parentheses to make the expression `((original_flags | 8) ^ 2) & ~1`, which correctly performs all three operations: set bit 3, toggle bit 1, then clear bit 0.
   - **Why:** Without the fix, readers following the example would not achieve the stated goal of clearing bit 0. Operator precedence issues in bitwise expressions are a common source of bugs.

## Review Notes
- All numeric results (`~0`, `~1`, `~255`, `15 & ~2`) were verified to be correct for MySQL's 64-bit unsigned integer arithmetic.
- The permissions example correctly computes 11 (READ+WRITE+ADMIN) & ~2 = 9 (READ+ADMIN).
- The mask creation example `~(~0 << 8)` correctly produces 255.
- The NULL handling claim (`~NULL` returns NULL) is correct per MySQL documentation.
- The post correctly notes that MySQL uses 64-bit unsigned arithmetic for bitwise operations and warns about truncation with smaller column types.
