# Validation Summary: How to Set Up Cross-Cluster Observability with Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes
- Prometheus
- Thanos
- OpenTelemetry Collector
- Fluent Bit
- Grafana dashboards
- Elasticsearch log output

## Sources Consulted
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio OpenTelemetry tracing documentation: https://istio.io/latest/docs/tasks/observability/distributed-tracing/opentelemetry/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Thanos sidecar documentation: https://thanos.io/v0.36/components/sidecar.md/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Prometheus configuration documentation: https://prometheus.io/docs/operating/configuration/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- Fluent Bit Kubernetes documentation: https://docs.fluentbit.io/manual/installation/kubernetes
- Fluent Bit Elasticsearch output documentation: https://docs.fluentbit.io/manual/pipeline/outputs/elasticsearch
- Prometheus latest release metadata: https://api.github.com/repos/prometheus/prometheus/releases/latest
- Thanos latest release metadata: https://api.github.com/repos/thanos-io/thanos/releases/latest
- OpenTelemetry Collector releases metadata: https://api.github.com/repos/open-telemetry/opentelemetry-collector-releases/releases/latest
- Fluent Bit latest release metadata: https://api.github.com/repos/fluent/fluent-bit/releases/latest

## Issues Found
- The Prometheus StatefulSet was missing `spec.serviceName`, which is required for Kubernetes StatefulSets. Added a headless Service and set `serviceName: prometheus`.
- The Thanos sidecar setup enabled Prometheus lifecycle reloads but not the admin API. Thanos sidecar documentation requires `--web.enable-admin-api` so the sidecar can read Prometheus metadata such as external labels. Replaced the lifecycle flag with the admin API flag.
- The Envoy Prometheus scrape job filtered on the `istio-proxy` container name and then rewrote the target address from a `prometheus.io/port` annotation. Istio's documented custom scrape configuration filters on container port names ending in `-envoy-prom`. Updated the relabeling to match the documented Istio pattern.
- The Istio tracing install snippet set legacy proxy tracing sampling while the post later uses the Telemetry API for sampling. Updated `defaultConfig.tracing` to `{}` so the Telemetry API is the source of sampling configuration.
- Several image pins were stale relative to current upstream releases. Updated Prometheus, Thanos, OpenTelemetry Collector Contrib, and Fluent Bit image tags to current release versions verified from upstream release metadata.

## Review Notes
The snippets are valid YAML/JSON after the fixes. The Thanos Query `--store` endpoints still need reachable cross-cluster DNS or networking in a real deployment, and production deployments should add authentication, TLS, RBAC, retention, resource limits, and backend-specific credentials.
