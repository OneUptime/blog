# Validation Summary: How to Configure Metrics Retention for Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Telemetry API and standard metrics
- Prometheus TSDB retention and recording rules
- Prometheus Operator `Prometheus` and `PrometheusRule` custom resources
- Thanos sidecar, object storage, compactor, retention, and downsampling
- Kubernetes Deployments and Secrets
- PromQL

## Sources Consulted
- Prometheus storage documentation: https://prometheus.io/docs/prometheus/latest/storage/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus `histogram_quantile()` documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile
- Prometheus HTTP API TSDB status documentation: https://prometheus.io/docs/prometheus/latest/querying/api/#tsdb-stats
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Operator Thanos integration documentation: https://prometheus-operator.dev/docs/platform/thanos/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Telemetry API metrics customization task: https://istio.io/latest/docs/tasks/observability/metrics/telemetry-api/
- Thanos sidecar documentation: https://thanos.io/tip/components/sidecar.md/
- Thanos compactor documentation: https://thanos.io/tip/components/compact.md/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The post said recorded metrics could be kept for 90 days while raw metrics were kept for 15 days without qualifying the storage setup. Prometheus applies retention at the TSDB level, so recording-rule output in the same Prometheus server has the same retention as raw metrics. Updated the text to say longer retention requires long-term storage or a separate Prometheus setup.
- The Prometheus Operator Thanos example used the deprecated `baseImage` field. Updated it to the current `image: quay.io/thanos/thanos:v0.34.0` form while keeping `version` so the operator knows which Thanos version is being configured.
- The Thanos compactor Deployment was missing `spec.template.metadata.labels`, so the Deployment selector would not match the pod template and Kubernetes would reject it. Added matching pod labels.
- The Thanos compactor Deployment referenced `/etc/thanos/thanos.yaml` and `/data` but did not mount the Secret or a data volume. Added the Secret volume, mount, and an `emptyDir` for the compactor data directory.
- The Istio Telemetry API example used `REQUEST_BYTES` and `RESPONSE_BYTES`, which are Prometheus metric concepts but not valid Istio Telemetry metric enum values. Updated them to `REQUEST_SIZE` and `RESPONSE_SIZE`, which map to `istio_request_bytes` and `istio_response_bytes`.

## Review Notes
- The Thanos version in the examples is pinned to `v0.34.0`. The configuration shown is valid for the documented fields, but future readers may want to update the image tag to the version supported by their deployment.
- The Thanos retention tiers are technically valid. Thanos documentation notes that downsampling is primarily for faster long-range queries and may not reduce object storage usage.
