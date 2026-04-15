# Validation Summary: How to Load Dictionaries from PostgreSQL Sources in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (dictionaries, external dictionary sources, system tables)
- PostgreSQL (as a dictionary source)
- SQL (CREATE DICTIONARY DDL, dictionary functions, system queries)

## Sources Consulted
- ClickHouse Documentation — CREATE DICTIONARY: https://clickhouse.com/docs/sql-reference/statements/create/dictionary
- ClickHouse Documentation — External Dictionary Sources (PostgreSQL): https://clickhouse.com/docs/en/sql-reference/dictionaries/external-dictionaries/external-dicts-dict-sources
- ClickHouse Documentation — Dictionary Functions (dictGet, dictGetString): https://clickhouse.com/docs/sql-reference/functions/ext-dict-functions
- ClickHouse Documentation — Dictionary Layouts: https://clickhouse.com/docs/en/sql-reference/dictionaries/external-dictionaries/external-dicts-dict-layout
- ClickHouse Documentation — system.dictionaries table: https://clickhouse.com/docs/operations/system-tables/dictionaries
- ClickHouse GitHub Issue #48348 — LowCardinality not supported in dictionary attributes

## Issues Found

### 1. LowCardinality(String) not supported in dictionary attribute definitions
- **What was wrong:** The `customer_dict` dictionary used `LowCardinality(String)` for the `plan` and `country` attributes. ClickHouse does not support `LowCardinality` as a type for dictionary attributes — it raises an "Unknown type" error at dictionary creation time.
- **What was changed:** Replaced `LowCardinality(String)` with `String` for both attributes.
- **Why:** Dictionary attributes only support base types (String, UInt64, Float64, Date, DateTime, etc.). LowCardinality is a column encoding optimization for MergeTree table columns and is not applicable to dictionary storage.

### 2. QUERY column names did not match dictionary attribute names
- **What was wrong:** In the `enriched_product_dict`, the QUERY selected `p.id` and `p.name` but the dictionary attributes were named `product_id` and `product_name`. Without aliases, the returned column names (`id`, `name`) would not match the dictionary attribute names, causing a loading failure.
- **What was changed:** Added `AS product_id` and `AS product_name` aliases to the query: `p.id AS product_id, p.name AS product_name`.
- **Why:** When using a custom QUERY in a dictionary source, the column names in the SELECT must match the dictionary attribute names exactly for ClickHouse to map the data correctly.

## Review Notes
- The post uses `dictGetString` which still works but ClickHouse docs now recommend using the generic `dictGet` function instead ("Consider using dictGet instead"). This is a style/best-practice suggestion, not an error — `dictGetString` remains functional.
- The SSLMODE parameter shown in the "Configure SSL for Production" section is not explicitly documented for PostgreSQL dictionary sources in all versions of the ClickHouse docs, though it is supported through the underlying libpq connection handler. Users should verify support for their ClickHouse version.
- The post could benefit from mentioning `invalidate_query` as an option for checking whether source data has changed before reloading (avoids unnecessary full reloads).
- `LIFETIME(300)` single-value syntax is valid and equivalent to `LIFETIME(MIN 0 MAX 300)`.
