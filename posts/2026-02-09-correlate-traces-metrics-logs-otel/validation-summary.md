# Validation Summary: How to Correlate Traces Metrics and Logs Using OpenTelemetry Resource Attributes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Go SDK
- OpenTelemetry semantic conventions
- OpenTelemetry Collector
- Kubernetes Downward API
- Grafana Tempo
- Grafana Loki
- Grafana dashboards and data source provisioning
- Prometheus remote write
- Python validation with requests and prometheus-api-client

## Sources Consulted
- OpenTelemetry Go resource documentation: https://opentelemetry.io/docs/languages/go/resources/
- OpenTelemetry service semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/service/
- OpenTelemetry Kubernetes semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/k8s/
- OpenTelemetry deployment semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/deployment-environment/
- OpenTelemetry Go semconv package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/semconv/v1.37.0
- OpenTelemetry Go attribute package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/attribute
- OpenTelemetry Kubernetes Attributes Processor documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry Collector Prometheus Remote Write exporter README: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/main/exporter/prometheusremotewriteexporter/README.md
- Prometheus remote write receiver documentation: https://prometheus.io/docs/prometheus/latest/querying/api/#remote-write-receiver
- OpenTelemetry Collector Transform Processor README: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/main/processor/transformprocessor/README.md
- Grafana Loki OpenTelemetry ingestion documentation: https://grafana.com/docs/loki/latest/send-data/otel/
- Grafana Tempo data source provisioning documentation: https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/provision/
- Grafana trace-to-logs correlation documentation: https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/configure-trace-to-logs/
- Grafana Tempo TraceQL documentation: https://grafana.com/docs/tempo/latest/traceql/construct-traceql-queries/
- Grafana Loki LogQL documentation: https://grafana.com/docs/loki/latest/logql/

## Issues Found
- The Go resource example used the older `semconv/v1.21.0` package and `DeploymentEnvironment`. Updated the example to `semconv/v1.37.0` and `DeploymentEnvironmentName`, matching current semantic convention naming for `deployment.environment.name`.
- The `slog` logging example was missing required imports for `context`, `attribute`, and OpenTelemetry trace APIs. Added the imports so the snippet is syntactically complete.
- The logging example used `attr.Value.AsString()`, which is only correct for string values. Updated it to `attr.Value.Emit()` so detected non-string resource attributes are rendered safely.
- The Collector example used the deprecated `prometheusremotewrite` component name. Updated it to `prometheus_remote_write` and changed the pipeline reference accordingly.
- The Prometheus queries assumed resource attributes were available as metric labels, but the Prometheus Remote Write exporter does not expose them that way by default. Enabled `resource_to_telemetry_conversion` so labels such as `service_name` and `service_instance_id` are present as used later in the post.
- The Prometheus Remote Write endpoint example did not mention that Prometheus must enable its remote write receiver. Added a config comment noting the required `--web.enable-remote-write-receiver` flag.
- The Loki Collector example used the deprecated Loki exporter-style configuration with `labels.resource`. Updated it to the currently documented `otlphttp` exporter pointed at Loki's OTLP endpoint.
- The Grafana Tempo provisioning example used the older `tracesToLogs` and `mappedTags` format. Updated it to the documented `tracesToLogsV2` format with tag mappings in the `tags` list.
- Several examples used `k8s_pod` as a normalized Loki/Prometheus label for `k8s.pod.name`. Updated these to `k8s_pod_name`, matching the documented dot-to-underscore normalization.
- The Loki examples queried `level` and `trace_id` as if they were stream labels or logfmt fields, while the Go logger emits JSON. Updated the LogQL examples and derived field regex to parse the JSON log body.
- The TraceQL dashboard query used compact syntax that was less consistent with current examples. Updated it to the documented spacing form.
- The Python validation snippet imported `json` but did not use it. Removed the unused import.

## Review Notes
- The examples assume application logs are exported to the Collector as OpenTelemetry logs. If logs are only written to stdout with `slog`, a filelog or Kubernetes log collection path would still be needed in a real deployment.
- Promoting all resource attributes to Prometheus labels is convenient for the tutorial, but it can increase cardinality. Production configurations should select only the resource attributes needed for queries and joins.
- Loki's current OpenTelemetry guidance supports native OTLP ingestion and structured metadata. High-cardinality attributes such as pod name and service instance ID should be used carefully as labels in production.
