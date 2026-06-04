# Validation Summary: Build a Log Correlation Pipeline That Links Kubernetes Pod Logs to Trace IDs

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes
- Fluent Bit
- Grafana Loki
- Grafana Tempo
- Grafana data source provisioning and derived fields
- LogQL
- OpenTelemetry for Go, Java, and Python
- Log4j2 Thread Context
- Prometheus exemplars

## Sources Consulted
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Go trace package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/trace
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Java API documentation: https://opentelemetry.io/docs/languages/java/api/
- Apache Log4j2 Thread Context documentation: https://logging.apache.org/log4j/2.x/manual/thread-context.html
- Fluent Bit parser filter documentation: https://docs.fluentbit.io/manual/data-pipeline/filters/parser
- Fluent Bit Loki output documentation: https://docs.fluentbit.io/manual/data-pipeline/outputs/loki
- Grafana Loki storage documentation: https://grafana.com/docs/loki/latest/configure/storage/
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/
- Grafana Loki structured metadata documentation: https://grafana.com/docs/loki/latest/get-started/labels/structured-metadata/
- Grafana Loki data source provisioning documentation: https://grafana.com/docs/grafana/latest/datasources/loki/
- Grafana Tempo trace-to-logs documentation: https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/configure-trace-to-logs/
- Grafana Tempo data source provisioning documentation: https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/provision/
- Grafana exemplars documentation: https://grafana.com/docs/grafana/latest/fundamentals/exemplars/
- Prometheus configuration documentation: https://prometheus.io/docs/operating/configuration/

## Issues Found
- The Go example imported `go.opentelemetry.io/otel` but did not use it, which would make the snippet fail to compile. Removed the unused import.
- The Java Log4j2 example wrote trace IDs to `ThreadContext` without clearing them. Replaced direct `ThreadContext.put` calls with `CloseableThreadContext` so the MDC values are scoped to the log operation.
- The Fluent Bit pipeline parsed Kubernetes metadata before parsing JSON log content and then attempted to lift a nested `log` object that would not exist in that form. Reordered and simplified the filters so JSON fields are parsed from `log`, Kubernetes metadata is added, and trace IDs are normalized by Lua.
- The Fluent Bit output used `Label_keys` for `trace_id` and `span_id`, which would create high-cardinality Loki streams. Changed those IDs to Loki structured metadata and kept only low-cardinality labels such as `job` and `namespace`.
- The Loki configuration used `boltdb-shipper` with schema `v11`, plus a removed `enforce_metric_name` setting and a non-existent Loki `tempo` configuration block. Updated the example to TSDB with schema `v13` and enabled structured metadata in `limits_config`.
- The LogQL examples treated trace IDs and log levels as stream labels. Updated the queries to use structured metadata filters and JSON pipeline parsing where needed.
- The Grafana data links example used a non-standard JSON shape instead of Grafana data source provisioning. Replaced it with Loki `derivedFields` provisioning that links trace IDs to the Tempo data source.
- The Tempo backend configuration incorrectly attempted to configure log links through Tempo overrides. Replaced it with Grafana Tempo data source `tracesToLogsV2` provisioning, which is where trace-to-log navigation is configured.
- The exemplars section attempted to remote-write Prometheus metrics to Tempo and implied exemplars are a Loki feature. Updated it to show Prometheus exemplar storage and OpenMetrics scraping for metric-to-trace correlation.
- Best-practice and troubleshooting text recommended indexing trace IDs in Loki. Updated the guidance to store trace IDs as structured metadata instead.

## Review Notes
The post is now technically consistent with current Grafana Loki guidance, but exact Fluent Bit parser names such as `docker` depend on the deployed Fluent Bit image and parser file configuration. In a production-ready manifest, the parser definitions and service account/RBAC for the Kubernetes filter should be included explicitly.
