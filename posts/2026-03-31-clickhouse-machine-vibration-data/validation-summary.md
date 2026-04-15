# Validation Summary: How to Analyze Machine Vibration Data in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse (SQL dialect, MergeTree engine, window functions, LowCardinality type)
- Vibration analysis / condition monitoring concepts (RMS velocity, kurtosis, crest factor)
- ISO 10816 vibration severity classification

## Sources Consulted
- ClickHouse documentation: CREATE TABLE, MergeTree engine, PARTITION BY, ORDER BY — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse documentation: Window Functions (OVER, PARTITION BY, ROWS BETWEEN, lag) — https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse documentation: Aggregate functions (avg, max, count), multiIf, nullIf, round, toStartOfHour, toStartOfDay, toYYYYMMDD, today — https://clickhouse.com/docs/en/sql-reference/functions
- ClickHouse documentation: HAVING without GROUP BY behavior — https://clickhouse.com/docs/en/sql-reference/statements/select/having
- ClickHouse documentation: LowCardinality type — https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality
- ISO 10816-3 vibration severity zones for industrial machines (Group 2: 2.3 / 4.5 / 7.1 mm/s thresholds)

## Issues Found
No technical issues found.

## Review Notes
- The tags include "FFT" but the post covers only time-domain statistical features (RMS, kurtosis, crest factor) — no frequency-domain / FFT analysis is discussed. This is a metadata/editorial note, not a code error.
- The Kurtosis Spike Detection query uses `HAVING` without `GROUP BY` to filter on window function results. This is valid ClickHouse behavior (acts as a post-projection filter), though `QUALIFY` (supported since ClickHouse 22.11) would be the more semantically precise keyword for filtering on window function output.
- The 143-row window labeled "rolling_24h_avg_kurtosis" assumes a specific sampling interval (~10 minutes, giving 144 readings per 24 hours). The post doesn't state the assumed sampling rate, but this is a reasonable convention for a tutorial and the window function itself is syntactically correct regardless.
- ISO 10816 has been largely superseded by ISO 20816, but the thresholds (2.3, 4.5, 7.1 mm/s for Zone A/B/C/D) remain accurate and "ISO 10816" is still the widely recognized term in industry.
