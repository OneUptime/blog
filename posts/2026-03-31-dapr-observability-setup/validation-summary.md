# Validation Summary: How to Set Up Dapr Observability with Tracing, Metrics, and Logs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar architecture, Configuration CRD)
- OpenTelemetry Collector
- Jaeger / Zipkin (distributed tracing backends)
- Prometheus (metrics scraping)
- Grafana (dashboards)
- Fluentd (log shipping)
- Elasticsearch (log storage)
- Kubernetes (deployments, ConfigMaps, annotations)

## Sources Consulted
- Dapr observability documentation: https://docs.dapr.io/operations/observability/
- Dapr tracing configuration: https://docs.dapr.io/operations/observability/tracing/setup-tracing/
- Dapr metrics documentation: https://docs.dapr.io/operations/observability/metrics/
- Dapr logging documentation: https://docs.dapr.io/operations/observability/logging/
- OpenTelemetry Collector contrib changelog (jaeger exporter removal in v0.86.0): https://github.com/open-telemetry/opentelemetry-collector-contrib/releases
- OpenTelemetry Collector debug exporter docs: https://github.com/open-telemetry/opentelemetry-collector/tree/main/exporter/debugexporter
- Jaeger OTLP support documentation: https://www.jaegertracing.io/docs/latest/apis/#opentelemetry-protocol-stable
- Prometheus relabel_configs documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#relabel_config
- Grafana HTTP API for dashboard import: https://grafana.com/docs/grafana/latest/developers/http_api/dashboard/

## Issues Found

### 1. Deprecated `jaeger` exporter in OTel Collector config
**What was wrong:** The OTel Collector configuration used the `jaeger` exporter with endpoint port `14250`. The Jaeger exporter was removed from the OpenTelemetry Collector contrib distribution in v0.86.0 (August 2023). Jaeger natively supports OTLP ingestion since v1.35.
**What was changed:** Replaced `jaeger` exporter with `otlp/jaeger` exporter targeting Jaeger's OTLP endpoint on port `4317`.
**Why:** The old exporter no longer exists in current OTel Collector builds and would cause a startup error.

### 2. Deprecated `logging` exporter in OTel Collector config
**What was wrong:** The config used the `logging` exporter with a `loglevel: debug` field. This exporter was renamed to `debug` and the `loglevel` field was renamed to `verbosity` in OTel Collector v0.86.0.
**What was changed:** Replaced `logging` exporter with `debug` exporter and `loglevel: debug` with `verbosity: detailed`.
**Why:** Using the old name produces deprecation warnings or errors in current OTel Collector versions.

### 3. Broken Prometheus relabel configuration
**What was wrong:** The relabel config had two rules that both set `__address__`. The first rule replaced `__address__` with just the value of the `dapr.io/metrics-port` annotation (e.g., "9090"), which is not a valid scrape target (missing IP). The second rule then overwrote `__address__` with `pod_ip:9090`, making the first rule useless and hardcoding the port regardless of the annotation value.
**What was changed:** Replaced both rules with a single rule that combines `__meta_kubernetes_pod_ip` and `__meta_kubernetes_pod_annotation_dapr_io_metrics_port` using a `:` separator, correctly forming `ip:port` from the annotation.
**Why:** The original config would either fail to scrape (if only the first rule ran) or ignore the metrics-port annotation entirely.

### 4. Invalid Grafana dashboard import command
**What was wrong:** The post used `kubectl apply -f` on a Grafana dashboard JSON file. Grafana dashboards are not Kubernetes resources and cannot be applied with `kubectl`. The URL path also may not exist in the Dapr repo.
**What was changed:** Updated the instructions to import dashboards via the Grafana UI or HTTP API, with a `curl` example targeting the Grafana dashboard API endpoint.
**Why:** `kubectl apply` would fail with a parsing error on non-Kubernetes JSON.

## Review Notes
- The Dapr metric names in the metrics table (e.g., `dapr_http_server_request_count`, `dapr_component_pubsub_ingress_count`) are broadly representative but exact names may vary between Dapr versions. Readers should check `curl localhost:9090/metrics` on their sidecar to confirm available metrics.
- The Grafana dashboard ID `12269` should be verified on grafana.com/grafana/dashboards as community dashboards can be updated or removed over time.
- The JSON log format example shows fields like `method`, `resource`, `status`, and `elapsed` which are specific to API logging (`dapr.io/enable-api-logging: "true"`). Standard sidecar logs will not include these fields unless API logging is enabled. The post does mention API logging later, but the log example appears before that section.
