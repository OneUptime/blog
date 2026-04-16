# Validation Summary: How to Handle Dictionary Loading Failures in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (dictionaries, system tables, SYSTEM statements)
- SQL (ClickHouse dialect)
- MySQL table function
- XML server configuration (`config.xml`)

## Sources Consulted
- [system.dictionaries | ClickHouse Docs](https://clickhouse.com/docs/operations/system-tables/dictionaries)
- [Dictionaries | ClickHouse Docs](https://clickhouse.com/docs/sql-reference/dictionaries)
- [SYSTEM Statements | ClickHouse Docs](https://clickhouse.com/docs/sql-reference/statements/system)
- [ClickHouse PR #57133 — wait_dictionaries_load_at_startup default change](https://github.com/ClickHouse/ClickHouse/pull/57133)
- [ClickHouse PR #72664 — dictionary loading settings in system.server_settings](https://github.com/ClickHouse/ClickHouse/pull/72664)

## Issues Found
1. **Invalid dictionary status `FAILED_AND_RELOAD_ON_QUERY`.** The post listed this as a valid `system.dictionaries.status` value. The actual Enum8 values are `NOT_LOADED`, `LOADED`, `FAILED`, `LOADING`, `FAILED_AND_RELOADING`, `LOADED_AND_RELOADING`, and `NOT_EXIST`. Replaced the bogus entry with `LOADED_AND_RELOADING` and `FAILED_AND_RELOADING`, which matches official documentation.

2. **Incorrect default for `dictionaries_lazy_load`.** The post stated "By default, ClickHouse loads all dictionaries at startup." In current ClickHouse, `dictionaries_lazy_load` defaults to `true`, so dictionaries are lazy-loaded by default. Rewrote the paragraph to reflect this while still explaining how to enable it explicitly.

3. **`LIFETIME` misrepresented as a lazy-loading mechanism.** The post implied `LIFETIME(MIN 0 MAX 3600)` makes a dictionary load on first use. `LIFETIME` controls refresh cadence only; lazy loading is governed by the server-level `dictionaries_lazy_load` setting. Clarified this in the same section.

## Review Notes
- The `FAILED` and `NOT_LOADED` monitoring query is reasonable, though operators may also want to include `FAILED_AND_RELOADING` in alerts depending on tolerance.
- The HTTP timeout example uses a `<dictionaries_config>` snippet that only points at the config directory rather than showing an actual timeout setting; it is not wrong per se (dictionary-source-specific timeouts live inside each dictionary's `<source>` block), but it is a bit shallow. Left as-is since it is directional rather than technically incorrect.
- `dictGetStringOrDefault` and `dictGetOrDefault` signatures and the `mysql()` table function signature are both correct.
- The `system.dictionaries` columns referenced (`name`, `status`, `last_successful_update_time`, `last_exception`, `loading_duration`) are all valid.
