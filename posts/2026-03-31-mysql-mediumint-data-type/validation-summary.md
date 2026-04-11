# Validation Summary: How to Use MEDIUMINT Data Type in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (MEDIUMINT data type, integer types, AUTO_INCREMENT, information_schema)
- SQL (CREATE TABLE, INSERT, SELECT, UPDATE)

## Sources Consulted
- MySQL 8.0 Reference Manual — Integer Types (Storage and Range): https://dev.mysql.com/doc/refman/8.0/en/integer-types.html
- MySQL 8.0 Reference Manual — Numeric Data Type Syntax: https://dev.mysql.com/doc/refman/8.0/en/numeric-type-syntax.html
- MySQL 8.0 Reference Manual — Server Error Message Reference (Error 1264): https://dev.mysql.com/doc/refman/8.0/en/server-error-reference.html
- MySQL 8.0 Reference Manual — The INFORMATION_SCHEMA COLUMNS Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-columns-table.html

## Issues Found

### 1. ZIP codes stored as MEDIUMINT UNSIGNED (Technical Error — Fixed)
**What was wrong:** The post recommended using `MEDIUMINT UNSIGNED` to store ZIP/postal codes and included a `zip_code MEDIUMINT UNSIGNED` column in the example `cities` table. US ZIP codes can have leading zeros (e.g., 01234 for parts of Massachusetts, 00501 in New York). Storing them as integers strips leading zeros, corrupting the data. ZIP codes are identifiers, not numeric quantities — arithmetic is never performed on them — so they should be stored as `CHAR(5)` or `VARCHAR(10)`.

**What was changed:** Replaced all ZIP code references with more appropriate MEDIUMINT use cases. The `zip_code` column was replaced with `area_sq_km` (city area in square kilometers) in the example table. Mentions of "ZIP codes" in the intro, mermaid diagram, and summary were replaced with "inventory quantities."

### 2. "Unique to MySQL" wording (Minor Inaccuracy — Fixed)
**What was wrong:** The post stated MEDIUMINT is "a 3-byte integer type unique to MySQL." While MEDIUMINT is indeed not part of the SQL standard, MariaDB (a MySQL fork) also supports it, so "unique to MySQL" is slightly misleading.

**What was changed:** Reworded to "a 3-byte integer type that is not part of the SQL standard," which is more precise.

## Review Notes
- All numeric ranges (signed/unsigned for all integer types) are correct per official MySQL documentation.
- All SQL syntax in code examples is valid MySQL.
- The error code 1264 (SQLSTATE 22003) for out-of-range values is correct.
- The display_width syntax shown in the syntax section was deprecated in MySQL 8.0.17, along with ZEROFILL. The post does not mention this deprecation, which could be noted in a future update but is not technically incorrect as-is (the syntax still works, just generates a warning).
- The `information_schema.columns` query is correct.
- The self-referencing foreign key in the `product_categories` example is valid MySQL syntax.
- The population reporting query output is arithmetically correct (961855/1000 = 961.855, rounded to 961.9, etc.).
