# Validation Summary: How to Deploy Thanos on Rancher for Long-Term Metrics - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Rancher Monitoring
- Kubernetes
- Prometheus Operator
- Thanos
- Helm
- Grafana
- Amazon S3

## Sources Consulted
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Operator Thanos guide: https://prometheus-operator.dev/docs/platform/thanos/
- Rancher Monitoring configuration guide: https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/advanced-user-guides/monitoring-v2-configuration-guides
- Rancher Monitoring chart values: https://raw.githubusercontent.com/rancher/charts/dev-v2.12/charts/rancher-monitoring/107.0.0+up69.8.2-rancher.8/values.yaml
- kube-prometheus-stack Thanos sidecar service template: https://raw.githubusercontent.com/prometheus-community/helm-charts/main/charts/kube-prometheus-stack/templates/prometheus/serviceThanosSidecar.yaml
- kube-prometheus-stack values for `prometheus.thanosService`: https://raw.githubusercontent.com/prometheus-community/helm-charts/main/charts/kube-prometheus-stack/values.yaml
- Thanos v0.36 sidecar docs: https://thanos.io/v0.36/components/sidecar.md/
- Thanos v0.36 query docs: https://thanos.io/v0.36/components/query.md/
- Thanos v0.36 query-frontend docs: https://thanos.io/v0.36/components/query-frontend.md/
- Thanos v0.36 compactor docs: https://thanos.io/v0.36/components/compact.md/
- Thanos object storage docs: https://thanos.io/tip/thanos/storage.md/
- Bitnami Thanos chart values: https://raw.githubusercontent.com/bitnami/charts/main/bitnami/thanos/values.yaml
- Bitnami Thanos chart helpers: https://raw.githubusercontent.com/bitnami/charts/main/bitnami/thanos/templates/_helpers.tpl
- Bitnami Thanos query deployment template: https://raw.githubusercontent.com/bitnami/charts/main/bitnami/thanos/templates/query/deployment.yaml
- Bitnami Thanos query-frontend service template: https://raw.githubusercontent.com/bitnami/charts/main/bitnami/thanos/templates/query-frontend/service.yaml
- Grafana provisioning docs: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana Prometheus datasource docs: https://grafana.com/docs/grafana/latest/datasources/prometheus/configure/
- Grafana CLI docs: https://grafana.com/docs/grafana/latest/administration/cli/

## Issues Found
- The Prometheus example used `retention: 2h`, but Thanos sidecar guidance recommends keeping local retention at least three times the 2-hour block duration. I changed this to `6h`.
- The post referenced a sidecar service without enabling the Rancher Monitoring setting that exposes it. I added a note to enable `prometheus.thanosService.enabled: true` and switched the Thanos Query example to Rancher’s documented discovery service name, `rancher-monitoring-thanos-discovery`.
- The Bitnami Thanos values example used unsupported or outdated chart fields. I replaced the invalid `storeGateway` block with the current `storegateway` key, removed unsupported nested object store config from that block, and changed the compactor retention settings to the chart’s current `retentionResolutionRaw`, `retentionResolution5m`, and `retentionResolution1h` fields.
- The chart example reused the Prometheus sidecar secret, but Bitnami expects the mounted file path to be `objstore.yml`. I added `existingObjstoreSecretItems` so the `thanos.yaml` key is mapped correctly.
- The query-frontend in-memory cache example used `max_item_size`, which is not part of the in-memory cache configuration. I replaced it with a valid `validity` setting.
- The Grafana CLI example used `grafana-cli admin add-data-source`, which is not a supported Grafana CLI command. I removed that section and kept the supported provisioning approach via ConfigMap.
- The Grafana datasource pointed at `thanos-query`, which bypassed the deployed query frontend. I updated it to use `thanos-query-frontend` so dashboards actually benefit from the frontend layer.
- The multi-cluster `Deployment` manifest was invalid because it lacked a required selector and matching pod labels. I added the missing Kubernetes fields.
- The multi-cluster Querier example used `--store` flags, but the Thanos v0.36 query docs use `--endpoint` for static StoreAPI endpoints. I updated the example accordingly.
- The compactor comment said it “removes duplicate data,” which is inaccurate. I corrected the description to compaction, downsampling, and retention enforcement.

## Review Notes
- The post pins the sidecar image to Thanos `v0.36.0`. That is older than the current Thanos release line, but the corrected command and component references were checked against the v0.36 documentation where version-specific behavior mattered.
- Rancher documents that directly editing the Prometheus custom resource is usually not necessary. The approach in the post can work for advanced cases, but managing equivalent settings through Rancher Monitoring Helm values is safer across upgrades.
- In Thanos v0.36, Query Frontend mainly improves range queries (`/api/v1/query_range`). Instant queries are still proxied through to the downstream querier.
