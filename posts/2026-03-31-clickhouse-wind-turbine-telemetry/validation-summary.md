# Validation Summary: How to Analyze Wind Turbine Telemetry with ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (SQL dialect, MergeTree engine, window functions, LowCardinality type)
- Wind turbine SCADA telemetry concepts (power curves, availability, fault codes, thermal monitoring)

## Sources Consulted
- ClickHouse official documentation: CREATE TABLE, MergeTree engine, partitioning (https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree)
- ClickHouse SQL reference: toYYYYMMDD, toDate, toStartOfMonth, toStartOfHour, countIf, round, today() (https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions)
- ClickHouse window functions documentation (https://clickhouse.com/docs/en/sql-reference/window-functions)
- ClickHouse data types: LowCardinality, Float32, UInt16, UInt8 (https://clickhouse.com/docs/en/sql-reference/data-types)
- Wind energy terminology: AEP (Annual Energy Production) vs. availability metrics (IEC 61400-26 standard)

## Issues Found
- **Incorrect acronym "AEP" in section title**: The section "Turbine Availability (AEP)" incorrectly used the acronym AEP. In wind energy, AEP stands for "Annual Energy Production" (total energy output in MWh/GWh), not availability. The query in this section calculates time-based availability (percentage of operational intervals), which is a different metric entirely. Fixed by removing "(AEP)" from the section title to avoid confusion.

## Review Notes
- All six SQL queries are syntactically correct and use valid, current ClickHouse functions and syntax.
- The energy calculation (`sum(power_kw) * 10 / 60000`) correctly converts 10-minute interval power readings to MWh, assuming uniform 10-minute SCADA reporting intervals.
- The power curve analysis uses appropriate wind speed bins (3-25 m/s), matching typical turbine cut-in and cut-out speeds.
- The fault event analysis correctly combines GROUP BY with window functions, which is supported in ClickHouse 21.1+.
- The availability calculation uses integer division that ClickHouse automatically promotes to Float64, so the percentage calculation works correctly without explicit casting.
- The partitioning strategy (`toYYYYMMDD`) and ordering key (`farm_id, turbine_id, recorded_at`) are well-suited for time-series turbine telemetry queries.
