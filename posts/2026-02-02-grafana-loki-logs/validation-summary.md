# Validation Summary: How to Use Grafana Loki for Logs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Loki (2.9.4)
- LogQL
- Promtail (2.9.4)
- Grafana (10.3.1)
- Docker / Docker Compose
- Fluent Bit (as an alternative log shipper)
- OpenTelemetry (Python logging instrumentation, for log-trace correlation)
- Grafana Tempo (referenced as a derived-fields target)

## Sources Consulted
- Loki LogQL metric queries reference: https://grafana.com/docs/loki/latest/query/metric_queries/
- Loki HTTP API reference: https://grafana.com/docs/loki/latest/reference/loki-http-api/
- Loki schema/storage and TSDB migration: https://grafana.com/docs/loki/latest/operations/storage/schema/ and https://grafana.com/docs/loki/latest/setup/migrate/migrate-to-tsdb/
- Loki configuration reference (limits_config, compactor, ingester): https://grafana.com/docs/loki/latest/configure/
- Promtail pipeline stages: https://grafana.com/docs/loki/latest/clients/promtail/stages/
- Fluent Bit Loki output plugin: https://docs.fluentbit.io/manual/data-pipeline/outputs/loki
- Grafana data source provisioning: https://grafana.com/docs/grafana/latest/administration/provisioning/

## Issues Found

1. **Invalid LogQL `histogram_over_time` function (Response Time Heatmap section).** The query used `histogram_over_time(duration [5m])` chained after `unwrap duration`. LogQL has no such function, and the chained syntax is malformed (unwrapped range functions take the unwrapped value implicitly). Replaced with a valid `quantile_over_time(0.95, ... | unwrap duration [5m]) by (path)` query, which is the canonical Loki idiom for latency analysis.

2. **`absent()` used instead of `absent_over_time()` (NoLogsReceived alert).** LogQL does not implement the Prometheus instant-vector `absent()`; it only supports `absent_over_time()` on a log range. The redundant `or rate(...) == 0` clause was also dropped — `absent_over_time` alone covers the "no logs received" case.

3. **Incorrect description of `bytes_over_time`.** The post claimed it "sums a numeric field across the time range." Per official docs, it measures the byte size of log entries in the range (not extracted fields — for that you would use `sum_over_time(... | unwrap <field> ...)`). Fixed the comment and simplified the example to remove the unnecessary `| json | __error__=""` filter.

4. **Invalid Fluent Bit Loki output options.** Removed `Batch_Size 10485760` and `Timeout 10`. These are not documented options of the official Fluent Bit `loki` output plugin (they belong to the separate community `grafana-loki` plugin, or are covered by core `net.*` options). The remaining options (`Labels`, `Label_keys`, `Remove_keys`, `Line_Format`, `Host`, `Port`, `Match`) are all valid.

## Review Notes

- The Advanced Pipeline Stages example adds `request_id` and `user_id` as Promtail labels, which directly contradicts the Label Cardinality Management guidance later in the post (those are exactly the kinds of unique-per-request values that blow up cardinality). The post does call this out as bad practice in the Production Best Practices section, but the contradiction is not made explicit in the pipeline example itself. Left as-is — the syntax shown is correct, and the author explicitly addresses it later — but a future revision could add a "demonstration only" caveat in the advanced example.
- Loki 2.9.4 is referenced throughout. As of this review (2026-06), Loki 3.x is the current major line and is the recommended version for new deployments. The TSDB + `schema: v13` configuration shown is forward-compatible with 3.x, so the guidance is not broken — just version-specific. Consider bumping image tags in a future update.
- The Python OpenTelemetry example calls `LoggingInstrumentor().instrument(set_logging_format=True)` and then immediately overrides logging with `logging.basicConfig(format=...)`. The `set_logging_format=True` flag is therefore effectively no-op here. This is not technically incorrect but is somewhat redundant; an explicit `set_logging_format=False` would make the intent clearer.
- The Grafana derived-field URL `"$${__value.raw}"` is correct YAML escaping for Grafana provisioning (the `$$` is consumed by Docker Compose / env interpolation if applicable; Grafana receives `${__value.raw}`). Worth noting that if not running under Compose env interpolation, a single `$` would suffice — but `$$` is safe in either context.
