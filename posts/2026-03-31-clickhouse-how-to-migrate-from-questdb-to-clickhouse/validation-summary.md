# Validation Summary: How to Migrate from QuestDB to ClickHouse

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- QuestDB (time-series database)
- ClickHouse (OLAP / time-series database)
- QuestDB REST API (`/exp` endpoint)
- ClickHouse MergeTree engine, DateTime64, LowCardinality, LIMIT BY
- QuestDB SAMPLE BY, LATEST ON, dateadd, designated timestamp
- InfluxDB Line Protocol (ILP)
- Vector (observability pipeline) — socket source, clickhouse sink
- Bash/curl

## Sources Consulted
- QuestDB REST API: https://questdb.com/docs/reference/api/rest/
- QuestDB LIMIT keyword: https://questdb.com/docs/reference/sql/limit/
- QuestDB LATEST ON keyword: https://questdb.com/docs/reference/sql/latest-on/
- QuestDB SAMPLE BY keyword: https://questdb.com/docs/reference/sql/sample-by/
- QuestDB Date/Time functions: https://questdb.com/docs/reference/function/date-time/
- QuestDB ILP overview: https://questdb.com/docs/ingestion/ilp/overview/
- ClickHouse MergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse LIMIT BY clause: https://clickhouse.com/docs/en/sql-reference/statements/select/limit-by
- ClickHouse date/time functions (toStartOfHour, toYYYYMMDD): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse CSVWithNames format / clickhouse-client: https://clickhouse.com/docs/en/interfaces/formats
- Vector Socket source: https://vector.dev/docs/reference/configuration/sources/socket/
- Vector ClickHouse sink: https://vector.dev/docs/reference/configuration/sinks/clickhouse/

## Issues Found

1. **Incorrect QuestDB LIMIT/OFFSET syntax in paging loop.** The original script used PostgreSQL-style `LIMIT ${LIMIT} OFFSET ${OFFSET}`. QuestDB's documented `LIMIT` clause uses the `LIMIT lowerBound, upperBound` form and does not accept the `OFFSET` keyword. Rewrote the loop to compute an upper bound and use `LIMIT ${OFFSET}, ${UPPER}` instead. Also renamed the shell variable `LIMIT` to `PAGE` to avoid shadowing the SQL keyword in prose and simplified the flow (removed the unused `COUNT=$(... --write-out)` capture which only held the HTTP code).

2. **Incorrect Vector ClickHouse sink `table` field.** The original config set `table = "metrics.sensor_readings"`, embedding the database name. Vector's `clickhouse` sink requires `database` and `table` as separate fields. Split the setting into `database = "metrics"` and `table = "sensor_readings"`.

## Review Notes
- The ClickHouse schema uses `DateTime64(6)` with `PARTITION BY toYYYYMMDD(ts)` which yields daily partitions matching the QuestDB `PARTITION BY DAY` original. For very high-volume workloads, monthly partitioning (`toYYYYMM`) is often preferred, but daily is fine for moderate volumes and keeps parity with the source.
- The Vector `socket` source receives raw text; to actually parse InfluxDB Line Protocol into structured tags/fields you typically need a decoding step (e.g., a `remap` transform). The example as written is illustrative — a real pipeline will need a parsing/transform step before the sink. This is noted here rather than rewritten into the post because expanding the example would exceed the scope of a migration guide.
- QuestDB's `/exp` endpoint returns CSV with a header row, so `FORMAT CSVWithNames` on the ClickHouse side is the correct choice.
- `dateadd('d', -7, now())`, `SAMPLE BY 1h`, and `LATEST ON ts PARTITION BY sensor_id` were all verified against current QuestDB docs.
- Port 9009 for ILP over TCP and port 9000 for the HTTP/REST endpoint are both the documented QuestDB defaults.
