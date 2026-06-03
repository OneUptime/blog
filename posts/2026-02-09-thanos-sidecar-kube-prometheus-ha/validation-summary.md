# Validation Summary: How to Implement Thanos Sidecar with kube-prometheus-stack for HA Metrics

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Thanos Sidecar, Query, Store Gateway, and Compactor
- Prometheus and Prometheus Operator
- kube-prometheus-stack Helm chart
- Kubernetes Deployments, StatefulSets, Services, Secrets, and ServiceMonitors
- Grafana Prometheus datasource configuration
- S3 and Google Cloud Storage object storage configuration

## Sources Consulted
- Thanos Sidecar documentation: https://thanos.io/tip/components/sidecar.md/
- Thanos Query documentation: https://thanos.io/tip/components/query.md/
- Thanos Store Gateway documentation: https://thanos.io/tip/components/store.md/
- Thanos Compactor documentation: https://thanos.io/tip/components/compact.md/
- Thanos object storage documentation: https://thanos.io/tip/thanos/storage.md
- Prometheus Operator Thanos integration guide: https://prometheus-operator.dev/docs/platform/thanos/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- kube-prometheus-stack values.yaml: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml
- kube-prometheus-stack Prometheus template: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/templates/prometheus/prometheus.yaml
- kube-prometheus-stack Thanos sidecar Service and ServiceMonitor templates: https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack/templates/prometheus

## Issues Found
- The kube-prometheus-stack Thanos object storage values used the raw Prometheus Operator `SecretKeySelector` shape. Updated it to the current chart schema using `objectStorageConfig.existingSecret.name` and `objectStorageConfig.existingSecret.key`.
- The sidecar example used `replica: $(POD_NAME)` as an external label. Replaced it with `replicaExternalLabelName: prometheus_replica`, which is the supported Prometheus Operator mechanism for per-replica external labels.
- The post set `disableCompaction: false` while configuring sidecar block uploads. Changed it to `true` because Thanos sidecar uploads require uncompacted Prometheus blocks; Prometheus Operator also auto-disables compaction when object storage upload is configured.
- Removed the Thanos sidecar `volumeMounts` override. Prometheus Operator manages the sidecar data mount; the additional `prometheus-data` mount could refer to a nonexistent volume.
- Updated Thanos images and sidecar version from `v0.34.0` to `v0.41.0`, the current upstream release line found during review.
- The Thanos Query discovery endpoint pointed at `prometheus-operated`, not the kube-prometheus-stack Thanos sidecar discovery Service. Updated it to the chart-generated Thanos discovery service name for the Helm release shown in the article.
- The custom Thanos Query and Store Gateway Services did not have labels, so the ServiceMonitor selectors would not match them. Added matching `app` labels to those Services.
- The Thanos Compactor ServiceMonitor targeted a Service that did not exist. Added a `thanos-compactor` Service exposing the HTTP metrics port.
- Added `jobLabel: app` to the custom Thanos ServiceMonitors so alert expressions such as `job="thanos-compactor"` match the intended scrape job.
- Adjusted the sidecar-down alert to match kube-prometheus-stack's generated sidecar ServiceMonitor job naming with a regex.

## Review Notes
- The YAML snippets were parsed successfully after edits.
- `helm` and `kubectl` were not installed in the review environment, so commands were verified against official documentation and chart templates rather than executed locally.
- The Thanos sidecar discovery Service name depends on Helm release naming, chart fullname truncation, and any `fullnameOverride`; the example now matches the default rendered fullname for `helm upgrade --install prometheus-stack prometheus-community/kube-prometheus-stack`.
