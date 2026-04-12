# Validation Summary: How to Use Window Frame Specifications (RANGE BETWEEN) in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+ window functions
- SQL RANGE BETWEEN frame specification
- SQL ROWS BETWEEN frame specification
- INTERVAL-based temporal window frames

## Sources Consulted
- MySQL 8.0 Reference Manual: Window Function Concepts — https://dev.mysql.com/doc/refman/8.0/en/window-functions-concepts.html
- MySQL 8.0 Reference Manual: Window Function Frame Specification — https://dev.mysql.com/doc/refman/8.0/en/window-functions-frames.html
- MySQL 8.0 Release Notes (8.0.17) — https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-17.html
- SQL Standard (ISO/IEC 9075) window frame semantics

## Issues Found
No technical issues found.

## Review Notes
- The version claim of MySQL 8.0.17+ for numeric/interval RANGE offsets is a reasonable practical recommendation. While RANGE frame syntax was available from MySQL 8.0 GA (8.0.11), there were known bugs with RANGE numeric expressions in earlier 8.0 releases (e.g., Bug #94747) that were fixed in 8.0.17.
- The RANGE vs ROWS output example was manually verified by tracing through all five rows — cumulative sums for both ROWS and RANGE modes are correct, including the peer-group behavior on the tied 2024-01-02 date.
- The post correctly identifies that `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` is the implicit default frame when ORDER BY is specified, which is a commonly misunderstood aspect of MySQL window functions.
- All SQL syntax is valid for MySQL 8.0+.
