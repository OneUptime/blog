# Validation Summary: How to Understand the rows Column in EXPLAIN Output in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB)
- MySQL EXPLAIN and EXPLAIN ANALYZE
- MySQL indexing (single-column and composite indexes)

## Sources Consulted
- MySQL 8.0 Reference Manual: EXPLAIN Output Format — https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
- MySQL 8.0 Reference Manual: EXPLAIN ANALYZE — https://dev.mysql.com/doc/refman/8.0/en/explain.html#explain-analyze
- MySQL 8.0 Reference Manual: ANALYZE TABLE — https://dev.mysql.com/doc/refman/8.0/en/analyze-table.html

## Issues Found
1. **Incorrect description of `filtered` indicator** (Section: "What Is the rows Column?"):
   - **What was wrong:** The post stated "a large `rows` with a high `filtered` value often indicates a missing or ineffective index." A high `filtered` value (e.g., 100%) means nearly all examined rows pass the WHERE clause — this is efficient, not a sign of a missing index.
   - **What was changed:** Changed "high" to "low". A large `rows` with a **low** `filtered` value means MySQL examines many rows but discards most of them, which is the actual indicator of a missing or ineffective index. This is also consistent with the post's own example in "The filtered Column" section, where `filtered: 14.29` (low) signals that adding `status` to the index would help.

## Review Notes
- The `EXPLAIN ANALYZE` feature is noted as "MySQL 8.0+" — it was specifically introduced in MySQL 8.0.18. This is acceptable shorthand but could be made more precise.
- The `EXPLAIN ANALYZE` output format shown is accurate for MySQL 8.0.18+.
- The post correctly explains the relationship between `rows` and `filtered` in the detailed sections, making the error in the introduction likely a wording oversight rather than a conceptual misunderstanding.
