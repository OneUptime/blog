# Validation Summary: How to Show 'X Time Ago' in Grafana with InfluxDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana dashboards and panels
- Grafana Stat and Table visualizations
- Grafana transformations and value mappings
- Grafana field units and date/time formatting
- InfluxDB Flux
- InfluxQL
- Prometheus-style alerting rules

## Sources Consulted
- Grafana standard field options and date/time units: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/configure-standard-options/
- Grafana transformations, including Add field from calculation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/query-transform-data/transform-data/
- Grafana value mappings: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/configure-value-mappings/
- Grafana dashboard variables and time range variables: https://grafana.com/docs/grafana/latest/visualizations/dashboards/variables/add-template-variables/
- InfluxDB Flux now() function: https://docs.influxdata.com/flux/v0/stdlib/universe/now/
- InfluxDB Flux int() and uint() conversions: https://docs.influxdata.com/flux/v0/stdlib/universe/int/ and https://docs.influxdata.com/flux/v0/stdlib/universe/uint/
- InfluxDB Flux time type documentation: https://docs.influxdata.com/flux/v0/data-types/basic/time/
- InfluxDB Flux last(), array.from(), union(), sort(), and limit() functions: https://docs.influxdata.com/flux/v0/stdlib/universe/last/, https://docs.influxdata.com/flux/v0/stdlib/array/from/, https://docs.influxdata.com/flux/v0/stdlib/universe/union/, and https://docs.influxdata.com/influxdb/v2/query-data/flux/sort-limit/
- InfluxQL LAST() selector documentation: https://docs.influxdata.com/influxdb/v1/query_language/functions/
- Prometheus alerting rules: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
- The first Flux example created an unused `lastEvent` record and then queried only the last minute, which could miss the event it was trying to measure. I removed the unused variable and used the same 30-day range for the calculation query.
- The InfluxQL example attempted to select `time AS last_time` alongside `last("value")`. InfluxQL returns the timestamp in the result `time` column for selector queries, so I removed the invalid projection and clarified the behavior.
- The Grafana transformation example used an undocumented `$__now` variable and subtracted in the wrong direction for a positive "time ago" duration. I changed it to use `$__to` in epoch milliseconds and subtract the timestamp field from it.
- The transformation query returned only `_time`; the binary calculation needs a numeric timestamp field. I added `last_successful_ms` in the Flux query.
- Two Flux snippets imported `date` without using it. I removed the unused imports.
- A value mapping used `${__value.text}` as mapping output text. Grafana value mappings replace the value with configured text and do not use that syntax for re-inserting the formatted value, so I replaced it with static descriptive text.
- The missing-data Flux example used `if exists data._value`, but `data` is a stream of tables, not a record. I replaced it with a `union()` pattern that adds a default row and selects the newest row.
- The alert example was labeled as a Grafana alert rule, but the YAML shape is a Prometheus-style alerting rule. I changed the heading and description to make the scope accurate.

## Review Notes
The `dateTimeFromNow` examples correctly use epoch milliseconds, which matches Grafana's date/time unit expectations. The panel JSON snippets are partial examples rather than complete importable dashboard JSON; future revisions could state that explicitly.
