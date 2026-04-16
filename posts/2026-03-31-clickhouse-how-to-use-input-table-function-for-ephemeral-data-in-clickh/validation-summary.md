# Validation Summary: How to Use Input Table Function for Ephemeral Data in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse `input()` table function
- ClickHouse SQL (INSERT ... SELECT, type conversion functions, `dateDiff`, `dictGet`)
- ClickHouse input formats (CSV, JSONEachRow, Parquet, TabSeparated, Values, etc.)
- `system.formats` system table
- Python ClickHouse clients (`clickhouse-driver`)

## Sources Consulted
- ClickHouse official docs: `input()` table function — https://clickhouse.com/docs/en/sql-reference/table-functions/input
- ClickHouse official docs: System table `system.formats` — https://clickhouse.com/docs/en/operations/system-tables/formats
- ClickHouse official docs: Type conversion functions (`toUInt64`, `toDecimal64`, `toFloat64`, `toDate`, `parseDateTimeBestEffort`) — https://clickhouse.com/docs/en/sql-reference/functions/type-conversion-functions
- ClickHouse official docs: `dateDiff` — https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#datediff
- ClickHouse official docs: `dictGet` — https://clickhouse.com/docs/en/sql-reference/functions/ext-dict-functions
- `clickhouse-driver` Python library docs — https://clickhouse-driver.readthedocs.io/
- `clickhouse-connect` Python library docs — https://clickhouse.com/docs/en/integrations/python

## Issues Found
- **Python example used an invalid clickhouse-connect API.** The original snippet called `client.query("INSERT ... FROM input(...) FORMAT Values", data=rows)`. `clickhouse-connect`'s `Client.query()` does not accept a `data=` parameter for row payloads — this call would fail at runtime. The pattern of passing a list of tuples alongside an `INSERT ... SELECT FROM input(...)` statement is natively supported by `clickhouse-driver` (native protocol), not `clickhouse-connect`. Switched the example to `clickhouse-driver` using `Client(...).execute(sql, rows)` and removed the redundant `FORMAT Values` clause (the native protocol handles framing).

## Review Notes
- All SQL examples were verified: `input()` syntax, `FORMAT` placement, type-conversion functions, `dateDiff('second', ...)`, `dictGet('dict', 'attr', key)`, and the `system.formats WHERE is_input = 1` query are all correct.
- The supported-formats list is accurate; ClickHouse supports many more input formats beyond those listed (Avro, Protobuf, MsgPack, etc.), which the post acknowledges with "and many others."
- In Example 2, rows whose `status` field is absent from the JSON would fail parsing because `status` is declared as non-nullable `String` in the `input()` schema. Readers ingesting heterogeneous JSON may want `Nullable(String)` in that position. Not an error in the post — worth noting as a caveat for real-world use.
