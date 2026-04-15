# Validation Summary: How to Use Null Format in ClickHouse for Discard Output

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (Null format, system.query_log, EXPLAIN PIPELINE, clickhouse-benchmark)
- SQL
- Bash/CLI

## Sources Consulted
- ClickHouse Formats documentation: https://clickhouse.com/docs/en/interfaces/formats#null — confirmed Null is output-only (Input: no, Output: yes)
- ClickHouse clickhouse-benchmark documentation: https://clickhouse.com/docs/en/operations/utilities/clickhouse-benchmark — verified --concurrency, --iterations, --query flags; no mention of Null format being used internally
- ClickHouse EXPLAIN documentation: https://clickhouse.com/docs/en/sql-reference/statements/explain#explain-pipeline — confirmed EXPLAIN PIPELINE is valid and does not execute the query
- ClickHouse system.query_log documentation: https://clickhouse.com/docs/en/operations/system-tables/query_log — confirmed all column names (query_duration_ms, read_rows, read_bytes, memory_usage, query, type, event_time) and type='QueryFinish' value

## Issues Found

1. **INSERT INTO ... FORMAT Null is invalid** — The post claimed `INSERT INTO discard_table FORMAT Null;` could be used to discard input data. The Null format is output-only according to official documentation and cannot be used as an input format for INSERT. Fixed by replacing the section with the correct approach: using the Null table engine (`ENGINE = Null`) to discard inserted data.

2. **clickhouse-benchmark does not use Null format internally** — The post stated "clickhouse-benchmark uses Null format internally." The official clickhouse-benchmark documentation makes no mention of this. Fixed by replacing the claim with an accurate description: "clickhouse-benchmark measures query execution time and reports statistics."

3. **EXPLAIN PIPELINE with FORMAT Null suppresses output** — The post showed `EXPLAIN PIPELINE SELECT ... FORMAT Null;` and claimed "This prints the execution pipeline without running the query." The `FORMAT Null` clause applies to the EXPLAIN output, suppressing it entirely — so nothing would be printed. Fixed by removing `FORMAT Null` from the EXPLAIN example and adding a note explaining why it should not be used there.

## Review Notes
- The comparison table (Null vs /dev/null) is accurate: FORMAT Null skips serialization server-side, while `> /dev/null` only discards the output client-side after serialization.
- The system.query_log query example is correct and useful for post-benchmark analysis.
- All SQL syntax (SELECT ... FORMAT Null, GROUP BY, aggregate functions like count(), sum(), avg(), uniqExact()) is valid ClickHouse SQL.
- The mermaid diagram accurately represents the query pipeline flow.
