# Validation Summary: How to Handle Small Lookup Tables in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (dictionaries, layouts, system tables, JOIN settings)
- SQL (CREATE TABLE, CREATE DICTIONARY, SELECT with dictGet, JOIN)

## Sources Consulted
- ClickHouse CREATE DICTIONARY documentation: https://clickhouse.com/docs/sql-reference/statements/create/dictionary
- ClickHouse dictionary functions (dictGet, etc.): https://clickhouse.com/docs/sql-reference/functions/ext-dict-functions
- ClickHouse dictionary layouts (FLAT, HASHED, CACHE, RANGE_HASHED): https://clickhouse.com/docs/sql-reference/statements/create/dictionary/layouts
- ClickHouse FLAT layout documentation: https://clickhouse.com/docs/sql-reference/statements/create/dictionary/layouts/flat
- ClickHouse CACHE layout documentation: https://clickhouse.com/docs/sql-reference/statements/create/dictionary/layouts/cache
- ClickHouse system.dictionaries table: https://clickhouse.com/docs/operations/system-tables/dictionaries
- ClickHouse SYSTEM statements (RELOAD DICTIONARY): https://clickhouse.com/docs/sql-reference/statements/system
- ClickHouse JOIN clause and settings: https://clickhouse.com/docs/sql-reference/statements/select/join

## Issues Found

### 1. Nonexistent function name in section heading
- **What was wrong:** The section heading read "Querying with dictToAttr", but `dictToAttr` is not a ClickHouse function. The code within the section correctly uses `dictGet`, which is the real function.
- **What was changed:** Renamed the heading to "Querying with dictGet".
- **Why:** `dictToAttr` does not exist in ClickHouse. The official dictionary functions are `dictGet`, `dictGetOrDefault`, `dictGetOrNull`, `dictHas`, and type-specific variants like `dictGetString`.

### 2. FLAT layout incorrectly recommended for string-keyed dictionary
- **What was wrong:** The post recommended using `FLAT` layout for the country code dictionary, but FLAT only supports UInt64 keys. The country code dictionary uses String keys (`code String`), so `LAYOUT(FLAT())` would not work for it.
- **What was changed:** Updated the layout table to clarify "UInt64 keys only" for FLAT. Changed the FLAT recommendation paragraph to reference numeric-keyed tables instead of country codes, and added a note that string-keyed dictionaries like country codes should use HASHED.
- **Why:** The ClickHouse FLAT layout documentation states the key must be UInt64 type. Attempting to use FLAT with a String key would result in an error.

## Review Notes
- The CACHE layout description in the table ("Large dicts, partial cache" / "Low" memory) is technically not wrong but is somewhat optimistic. The official ClickHouse documentation describes CACHE as "the least effective of all the ways to store dictionaries" and recommends hit rates of 99%+ for acceptable performance. This is acceptable for a brief summary table but readers should consult the docs before using CACHE in production.
- The `join_use_nulls` setting description is correct but brief. Worth noting that when enabled, inequality conditions in JOINs are not supported.
- All SQL syntax, system table columns, SYSTEM commands, and join settings were verified as correct.
