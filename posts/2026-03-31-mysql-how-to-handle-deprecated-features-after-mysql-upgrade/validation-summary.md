# Validation Summary: How to Handle Deprecated Features After MySQL Upgrade

## Status
validated

## Post Type
Guide

## Technologies Covered
- MySQL 8.0
- MySQL 5.7 (referenced for comparison)
- Python (mysql.connector)
- Redis / Memcached (mentioned as caching alternatives)

## Sources Consulted
- MySQL 8.0 Reference Manual: Query Cache removal — https://dev.mysql.com/doc/refman/8.0/en/query-cache.html
- MySQL 8.0 Reference Manual: Server System Variables (log_error_verbosity) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_log_error_verbosity
- MySQL 8.0 Reference Manual: caching_sha2_password authentication plugin — https://dev.mysql.com/doc/refman/8.0/en/caching-sha2-pluggable-authentication.html
- MySQL 8.0 Reference Manual: GROUP BY handling — https://dev.mysql.com/doc/refman/8.0/en/group-by-handling.html
- MySQL 8.0 Reference Manual: Character Sets (utf8mb3 vs utf8mb4) — https://dev.mysql.com/doc/refman/8.0/en/charset-unicode-utf8mb3.html
- MySQL 8.0 Reference Manual: Numeric Type Attributes (ZEROFILL, display width deprecation) — https://dev.mysql.com/doc/refman/8.0/en/numeric-type-attributes.html
- MySQL 8.0 Reference Manual: SQL Mode changes — https://dev.mysql.com/doc/refman/8.0/en/sql-mode.html
- MySQL 8.0 Reference Manual: Removed Functions — https://dev.mysql.com/doc/refman/8.0/en/added-deprecated-removed.html

## Issues Found

1. **Incorrect log target reference (line 25)**: The text said "Enable deprecation warnings in the slow query log" but `log_error_verbosity` controls the **error log**, not the slow query log. Fixed to reference the error log correctly.

2. **Inaccurate SQL_NO_CACHE behavior (line 32)**: The post stated both `SQL_CACHE` and `SQL_NO_CACHE` "will generate errors." In MySQL 8.0, only `SQL_CACHE` causes a syntax error. `SQL_NO_CACHE` is deprecated but still accepted as a no-op. Fixed to distinguish between the two behaviors.

3. **Oversimplified SSL requirement for caching_sha2_password (line 77)**: The post stated SSL is "required" for `caching_sha2_password`. In reality, the plugin requires either an encrypted connection (SSL/TLS) OR an RSA key pair exchange for the password. SSL is not the only option. Fixed to mention both mechanisms.

4. **Incorrect section title — "Removed" vs "Deprecated" for utf8 (line 91)**: The section was titled "Removed: utf8mb3 Synonym Deprecation" but `utf8` as an alias for `utf8mb3` is deprecated in MySQL 8.0, not removed. Fixed the title to "Deprecated: utf8 Alias for utf8mb3."

5. **Incomplete charset query (line 99)**: The query filtered `WHERE character_set_name = 'utf8'` but MySQL 8.0 may report the canonical name `utf8mb3` in information_schema. Fixed to check for both values using `IN ('utf8', 'utf8mb3')`.

6. **Incorrect claim about UNSIGNED integer deprecation (line 108)**: The post stated "unsigned integers are deprecated in MySQL 8.0." This is wrong — `UNSIGNED` for integer types (INT, BIGINT, etc.) is NOT deprecated. Only `UNSIGNED` for FLOAT, DOUBLE, and DECIMAL is deprecated. `ZEROFILL` and the display width attribute are deprecated. Fixed to accurately describe what is and is not deprecated.

## Review Notes
- The PASSWORD() function replacement in the table is listed as "caching_sha2_password or sha2()" which conflates an authentication plugin with a hashing function. A more precise replacement would be `SHA2()` for general hashing or `ALTER USER ... IDENTIFIED BY` for user password management. Left as-is since it's not strictly incorrect, just imprecise.
- The summary mentions "Use the MySQL Shell upgrade checker before upgrading" which is great advice, but this tool (`mysqlsh util.checkForServerUpgrade()`) is not discussed anywhere in the body of the article. A future revision could add a section about it.
- The `mysqlcheck --auto-repair` command only works for MyISAM tables; InnoDB tables use a different repair mechanism. This caveat is not mentioned but could be useful for readers.
- `SQL_CALC_FOUND_ROWS` is described as "deprecated in 8.0" — more precisely, it was deprecated in MySQL 8.0.17. This is a minor version detail left as-is.
