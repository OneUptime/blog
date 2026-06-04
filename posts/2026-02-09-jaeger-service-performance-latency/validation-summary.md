# Validation Summary: How to Use Jaeger Service Performance Monitoring to Detect K8s Latency

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Jaeger Service Performance Monitoring
- OpenTelemetry Collector spanmetrics connector
- Prometheus and PromQL
- Grafana dashboards
- Python
- GitHub Actions

## Sources Consulted
- Jaeger Service Performance Monitoring documentation: https://www.jaegertracing.io/docs/2.19/architecture/spm/
- OpenTelemetry Collector spanmetrics connector v0.92.0 documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/v0.92.0/connector/spanmetricsconnector
- OpenTelemetry Collector Prometheus exporter v0.92.0 documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.92.0/exporter/prometheusexporter/README.md
- Prometheus histogram_quantile documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile
- GitHub Actions checkout documentation: https://github.com/actions/checkout

## Issues Found
- The post described SPM as directly identifying baseline threshold regressions. Jaeger SPM produces RED metrics; Prometheus alerts or other logic perform threshold regression detection. Updated the wording to distinguish metric generation from alerting.
- The deployment section referred to a spanmetrics processor. In OpenTelemetry Collector v0.92.0, this is the spanmetrics connector. Updated the text.
- The examples used the old `latency` metric name and `operation` label. The spanmetrics connector changed these to `duration` and `span.name`, which the Prometheus exporter exposes as `duration_milliseconds_bucket` and `span_name`. Updated alert, dashboard, and Python queries accordingly.
- The Prometheus scrape relabel configuration used only the pod port annotation while the regex expected both address and port. Added `__address__` to `source_labels`.
- The OpenTelemetry Collector config used the short `CUMULATIVE` value for `aggregation_temporality`. Updated it to `AGGREGATION_TEMPORALITY_CUMULATIVE`, matching the v0.92.0 connector documentation.
- The OpenTelemetry Collector deployment was named like a Jaeger collector and forwarded OTLP to `jaeger-collector:14250`, which is not an OTLP endpoint and conflicted with the same deployment name. Renamed the collector resources to `otel-collector` and changed the OTLP exporter endpoint to `jaeger:4317`.
- The PromQL histogram queries did not aggregate buckets before calling `histogram_quantile`, which could split results by status code or custom dimensions. Added `sum(rate(...)) by (le, service_name, span_name)` where latency percentiles are computed.
- The GitHub Actions example used `actions/checkout@v3`, which is outdated. Updated it to `actions/checkout@v5`.
- The Python script hard-coded an in-cluster Prometheus DNS name, which would not work from a GitHub-hosted runner. Updated it to read `PROMETHEUS_URL`, default to localhost, and adjusted the workflow to port-forward Prometheus before running the script.

## Review Notes
- The example still assumes a Jaeger OTLP endpoint available as `jaeger:4317` and a Prometheus Service named `prometheus` in the `observability` namespace. Those names may need to match the reader's actual Helm chart or manifests.
- The post pins `otel/opentelemetry-collector-contrib:0.92.0`; newer Collector releases may have additional spanmetrics behavior changes, especially around duration units.
