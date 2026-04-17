# Validation Summary: How to Use ClickHouse for Environmental Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, window functions, CTEs, TTL, LowCardinality)
- SQL (aggregations, conditional counts, moving averages, z-score anomaly detection)
- Environmental monitoring data (PM2.5, PM10, NO2, O3, CO, SO2, AQI)

## Sources Consulted
- ClickHouse official documentation — MergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse documentation — Window functions: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse documentation — Conditional functions (multiIf, countIf): https://clickhouse.com/docs/en/sql-reference/functions/conditional-functions
- ClickHouse documentation — Date/time functions (toYYYYMM, toDate, today, now): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse documentation — LowCardinality data type: https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality
- ClickHouse documentation — TTL for tables: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl
- WHO Global Air Quality Guidelines 2021 (PM2.5 24-hour AQG = 15 µg/m³): https://www.who.int/publications/i/item/9789240034228
- US EPA NAAQS for NO2 (annual standard = 53 ppb): https://www.epa.gov/no2-pollution/primary-national-ambient-air-quality-standards-naaqs-nitrogen-dioxide
- US EPA NAAQS for Ozone (8-hour standard = 70 ppb, 2015 revision): https://www.epa.gov/ground-level-ozone-pollution/2015-national-ambient-air-quality-standards-naaqs-ozone
- US EPA AQI category breakpoints: https://www.airnow.gov/aqi/aqi-basics/

## Issues Found
No technical issues found.

All SQL code uses valid ClickHouse syntax. Regulatory thresholds cited (WHO PM2.5 24hr AQG of 15 µg/m³, EPA NO2 annual 53 ppb, EPA O3 8hr 70 ppb) match authoritative sources. The AQI category breakpoints in the `multiIf` expression correctly align with EPA AQI categories (0–50 Good, 51–100 Moderate, 101–150 USG, 151–200 Unhealthy, 201–300 Very Unhealthy, 301+ Hazardous). The window function with nested aggregate (`avg(avg(pm25)) OVER (...)` over a `GROUP BY`) is valid ClickHouse syntax. The CTE + JOIN pattern for z-score anomaly detection uses standard `WITH ... AS` syntax supported by ClickHouse.

## Review Notes
- The WHO PM2.5 24-hour guideline value of 15 µg/m³ reflects the 2021 update (previously 25 µg/m³ in the 2005 guidelines). The post correctly uses the current value.
- Applying AQI category labels to `avg(aqi)` is a reasonable dashboard approximation, though strictly speaking AQI categories are defined for individual readings. This is a presentation choice, not a technical error.
- The `co_ppm` column being in ppm while other pollutants are in ppb reflects real-world practice — CO concentrations are typically several orders of magnitude higher than NO2/SO2/O3 in ambient air.
- For very high-cardinality deployments (millions of stations), consider whether `station_id UInt32` is large enough; `UInt32` supports over 4 billion values so this is fine for any realistic environmental network.
