# Validation Summary: How to Deploy Thanos on Rancher for Long-Term Metrics

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Monitoring
- Kubernetes
- Prometheus
- Prometheus Operator
- kube-prometheus-stack
- Thanos
- Helm
- Grafana
- Amazon S3-compatible object storage

## Sources Consulted
- Prometheus storage documentation: https://prometheus.io/docs/prometheus/latest/storage/
- Prometheus command-line reference: https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- Thanos sidecar documentation: https://thanos.io/tip/components/sidecar.md/
- Thanos object storage documentation: https://thanos.io/tip/thanos/storage.md/
- Prometheus Operator Thanos guide: https://prometheus-operator.dev/docs/platform/thanos/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- kube-prometheus-stack values: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml
- kube-prometheus-stack Thanos sidecar service template: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/templates/prometheus/serviceThanosSidecar.yaml
- Bitnami Thanos chart values: https://github.com/bitnami/charts/blob/main/bitnami/thanos/values.yaml

## Issues Found
- The Prometheus sidecar values used an outdated schema. `baseImage` is deprecated in the Prometheus Operator API, and the chart values now render `objectStorageConfig` from `prometheus.prometheusSpec.thanos.objectStorageConfig.existingSecret`. I updated the snippet to use `image`, `version`, and `existingSecret`.
- The post enabled a Thanos sidecar on Prometheus but did not expose or discover that sidecar from Thanos Query. As written, the query layer would only connect to Store Gateway. I enabled `prometheus.thanosService` and switched the Thanos Query example to DNS-based sidecar discovery.
- The Bitnami Thanos values placed object store secret references under `storegateway.objstoreConfig` and `compactor.objstoreConfig`, which does not match the current chart. I replaced those blocks with the chart’s supported top-level `existingObjstoreSecret`.
- The post omitted `enableAdminAPI: true`, which Thanos sidecar requires to read Prometheus metadata such as external labels. I added `enableAdminAPI` and a unique `externalLabels` example.
- The introduction and conclusion described Thanos retention as “unlimited,” which is overstated. Official documentation describes it as potentially unlimited depending on object storage. I corrected that wording.
- The S3 example used a generic AWS endpoint. I changed it to a regional endpoint to match the current Thanos S3 configuration examples more closely.

## Review Notes
- The example `sidecarsService: rancher-monitoring-thanos-discovery` assumes the Prometheus release name is `rancher-monitoring`. The inline comment now calls out that this must be changed when the release name differs.
- The post title is Rancher-specific, but the corrected Prometheus values are specifically for Rancher Monitoring / `kube-prometheus-stack`, which is now stated in the prerequisites and Step 3.
- The post now pins the sidecar example to `v0.39.2`, which matched the current Bitnami Thanos chart defaults at review time on 2026-05-01.
