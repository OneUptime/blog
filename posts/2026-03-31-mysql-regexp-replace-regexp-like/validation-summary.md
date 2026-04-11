# Validation Summary: How to Use MySQL Regular Expression Functions (REGEXP_REPLACE, REGEXP_LIKE)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- SQL
- Regular Expressions (ICU engine)

## Sources Consulted
- MySQL 8.0 Reference Manual — Regular Expressions: https://dev.mysql.com/doc/refman/8.0/en/regexp.html

## Issues Found
1. **Incorrect description of regex engine as "POSIX-compatible"**: The post stated MySQL 8.0 regex functions provide "full POSIX-compatible regex support including look-ahead, look-behind, and Unicode character classes." This is contradictory — POSIX regex does not support look-ahead or look-behind. MySQL 8.0 uses the ICU (International Components for Unicode) regex engine, which is closer to Perl-compatible regex. Changed to "full regex support" without the incorrect POSIX qualifier.

2. **Incorrect default for case-sensitivity match type flag**: The post listed `c - case-sensitive (default)`. Per the official MySQL documentation, the default case sensitivity is determined by the collation of the expression, not hardcoded to case-sensitive. Added a note clarifying that the default depends on the collation of the expression.

## Review Notes
- The REGEXP_INSTR section omits the `return_option` parameter from its description, but since it only shows a usage example (not a formal syntax block), this is acceptable.
- The `u` (Unix-only line endings) match type flag is not listed, but the post doesn't claim to be exhaustive.
- All SQL code examples are syntactically correct and produce the expected output as shown.
- The sample data, table schema, and all query results were verified for consistency.
