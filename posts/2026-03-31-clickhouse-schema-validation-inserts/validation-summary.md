# Validation Summary: How to Implement Schema Validation Before ClickHouse Inserts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine, format settings, TTL)
- Python (Pydantic v2, clickhouse-driver)
- curl / ClickHouse HTTP interface

## Sources Consulted
- Pydantic v2 migration guide: https://docs.pydantic.dev/latest/migration/
- Pydantic validators documentation: https://docs.pydantic.dev/latest/concepts/validators/
- ClickHouse format settings documentation: https://clickhouse.com/docs/operations/settings/formats
- ClickHouse MergeTree engine documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- ClickHouse TTL documentation: https://clickhouse.com/docs/guides/developer/ttl
- ClickHouse integer overflow issues: https://github.com/ClickHouse/ClickHouse/issues/17714, https://github.com/ClickHouse/ClickHouse/issues/7630
- clickhouse-driver quickstart: https://clickhouse-driver.readthedocs.io/en/latest/quickstart.html

## Issues Found

1. **Deprecated Pydantic v1 API usage**: The code used `@validator` and `.dict()`, which are deprecated in Pydantic v2 (removed in v3). Updated `@validator` to `@field_validator` with `@classmethod` decorator, and `.dict()` to `.model_dump()`. Also updated the import from `validator` to `field_validator`.

2. **Fabricated section title "Using CHECK_QUERY Format Setting"**: There is no ClickHouse concept called "CHECK_QUERY Format Setting." ClickHouse has `CHECK TABLE` (for data integrity/checksum verification), but that is unrelated to input format validation. The section content actually discusses `input_format_skip_unknown_fields`. Renamed the section to "Rejecting Unknown Fields on Insert."

3. **Incorrect numeric overflow description**: The post stated "Numeric overflow is silently clamped." For integer types in ClickHouse, overflow actually wraps around (modular arithmetic), it does not clamp to min/max. Updated the wording to "silently wrapped (not clamped) for integer types."

## Review Notes
- The `clickhouse-driver` INSERT call uses `INSERT INTO events VALUES` without specifying column names. When passing dicts, it is more robust to specify columns explicitly (e.g., `INSERT INTO events (ts, event_type, ...) VALUES`) to avoid issues if column order changes. This is a best-practice suggestion, not a bug.
- Decimal types in ClickHouse do throw errors on overflow by default (`decimal_check_overflow = 1`), so the overflow wrapping behavior described applies specifically to integer types.
- The post's ClickHouse SQL syntax (MergeTree engine, TTL, settings) is all correct and current.
