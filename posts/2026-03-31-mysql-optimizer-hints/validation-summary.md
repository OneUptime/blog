# Validation Summary: How to Use MySQL Hints (Optimizer Hints)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 5.7+ / 8.0+ optimizer hints
- MySQL query optimizer
- EXPLAIN query analysis

## Sources Consulted
- MySQL 8.0 Reference Manual — Optimizer Hints: https://dev.mysql.com/doc/refman/8.0/en/optimizer-hints.html
- MySQL 5.7 Reference Manual — Optimizer Hints: https://dev.mysql.com/doc/refman/5.7/en/optimizer-hints.html
- MySQL 8.0.18 Release Notes (hash join introduction): https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-18.html
- MySQL 8.0.19 Release Notes (HASH_JOIN/NO_HASH_JOIN deprecation): https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-19.html
- MySQL 8.0.20 Release Notes (INDEX/NO_INDEX hint introduction): https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-20.html

## Issues Found

1. **Incorrect version attribution for optimizer hints**: The post claimed "MySQL 8.0 introduced optimizer hints." Optimizer hints (`/*+ */` syntax) were actually introduced in MySQL 5.7.7; MySQL 8.0 expanded the available hints significantly. Fixed the opening paragraph to correctly attribute the feature to MySQL 5.7.

2. **HASH_JOIN/NO_HASH_JOIN hints deprecated**: The post presented `HASH_JOIN` and `NO_HASH_JOIN` as current, usable hints. These were introduced in MySQL 8.0.18 but deprecated in MySQL 8.0.19 and have no effect in 8.0.19+. Updated the section to note the deprecation and recommend `BNL`/`NO_BNL` for MySQL 8.0.19+.

3. **Incorrect hint error handling description**: The post stated "A hint that is malformed or inapplicable is silently ignored." This is only true for valid-but-inapplicable hints. Malformed, duplicate, or conflicting hints generate warnings. Fixed to accurately describe both behaviors.

4. **Inaccurate EXPLAIN verification guidance**: The post advised to "look for 'hint' in the EXPLAIN output." The documented approach is to use `SHOW WARNINGS` after EXPLAIN to check for hint-related warnings. Fixed the guidance accordingly.

## Review Notes
- The `INDEX` and `NO_INDEX` optimizer hints used in the "Forcing or Disabling Index Usage" section were introduced in MySQL 8.0.20, not earlier 8.0 releases. The post's general "MySQL 8.0" framing covers this, but users on 8.0.0-8.0.19 would not have these hints available.
- The `JOIN_ORDER`, `SUBQUERY(MATERIALIZATION)`, `SEMIJOIN(FIRSTMATCH)`, `NO_MERGE`, and `NO_INDEX_MERGE` hint syntaxes were all verified as correct.
- All SQL examples are syntactically valid and demonstrate the hints correctly.
