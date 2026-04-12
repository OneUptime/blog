# Validation Summary: How to Migrate from MySQL to PostgreSQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (mysqldump, data types, MySQL-specific SQL functions)
- PostgreSQL (data types, SERIAL, STRING_AGG, TO_CHAR, ENUM types, pg_stat_user_tables)
- pgloader (automated MySQL-to-PostgreSQL migration tool)
- Python (mysql.connector, psycopg2 connection examples)

## Sources Consulted
- pgloader official documentation: https://pgloader.readthedocs.io/ (LOAD DATABASE command syntax, EXCLUDING TABLE NAMES MATCHING, CAST rules, regex vs string matching)
- PostgreSQL official documentation: https://www.postgresql.org/docs/current/functions-datetime.html (date subtraction behavior for DATE vs TIMESTAMP types)
- MySQL official documentation: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_datediff (DATEDIFF returns days as integer, operates on date part only)
- PostgreSQL official documentation: https://www.postgresql.org/docs/current/datatype-datetime.html (date arithmetic: DATE - DATE returns integer, TIMESTAMP - TIMESTAMP returns interval)
- MySQL 8.0 release notes: https://dev.mysql.com/doc/relnotes/mysql/8.0/en/ (CTE and window function support added in MySQL 8.0)

## Issues Found

1. **DATEDIFF translation was imprecise** (line 141): The PostgreSQL equivalent of MySQL's `DATEDIFF(end_date, start_date)` was shown as `(end_date - start_date)`. This only returns an integer (number of days) when both operands are DATE types. If the columns are TIMESTAMP types, PostgreSQL returns an INTERVAL instead, which does not match MySQL's DATEDIFF behavior (always returns days as an integer). Fixed to `(end_date::date - start_date::date)` which casts both operands to DATE first, ensuring an integer result regardless of the source column types.

2. **pgloader EXCLUDING pattern used exact string matching instead of regex** (line 77): The `EXCLUDING TABLE NAMES MATCHING 'tmp_', 'temp_'` syntax uses plain strings, which pgloader matches with exact string equality (case-insensitive). This would only exclude tables named literally "tmp_" or "temp_", not tables whose names contain those substrings (e.g., "tmp_imports", "temp_users"). Changed to `~/tmp_/, ~/temp_/` which uses pgloader's regex matching syntax to match any table name containing those patterns.

## Review Notes
- The "Why Migrate" section lists "CTEs, window functions" as PostgreSQL advantages. MySQL 8.0+ (released 2018) supports both CTEs and window functions. PostgreSQL's implementations are longer-established and have some additional capabilities, so this is not strictly wrong but could mislead readers into thinking MySQL lacks these features entirely. Not changed since the post doesn't explicitly say MySQL lacks them, but a future revision could clarify this nuance.
- The data type mapping of MySQL `TIMESTAMP` to PostgreSQL `TIMESTAMPTZ` is a reasonable default since MySQL TIMESTAMP is stored as UTC internally. However, the behavior differences are subtle (MySQL auto-converts to session timezone on read; PostgreSQL TIMESTAMPTZ stores UTC and converts on display). Users with timezone-sensitive applications should test this mapping carefully.
- The validation queries using `table_rows` (MySQL) and `n_live_tup` (PostgreSQL) both return estimates, not exact counts. The post correctly uses `SELECT COUNT(*)` for spot-checking, but doesn't note that the information_schema/pg_stat queries are approximate. This is acceptable for a migration overview.
- The `SERIAL` type is noted as the PostgreSQL equivalent of `AUTO_INCREMENT`. While correct, PostgreSQL 10+ recommends `GENERATED ALWAYS AS IDENTITY` as the modern approach. The post mentions this in the data type mapping table, which is sufficient.
