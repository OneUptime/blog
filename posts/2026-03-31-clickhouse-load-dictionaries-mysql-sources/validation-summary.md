# Validation Summary: How to Load Dictionaries from MySQL Sources in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (dictionaries, dictionary functions, system tables)
- MySQL (as external dictionary source)
- SQL (DDL for dictionary creation, DML for lookups)

## Sources Consulted
- ClickHouse Dictionary MySQL Source documentation: https://clickhouse.com/docs/sql-reference/statements/create/dictionary/sources/mysql
- ClickHouse CREATE DICTIONARY documentation: https://clickhouse.com/docs/sql-reference/statements/create/dictionary
- ClickHouse Dictionary Attributes documentation: https://clickhouse.com/docs/sql-reference/statements/create/dictionary/attributes
- ClickHouse Dictionary Layouts documentation: https://clickhouse.com/docs/sql-reference/statements/create/dictionary/layouts/hashed
- ClickHouse Dictionary LIFETIME documentation: https://clickhouse.com/docs/sql-reference/statements/create/dictionary/lifetime
- ClickHouse Dictionary Functions documentation: https://clickhouse.com/docs/sql-reference/functions/ext-dict-functions
- ClickHouse system.dictionaries documentation: https://clickhouse.com/docs/operations/system-tables/dictionaries

## Issues Found

1. **LowCardinality(String) in dictionary column definition (line 47):** The `active_users_dict` dictionary used `LowCardinality(String)` for the `country` column. `LowCardinality` is not listed as a supported dictionary attribute type in the official ClickHouse documentation (supported types include UInt8-64, Int8-64, Float32/64, String, Date, DateTime, UUID, Decimal, Array). Changed to plain `String`.

2. **QUERY column names did not match dictionary attribute names (line 81):** The custom SQL query in `customer_enriched_dict` selected `c.id` and `s.tier`, but the dictionary defined these columns as `customer_id` and `subscription_tier`. ClickHouse matches query output columns to dictionary attributes by name, so these must align. Added `AS customer_id` and `AS subscription_tier` aliases to the query.

## Review Notes
- The `SOURCE(MYSQL(...))` parameter names are shown in uppercase (`HOST`, `PORT`, etc.) while the official documentation uses lowercase. Both work since ClickHouse's DDL parser is case-insensitive for these parameters, so this is a stylistic choice rather than an error.
- The `REPLICA` syntax correctly places `HOST`, `PRIORITY`, `PORT`, `USER`, and `PASSWORD` inside each replica block, consistent with documented behavior for per-replica connection settings.
- The `dictGetFloat64OrDefault` and `dictGetString` function signatures are used correctly.
- All `system.dictionaries` columns referenced (`status`, `element_count`, `bytes_allocated`, `last_successful_update_time`, `last_exception`, `source`) exist and are correctly used.
- Both `LIFETIME` forms (`LIFETIME(MIN 300 MAX 600)` and `LIFETIME(600)`) are valid syntax.
