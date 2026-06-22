# Validation Summary: How to Stream Logs to ClickHouse with Vector and Fluent Bit

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- Vector
- Fluent Bit
- Kubernetes
- TOML configuration
- Fluent Bit classic configuration
- Lua
- SQL
- Mermaid

## Sources Consulted
- Vector ClickHouse sink documentation: https://vector.dev/docs/reference/configuration/sinks/clickhouse/
- Vector route transform documentation: https://vector.dev/docs/reference/configuration/transforms/route/
- Vector aggregate transform documentation: https://vector.dev/docs/reference/configuration/transforms/aggregate/
- Vector log_to_metric transform documentation: https://vector.dev/docs/reference/configuration/transforms/log_to_metric/
- Vector metric_to_log transform documentation: https://vector.dev/docs/reference/configuration/transforms/metric_to_log/
- Vector HTTP server, Kubernetes logs, Syslog, and Docker logs source documentation: https://vector.dev/docs/reference/configuration/sources/
- Fluent Bit HTTP output documentation: https://docs.fluentbit.io/manual/data-pipeline/outputs/http
- Fluent Bit Tail, Systemd, Lua, and Record Modifier documentation: https://docs.fluentbit.io/manual/data-pipeline/
- ClickHouse Vector integration documentation: https://clickhouse.com/docs/integrations/vector
- ClickHouse HTTP interface documentation: https://clickhouse.com/docs/interfaces/http
- ClickHouse MergeTree and data skipping index documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- ClickHouse full-text search text index documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/textindexes
- ClickHouse network ports documentation: https://clickhouse.com/docs/guides/sre/network-ports

## Issues Found
- The Vector ClickHouse sink examples omitted `date_time_best_effort` and `skip_unknown_fields`, which are commonly needed for RFC3339 timestamps and enriched log events sent as JSONEachRow. Added both settings to the main Vector ClickHouse sink.
- The advanced Vector metrics example used the `aggregate` transform directly on log events and included unsupported `group_by` and nested metric configuration. Current Vector documentation defines `aggregate` as a metrics-only transform. Reworked the example to convert logs with `log_to_metric`, aggregate metric events, then convert them back to logs with `metric_to_log` before the ClickHouse sink.
- The Fluent Bit HTTP output enabled TLS while using port `8123`, ClickHouse's default plain HTTP port. Changed the example to port `8443`, the default HTTPS port.
- The ClickHouse table schemas used `tokenbf_v1`, which current ClickHouse documentation marks as deprecated. Replaced the message and path indexes with the current `text` index syntax using `splitByNonAlpha`.
- The Vector tuning snippet used `sinks.clickhouse.request.compression`, but current Vector ClickHouse sink documentation exposes compression as the sink-level `compression` option. Moved gzip compression to the sink-level setting.

## Review Notes
- The `text` index is generally available in ClickHouse 26.2 and newer. Older ClickHouse deployments may still need bloom-filter-based indexes, but those are no longer the current recommended full-text-search path.
- The package-manager install commands are high-level examples. In production, users should configure the official package repositories for Vector and Fluent Bit before using `apt-get` or `yum`.
