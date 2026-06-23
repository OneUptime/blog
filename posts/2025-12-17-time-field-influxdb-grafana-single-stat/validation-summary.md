# Validation Summary: How to Use Time Field from InfluxDB in Grafana Single Stat

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Stat panels
- Grafana field units and transformations
- InfluxDB
- InfluxQL
- Flux
- JSON dashboard/panel configuration

## Sources Consulted
- Grafana documentation: Configure standard options - https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/configure-standard-options/
- Grafana documentation: Transform data / Add field from calculation - https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/query-transform-data/transform-data/
- Grafana Foundation SDK unit constants - https://pkg.go.dev/github.com/grafana/grafana-foundation-sdk/go/units
- InfluxDB documentation: InfluxQL LAST() function - https://docs.influxdata.com/influxdb/v1/query_language/functions/
- InfluxDB documentation: InfluxQL GROUP BY time() - https://docs.influxdata.com/influxdb/v2/query-data/influxql/explore-data/group-by/
- InfluxDB documentation: InfluxQL ORDER BY time DESC - https://docs.influxdata.com/influxdb/v2/query-data/influxql/explore-data/order-by/
- InfluxDB documentation: Flux timestamp operations - https://docs.influxdata.com/influxdb/v2/query-data/flux/operate-on-timestamps/
- Flux documentation: now() - https://docs.influxdata.com/flux/v0/stdlib/universe/now/
- Flux documentation: uint() - https://docs.influxdata.com/flux/v0/stdlib/universe/uint/
- Flux documentation: array.from() - https://docs.influxdata.com/flux/v0/stdlib/array/from/
- Flux documentation: The future of Flux - https://docs.influxdata.com/flux/v0/future-of-flux/
- InfluxDB documentation: data elements and timestamp precision - https://docs.influxdata.com/influxdb/v2/reference/key-concepts/data-elements/

## Issues Found
- The InfluxQL "last event time" query selected `time` explicitly and grouped by `time($__interval)`, which would return bucket timestamps rather than the exact last event timestamp. Changed it to `SELECT last("value") AS "value" ...`, relying on InfluxQL's returned timestamp for `LAST()`.
- The Stat panel field selector only matched `_time`, which applies to Flux output but not typical InfluxQL output in Grafana. Updated it to match `Time` or `_time`.
- The Grafana transformation steps implied a built-in "current time" operand. Updated the wording so the binary operation subtracts two numeric fields returned by the query.
- The Flux "time since last event" and countdown examples queried recent bucket data just to produce an output row, which could return no data. Replaced those with `array.from()` rows and removed unused `date` imports.
- The Grafana ISO datetime unit was listed as `dateTimeAsISO`; Grafana's unit id is `dateTimeAsIso`. Corrected the casing.
- A threshold example used `dateTimeFromNow` with duration-style threshold values. Changed the example to use `dtdurations`, where thresholds in seconds are appropriate.
- The InfluxQL duration example subtracted generic time fields. Renamed them to `end_time_seconds` and `start_time_seconds` to make clear that InfluxQL math is operating on numeric field values.
- The Unix timestamp section converted Flux timestamps to seconds, but Grafana datetime units expect epoch milliseconds for numeric values. Changed the conversion to divide nanoseconds by 1,000,000 and clarified the millisecond requirement.
- The complete dashboard's "Next Scheduled Backup" example used a generic `next_run` field with a datetime unit. Renamed the example field to `next_run_ms` to make the required epoch-millisecond format explicit.
- The summary said thresholds should be in milliseconds. Updated it to say thresholds must match the field's numeric unit, such as seconds for `dtdurations` or milliseconds for epoch timestamp values.

## Review Notes
Flux is in maintenance mode in the InfluxDB ecosystem, but it remains documented and supported for InfluxDB versions that expose Flux queries. The post does not specify Grafana or InfluxDB versions, so the fixes target current documented Grafana Stat panel behavior and documented InfluxQL/Flux semantics.
