# Validation Summary: How to Choose Between DATETIME and TIMESTAMP in MySQL

## Status
validated

## Post Type
Guide

## Technologies Covered
- MySQL (DATETIME and TIMESTAMP data types)
- SQL (DDL and DML syntax)
- Timezone handling (CONVERT_TZ function)

## Sources Consulted
- MySQL 8.0 Reference Manual — The DATE, DATETIME, and TIMESTAMP Types: https://dev.mysql.com/doc/refman/8.0/en/datetime.html
- MySQL 8.0 Reference Manual — Data Type Storage Requirements: https://dev.mysql.com/doc/refman/8.0/en/storage-requirements.html
- MySQL 8.0 Reference Manual — Automatic Initialization and Updating for TIMESTAMP and DATETIME: https://dev.mysql.com/doc/refman/8.0/en/timestamp-initialization.html

## Issues Found

1. **DATETIME storage size was incorrect**: The post stated DATETIME uses 8 bytes. Since MySQL 5.6.4 (released 2013), DATETIME uses 5 bytes for the non-fractional part. Changed "8 bytes" to "5 bytes (8 before 5.6.4)" in the comparison table.

2. **Decision guide repeated the incorrect storage figure**: The decision guide said "4 bytes vs 8 bytes". Changed to "4 bytes vs 5 bytes" to match the corrected storage size.

3. **Misleading SQL comment about stored value shifting**: The comment said "The stored value shifts when the session timezone changes." The stored UTC value does not shift — only the displayed value changes. Changed to "The displayed value shifts when the session timezone changes."

4. **Pitfall 1 was factually incorrect**: The post claimed "TIMESTAMP silently stores NULL if value is out of range." This is wrong. In strict SQL mode (default since MySQL 5.7), out-of-range values produce an error. In non-strict mode, the zero value '0000-00-00 00:00:00' is stored, not NULL. Changed to accurately describe the strict mode behavior.

## Review Notes
- The TIMESTAMP range lower bound is technically '1970-01-01 00:00:01' UTC (not '1970-01-01 00:00:00'), but the summary table's shorthand of "1970-01-01" is acceptable for a quick comparison.
- The note about DATETIME gaining DEFAULT CURRENT_TIMESTAMP support in MySQL 5.6.5+ is accurate but increasingly irrelevant since MySQL 5.6 has been EOL since February 2021. All supported MySQL versions now support this for both types.
- Fractional seconds add 0-3 additional bytes to both types depending on precision, which the post does not mention but is not strictly required for the article's scope.
