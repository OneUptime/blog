# Validation Summary: How to Use ROWS vs RANGE in MySQL Window Frame Specification

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- SQL Window Functions (ROWS, RANGE frame modes)
- Aggregate functions (SUM, AVG) with window frames

## Sources Consulted
- MySQL 8.0 Reference Manual — Window Function Concepts: https://dev.mysql.com/doc/refman/8.0/en/window-functions-concepts.html
- MySQL 8.0 Reference Manual — Window Function Frame Specification: https://dev.mysql.com/doc/refman/8.0/en/window-functions-frames.html
- SQL:2011 Standard window frame semantics (for default frame behavior verification)

## Issues Found
1. **Incorrect `range_sum` for student_id 4 (score 75) in the RANGE Mode section.** The post showed `range_sum = 219` but the correct value is `75`. With `RANGE BETWEEN 2 PRECEDING AND CURRENT ROW` and a current score of 75, the frame includes rows with scores in the range [73, 75]. Students 2 and 3 (score 72) fall outside this range since 72 < 73. Only student 4 (score 75) is included, giving a sum of 75. The incorrect value of 219 (72+72+75) would only be correct if the frame were `RANGE BETWEEN 3 PRECEDING AND CURRENT ROW`. Fixed the output table to show `75` instead of `219`.

## Review Notes
- All SQL syntax is correct and compatible with MySQL 8.0+.
- All other computed output values were manually verified and are correct.
- The explanation of default frame behavior (RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) is accurate per MySQL documentation.
- The post does not mention the GROUPS frame mode (added in MySQL 8.0), but this is acceptable since the post's scope is specifically ROWS vs RANGE.
- The mermaid diagrams are well-structured and technically accurate.
