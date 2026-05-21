# Validation Summary: How to Configure Telemetry for Multi-Cluster Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Istio Telemetry API
- Istio multi-cluster mesh configuration
- OpenTelemetry Collector
- Prometheus
- Thanos
- Kubernetes
- Helm
- Python HTTP request header propagation

## Sources Consulted
- Istio multi-primary multi-cluster installation documentation: https://istio.io/latest/docs/setup/install/multicluster/multi-primary/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio custom metrics documentation: https://istio.io/latest/docs/tasks/observability/metrics/customize-metrics/
- Istio OpenTelemetry tracing documentation: https://istio.io/latest/docs/tasks/observability/distributed-tracing/opentelemetry/
- Istio distributed tracing overview and header propagation guidance: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector receivers and processors documentation: https://opentelemetry.io/docs/collector/components/receiver/ and https://opentelemetry.io/docs/collector/components/processor/
- Thanos sidecar documentation: https://thanos.io/tip/components/sidecar.md/
- Thanos releases: https://github.com/thanos-io/thanos/releases
- Prometheus download and release information: https://prometheus.io/download/
- Helm install and value override documentation: https://helm.sh/docs/helm/helm_install/ and https://helm.sh/docs/intro/using_helm/

## Issues Found
- The Istio install examples used `meshConfig.defaultConfig.extraStatTags` and `ISTIO_META_CLUSTER_ID` to create a custom `cluster_name` metric label. `extraStatTags` is deprecated in current Istio, and Istio standard metrics already include `source_cluster` and `destination_cluster` labels from `global.multiCluster.clusterName`. I removed the deprecated configuration and replaced the custom Telemetry example with the built-in labels.
- The metric verification command searched for `cluster_name`, which no longer matched the corrected metric guidance. I changed it to check for `source_cluster` or `destination_cluster`.
- The OpenTelemetry tracing provider example did not explicitly enable tracing in `meshConfig`. I added `enableTracing: true`, matching Istio's OpenTelemetry tracing examples.
- The Prometheus StatefulSet example omitted required `apps/v1` StatefulSet fields (`serviceName`, selector, and matching pod labels). I added those fields so the Kubernetes object shape is valid.
- The Prometheus and Thanos image tags were outdated for a 2026 guide. I updated Prometheus to `prom/prometheus:v3.11.3` and Thanos to `thanosio/thanos:v0.41.0` based on current release information.
- The Helm `--set` example for `query.stores` used JSON-like square brackets with `--set`. Helm documents list values with brace syntax or indexed list syntax, so I changed the command to use brace list syntax.

## Review Notes
The OpenTelemetry Collector example uses `prometheusremotewrite`, which is a contrib Collector component. Users should run a Collector distribution that includes that exporter. The Kubernetes snippets are still illustrative and omit environment-specific resources such as storage, RBAC, ConfigMap mounts, Services for Prometheus and Thanos sidecars, and object storage credentials.
