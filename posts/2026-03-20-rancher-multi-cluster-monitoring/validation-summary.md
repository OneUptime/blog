# Validation Summary: How to Set Up Multi-Cluster Monitoring in Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Monitoring
- Kubernetes
- Prometheus
- Prometheus Operator
- Grafana
- Thanos
- Helm

## Sources Consulted
- Rancher Monitoring chart source and values: https://github.com/rancher/charts/tree/dev-v2.14/charts/rancher-monitoring/109.0.0%2Bup80.9.1-rancher.5
- Rancher Monitoring chart values: https://raw.githubusercontent.com/rancher/charts/dev-v2.14/charts/rancher-monitoring/109.0.0+up80.9.1-rancher.5/values.yaml
- Rancher Monitoring Prometheus template: https://raw.githubusercontent.com/rancher/charts/dev-v2.14/charts/rancher-monitoring/109.0.0+up80.9.1-rancher.5/templates/prometheus/prometheus.yaml
- Rancher Monitoring Thanos sidecar service template: https://raw.githubusercontent.com/rancher/charts/dev-v2.14/charts/rancher-monitoring/109.0.0+up80.9.1-rancher.5/templates/prometheus/serviceThanosSidecar.yaml
- Rancher Monitoring Grafana datasource template: https://raw.githubusercontent.com/rancher/charts/dev-v2.14/charts/rancher-monitoring/109.0.0+up80.9.1-rancher.5/templates/grafana/configmaps-datasources.yaml
- Prometheus federation documentation: https://prometheus.io/docs/prometheus/latest/federation/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Thanos sidecar documentation: https://thanos.io/tip/components/sidecar.md/
- Thanos object storage documentation: https://thanos.io/tip/thanos/storage.md/
- Bitnami Thanos chart README: https://github.com/bitnami/charts/blob/main/bitnami/thanos/README.md
- Bitnami Thanos chart values: https://raw.githubusercontent.com/bitnami/charts/main/bitnami/thanos/values.yaml

## Issues Found
- The federation examples targeted downstream Kubernetes service DNS names that would not be reachable from a different cluster by default. I changed them to externally routable placeholder endpoints and clarified that the central cluster must be able to reach them.
- The downstream Rancher Monitoring install did not set a `cluster` external label, even though the dashboards and alerts aggregate by `cluster` and Thanos relies on external labels for cross-cluster identity. I added `prometheus.prometheusSpec.externalLabels.cluster`.
- The post did not expose the downstream Thanos sidecars for cross-cluster gRPC access. I enabled `prometheus.thanosServiceExternal.enabled` in the install example so the central Thanos Query has a concrete exposure path.
- The Thanos sidecar patch used the wrong Prometheus CRD shape for `objectStorageConfig` by nesting `name` and `key` under `secret`. I corrected it to the `SecretKeySelector` structure required by the Prometheus Operator API.
- The Thanos sidecar patch specified an explicit image but omitted `spec.thanos.version`, which the Prometheus Operator API requires for Thanos configuration. I added the version field and aligned it with the example image tag.
- The central Thanos install referenced a Store Gateway endpoint without enabling Store Gateway or supplying object storage config to the chart. I updated the example to pass `objstoreConfig`, enable `storegateway`, and keep only the static downstream sidecar stores.

## Review Notes
- The post’s `kubectl patch` examples are valid, but chart-managed Helm values are usually easier to preserve across future Rancher Monitoring upgrades than direct runtime patches to the Prometheus custom resource.
- The guide still assumes network connectivity, DNS, and any required TLS or authentication are handled for the central cluster to reach downstream Prometheus and Thanos endpoints.
