# Validation Summary: How to Configure Metrics Port and Endpoint in Dapr

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (sidecar metrics configuration)
- Kubernetes (Deployments, Services, annotations)
- Prometheus (scrape configuration, relabeling, ServiceMonitor)
- Helm (Dapr chart installation and values)

## Sources Consulted
- Dapr metrics overview documentation (docs.dapr.io/operations/observability/metrics/metrics-overview/)
- Dapr Kubernetes annotations reference (docs.dapr.io/reference/arguments-annotations-overview/)
- Dapr Helm chart source code and values (github.com/dapr/dapr, charts/dapr/values.yaml)
- Dapr source code: `pkg/metrics/exporter.go` (default metrics path `/`), `pkg/metrics/options.go` (default port 9090), `pkg/injector/annotations/annotations.go` (annotation keys)
- Dapr Configuration resource spec (docs.dapr.io/operations/configuration/configuration-overview/)

## Issues Found

1. **Default metrics path was incorrect**: The post claimed the default path is `/metrics`, but Dapr's metrics server serves at the root path `/`. The server responds to any path (so `/metrics` does work), but the actual default is `/`. Fixed the default path references and the curl example.

2. **Per-component Helm values were incorrect**: The post used `dapr_operator.metrics.enabled`, `dapr_operator.metrics.port`, `dapr_sentry.metrics.enabled`, and `dapr_placement.metrics.enabled`. These Helm value paths do not exist. The correct Helm values for metrics are `global.prometheus.enabled` and `global.prometheus.port`, which apply to all control plane components. Fixed the Helm install command.

3. **`dapr_config.metricsEnabled` Helm value does not exist**: The post suggested using `dapr_config: metricsEnabled: false` in Helm values to disable metrics globally. This Helm value does not exist. The correct approach for disabling sidecar metrics globally is to use a Dapr Configuration resource with `spec.metrics.enabled: false`. Replaced the incorrect Helm snippet with a proper Configuration resource YAML.

4. **Log message format was inaccurate**: The expected log output was shown as `INFO metrics server started on :9090`. The actual Dapr log format includes the bind address and trailing path: `level=info msg="metrics server started on 0.0.0.0:9090/"`. Updated to match the actual format.

5. **Summary section updated**: Adjusted the summary paragraph to correctly describe the three levels of configuration (annotation, Configuration resource, Helm global values) instead of just "annotations and Helm values".

## Review Notes
- The Prometheus scrape config and ServiceMonitor examples are well-constructed and technically sound.
- The `dapr.io/metrics-port` and `dapr.io/enable-metrics` annotations are correct and properly demonstrated.
- The metric relabeling example is a valid approach for renaming Dapr metrics in Prometheus.
- The claim that the `dapr_` prefix cannot be changed is effectively correct — there is no configuration option to modify it in the official Dapr distribution.
