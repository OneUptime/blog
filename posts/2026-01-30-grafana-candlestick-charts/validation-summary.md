# Validation Summary: How to Create Grafana Candlestick Charts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana candlestick visualization
- Grafana dashboard JSON and SQL data source macros
- Prometheus / PromQL
- InfluxDB / InfluxQL
- PostgreSQL
- TimescaleDB
- MySQL
- OneUptime metrics integration

## Sources Consulted
- Grafana candlestick visualization documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/candlestick/
- Grafana 8.3 release announcement: https://grafana.com/blog/grafana-8-3-released-recorded-queries-panel-suggestions-new-panels-added-security-and-more/
- Grafana PostgreSQL query editor and macros documentation: https://grafana.com/docs/grafana/latest/datasources/postgres/query-editor/
- Grafana MySQL query editor and macros documentation: https://grafana.com/docs/grafana/latest/datasources/mysql/query-editor/
- Grafana transform data documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/query-transform-data/transform-data/
- Prometheus querying basics: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- TimescaleDB financial candlestick hyperfunctions documentation: https://docs.timescale.com/api/latest/hyperfunctions/financial-analysis/candlestick_agg/
- TimescaleDB financial tick data tutorial: https://docs.timescale.com/tutorials/latest/financial-tick-data/
- MySQL function reference: https://dev.mysql.com/doc/refman/8.0/en/built-in-function-reference.html

## Issues Found
- The prerequisites claimed Grafana 8.0 included the candlestick panel by default. Grafana introduced the candlestick panel in Grafana 8.3, so the prerequisite was changed to Grafana 8.3 or later.
- The Prometheus example used subquery range-vector expressions with `@ start()` and `@ end()` as standalone values for Open and Close. The example was changed to use `first_over_time`, `max_over_time`, `min_over_time`, and `last_over_time`, with a note that `first_over_time` requires the Prometheus experimental functions feature flag.
- The field mapping table incorrectly described Mode as auto/manual field mapping. It now lists the actual OHLCV mapping fields.
- The PostgreSQL query used TimescaleDB functions without saying TimescaleDB was required. The heading and description now state PostgreSQL with TimescaleDB, and the time range filter now uses Grafana's `$__timeFilter` macro.
- The MySQL query used manual `DATE_FORMAT` bucketing and returned Open/Close from `GROUP_CONCAT` as strings. It now uses Grafana's `$__timeGroupAlias` and casts Open/Close values to decimals.
- The candlestick style section listed Volume as a candle style and described an "Include volume" toggle. Grafana exposes volume through the Mode option, so the style table and volume instructions were corrected.
- The JSON snippets used unsupported or misleading option placement for candlestick-specific settings. They now use candlestick `options` fields for mode, candle style, color strategy, colors, and field mappings.
- The Prometheus CPU example used the raw `node_cpu_seconds_total` counter for OHLC values, which would visualize a monotonically increasing counter rather than CPU usage. It now derives an idle percentage recording rule first, then applies OHLC functions to that gauge-style series.
- The resource pricing SQL used window functions in a way that produced one row per input row and an incorrect close value under PostgreSQL's default window frame. It was rewritten with `row_number()` ranks and grouped daily OHLC output.
- The troubleshooting instructions referenced the older Query Inspector navigation. They now use `Panel menu > Inspect > Query > Refresh`.
- The color strategy description used internal-style names rather than the current UI labels. It now describes "Since Open" and "Since Prior Close".
- The gap-fill query was missing a Grafana time filter and ordering. Both were added.

## Review Notes
- The SQL snippets are illustrative and assume the named tables and columns exist with compatible data types.
- The Prometheus Open calculation depends on `first_over_time`, which is still behind the Prometheus experimental functions feature flag in current documentation.
