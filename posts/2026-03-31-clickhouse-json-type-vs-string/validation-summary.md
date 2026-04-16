# Validation Summary: How to Use JSON Data Type vs String with JSONExtract in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide (schema design + performance comparison)

## Technologies Covered
- ClickHouse (SQL, MergeTree engine)
- ClickHouse `JSON` data type (the "new" JSON, introduced in 24.8)
- ClickHouse `JSONExtract*` functions (`JSONExtractString`, `JSONExtractInt`)
- ClickHouse DDL: `CREATE TABLE`, `DESCRIBE TABLE`, typed sub-columns via `JSON(path Type, ...)`

## Sources Consulted
- [ClickHouse JSON Data Type documentation](https://clickhouse.com/docs/en/sql-reference/data-types/newjson)
- [ClickHouse JSON Functions documentation](https://clickhouse.com/docs/en/sql-reference/functions/json-functions)
- [ClickHouse Release 24.8 LTS blog post](https://clickhouse.com/blog/clickhouse-release-24-08)
- [ClickHouse GitHub issue #74846 — JSON type feature experimental and beta compatibility](https://github.com/ClickHouse/ClickHouse/issues/74846)
- [ClickHouse blog — Making complex JSON 58x faster](https://clickhouse.com/blog/json-data-type-gets-even-better)

## Issues Found
1. **Incorrect version for the native `JSON` type.** The post originally claimed the `JSON` data type was "available in ClickHouse 22.6 and later." This conflates the older experimental `Object('json')` type (introduced around 22.3/22.6) with the *new* `JSON` data type described by the post (dot-notation access, typed sub-columns with `JSON(path Type, ...)` syntax, dynamic path storage). The new JSON type was introduced in **24.8** (experimental), moved to **beta** in 24.12, and marked **production-ready in 25.3**.
   - Fix: Updated the intro paragraph to say "introduced in ClickHouse 24.8 and marked production-ready in 25.3."

2. **"Experimental feature" caveat was outdated.** The "When to Use Each Approach" section told readers to use the `JSON` type only if they could "accept an experimental feature" on 22.6+. Since 25.3 the type is production-ready.
   - Fix: Updated the bullet to mention 25.3 (production-ready) and earlier 24.8+ versions (beta/experimental).

## Review Notes
- `JSONExtractString` and `JSONExtractInt` are verified correct function names (see ClickHouse JSON functions reference).
- The typed sub-column syntax `JSON(user_id String, duration_ms Int64)` is consistent with the documented `JSON(<path> <Type>, ...)` form.
- The architectural claims — JSON type stores sub-columns columnar-ly at insert time, supports per-sub-column compression, and automatically admits new keys — match ClickHouse docs.
- The `String + materialized column` middle-ground mentioned in the summary is a legitimate pattern but is not demonstrated with code; that is a stylistic choice, not a technical error.
- Future-proofing: as ClickHouse continues to improve the JSON type (e.g., v25.8 serialization enhancements), users should prefer the most recent stable release for best JSON performance.
