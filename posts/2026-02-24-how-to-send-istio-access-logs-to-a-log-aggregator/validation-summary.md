# Validation Summary: How to Send Istio Access Logs to a Log Aggregator

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio access logging and Telemetry API
- Envoy access logs and OpenTelemetry ALS
- Kubernetes node-level log collection
- Fluent Bit
- Grafana Loki and Grafana Alloy
- OpenTelemetry Collector
- Elasticsearch

## Sources Consulted
- Istio Envoy Access Logs documentation: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio OpenTelemetry access log provider documentation: https://istio.io/latest/docs/tasks/observability/logs/otel-provider/
- Istio MeshConfig extension provider reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Kubernetes Logging Architecture documentation: https://kubernetes.io/docs/concepts/cluster-administration/logging/
- Fluent Bit Kubernetes filter documentation: https://docs.fluentbit.io/manual/data-pipeline/filters/kubernetes/
- Fluent Bit Tail input documentation: https://docs.fluentbit.io/manual/3.2/pipeline/inputs/tail
- Fluent Bit Elasticsearch output documentation: https://docs.fluentbit.io/manual/data-pipeline/outputs/elasticsearch
- Grafana Alloy loki.source.file documentation: https://grafana.com/docs/alloy/latest/reference/components/loki.source.file/
- Grafana Alloy loki.process documentation: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.process/
- Grafana Loki OpenTelemetry ingestion documentation: https://grafana.com/docs/loki/latest/send-data/otel/
- OpenTelemetry Collector Elasticsearch exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/elasticsearchexporter

## Issues Found
- The introduction said Istio access logs are written to stdout by default. Istio access logging must be enabled unless using a profile that enables it, so the wording now says stdout applies when access logging is enabled with the default Envoy provider.
- The Fluent Bit example used the Docker parser only. Modern Kubernetes clusters commonly use CRI/containerd log format, so the Tail input now uses the built-in `docker, cri` multiline parsers.
- The Fluent Bit Elasticsearch example set `Type _doc`. Elasticsearch 8 no longer supports mapping types, so the output now uses `Suppress_Type_Name On`.
- The Loki section used Promtail as a current recommendation. Promtail reached end of life on March 2, 2026, so the example now uses Grafana Alloy.
- The Loki file-tail example parsed container log files without first handling the CRI wrapper. The Alloy pipeline now includes `stage.cri {}` before parsing the Istio access log content.
- The OpenTelemetry Collector example used a `loki` exporter configuration that is no longer present in current OpenTelemetry Collector Contrib. The Loki exporter was replaced with `otlphttp/loki` targeting Loki's native OTLP endpoint.
- The metadata tag said `Fluentd` even though the post uses Fluent Bit. The tag was corrected to `Fluent Bit`.

## Review Notes
- The Fluent Bit example still uses classic configuration format, which Fluent Bit documentation says is scheduled for deprecation at the end of 2026. It is currently valid, but future updates should consider the YAML pipeline format.
- The DaemonSet examples are intentionally minimal and omit production hardening such as RBAC, resource limits, TLS/authentication, and pinned image versions.
