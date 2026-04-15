# Validation Summary: How to Build Real-Time Network Anomaly Detection with ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine, Memory engine, window functions, statistical functions)
- SQL (Z-score computation, conditional aggregation, window functions)
- Network telemetry concepts (traffic monitoring, link flapping, error rate detection)

## Sources Consulted
- ClickHouse documentation: CREATE TABLE statement and MergeTree engine — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse documentation: Memory table engine — https://clickhouse.com/docs/en/engines/table-engines/special/memory
- ClickHouse documentation: Aggregate functions (avg, stddevPop) — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/avg
- ClickHouse documentation: stddevPop — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/stddevpop
- ClickHouse documentation: Window functions (lagInFrame) — https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse documentation: HAVING clause — https://clickhouse.com/docs/en/sql-reference/statements/select/having
- ClickHouse documentation: nullIf function — https://clickhouse.com/docs/en/sql-reference/functions/conditional-functions#nullif
- ClickHouse documentation: Date/time functions (toYYYYMM, toHour, now) — https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse documentation: LowCardinality data type — https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality

## Issues Found
No technical issues found.

## Review Notes
- The `HAVING error_rate_pct > 1.0` without `GROUP BY` in the Error Rate Spike Detection query is valid ClickHouse SQL. Per ClickHouse documentation, when GROUP BY is omitted, HAVING works the same as WHERE, filtering rows individually. This is a ClickHouse-specific idiom that may be unfamiliar to readers coming from other databases.
- The `lagInFrame` function in the Link Flapping query is a ClickHouse-specific window function. The standard SQL `lag()` function would also work identically here since the default frame includes all preceding rows. Both are valid choices.
- The Z-score statistical approach is mathematically sound: values exceeding 3 standard deviations from the mean are flagged as anomalies, which corresponds to roughly the 99.7th percentile under a normal distribution.
- All ClickHouse data types, functions, and engine configurations are current and non-deprecated.
