# Validation Summary: How to Use GROUP BY with CUBE in MySQL 8.0+

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+
- SQL GROUP BY extensions (CUBE, ROLLUP, GROUPING SETS)
- SQL aggregate functions (SUM)
- GROUPING() function
- UNION ALL for query composition

## Sources Consulted
- MySQL 8.0 Reference Manual: GROUP BY Modifiers (https://dev.mysql.com/doc/refman/8.0/en/group-by-modifiers.html) — confirms WITH ROLLUP is the only GROUP BY modifier; no CUBE or GROUPING SETS support
- MySQL 8.0 Reference Manual: Miscellaneous Functions — GROUPING() (https://dev.mysql.com/doc/refman/8.0/en/miscellaneous-functions.html#function_grouping) — confirms GROUPING() works with WITH ROLLUP since 8.0.1
- MySQL 8.0 Release Notes (https://dev.mysql.com/doc/relnotes/mysql/8.0/en/) — no release added GROUPING SETS support
- MySQL 8.4 Reference Manual: GROUP BY Modifiers (https://dev.mysql.com/doc/refman/8.4/en/group-by-modifiers.html) — confirms GROUPING SETS still not supported in later versions
- PostgreSQL, SQL Server, and Oracle documentation for GROUPING SETS — to confirm which databases do support it (for the corrected summary paragraph)

## Issues Found

### Critical: MySQL does NOT support GROUPING SETS (multiple locations)
- **What was wrong:** The post repeatedly claimed that MySQL 8.0.1+ supports `GROUPING SETS` syntax. This is factually incorrect. MySQL 8.0 (and all subsequent 8.x releases including 8.4) does not support `GROUPING SETS`, `CUBE`, or standard SQL `ROLLUP()` syntax. The only GROUP BY modifier MySQL supports is `WITH ROLLUP`. All `GROUPING SETS` code examples in the post would produce syntax errors in MySQL.
- **What was changed:**
  1. Removed all claims that MySQL supports GROUPING SETS throughout the post (intro, section headers, examples, comparison table, best practices, summary).
  2. Replaced all GROUPING SETS examples with correct UNION ALL-based CUBE simulations.
  3. Made the UNION ALL approach the primary recommended method for simulating CUBE in MySQL.
  4. Updated the `GROUPING()` example to use `WITH ROLLUP` (where it actually works) instead of GROUPING SETS.
  5. Updated the GROUPING()/WITH ROLLUP example output to accurately show that ROLLUP does NOT produce product-only subtotal rows (the key difference from full CUBE).
  6. Removed GROUPING SETS from the comparison table since MySQL does not support it.
  7. Updated best practices and summary to accurately reflect MySQL's capabilities.
  8. Added a note in the summary that PostgreSQL, SQL Server, and Oracle do support GROUPING SETS for readers who may use those databases.
  9. Updated the description line to remove reference to GROUPING SETS.
  10. Updated the mermaid diagram to remove GROUPING SETS reference.
- **Why:** GROUPING SETS is a standard SQL feature supported by PostgreSQL, SQL Server, Oracle, and others — but not MySQL. Readers following the GROUPING SETS examples would get syntax errors. This was the central premise of the post and needed comprehensive correction.

### Minor: Three-dimension CUBE example used GROUPING SETS
- **What was wrong:** The three-dimension example used GROUPING SETS syntax with GROUPING() function calls, which would not work in MySQL.
- **What was changed:** Replaced with a correct 8-branch UNION ALL query covering all 2^3 combinations. Removed GROUPING() calls since they only work with WITH ROLLUP, not with UNION ALL.
- **Why:** The corrected example now actually works in MySQL and demonstrates how UNION ALL scales (verbosely) with more dimensions.

## Review Notes
- All arithmetic in the output examples was verified and is correct (grand total: 133,300; region/product subtotals all match the input data).
- The CREATE TABLE and INSERT statements are syntactically correct.
- The UNION ALL approach is verbose but is the only way to achieve full CUBE behavior in MySQL. The post now correctly notes that this becomes unwieldy for many dimensions and suggests views or stored procedures for reuse.
- The `GROUPING()` function does work in MySQL 8.0.1+ but only with `WITH ROLLUP`, not with UNION ALL queries. The post now correctly shows this.
- If MySQL adds GROUPING SETS support in a future major version, this post would need to be updated. As of MySQL 8.4 (the latest GA release), GROUPING SETS is still not supported.
