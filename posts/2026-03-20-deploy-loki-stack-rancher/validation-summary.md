# Validation Summary: How to Deploy Loki Stack on Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Loki (log aggregation)
- Promtail (log shipper)
- Grafana (visualization & data source)
- Helm / Helm charts (`grafana/loki`, `grafana/promtail`)
- Kubernetes / Rancher
- LogQL (query language)
- S3 object storage
- TSDB index store, schema v13

## Sources Consulted
- Official `grafana/loki` Helm chart values.yaml: https://github.com/grafana/loki/blob/main/production/helm/loki/values.yaml
- Official `grafana/promtail` Helm chart: https://github.com/grafana/helm-charts/tree/main/charts/promtail
- Loki schema config / TSDB docs: https://grafana.com/docs/loki/latest/operations/storage/schema/
- Loki limits_config reference: https://grafana.com/docs/loki/latest/configure/#limits_config
- Grafana data source provisioning + derived fields: https://grafana.com/docs/grafana/latest/datasources/loki/
- LogQL reference: https://grafana.com/docs/loki/latest/query/

## Issues Found
1. **`limits_config` was placed at the top level of `loki-values.yaml`.** The Grafana Loki Helm chart expects `limits_config` to be nested under the `loki:` block — the chart renders `.Values.loki.limits_config` directly into Loki's runtime config. Placed at the top level it would be silently ignored and the 744h retention would not apply. Moved the `limits_config` block under `loki:` alongside `auth_enabled`, `storage`, and `schemaConfig`.

## Review Notes
- **Promtail is deprecated** (the `grafana/promtail` chart has `deprecated: true` in its Chart.yaml; last shipped appVersion 3.5.1). Grafana's recommended path forward is **Grafana Alloy**. The post is technically still correct — Promtail and the chart remain functional and are in long-term support — but a future revision should migrate the example to Alloy (or at least add a deprecation notice).
- **Mixed deployment-mode values.** The values file sets both `singleBinary.replicas: 1` and `write/read/backend.replicas: 3`. The chart only renders the StatefulSets matching `deploymentMode` (default: `SimpleScalable` → uses write/read/backend; the `singleBinary` block is then ignored). The author's intent (commented "Single binary mode for small clusters") would require adding `deploymentMode: SingleBinary`. Left as-is since the SimpleScalable defaults still produce a working deployment, but worth tightening up.
- **S3 credential field naming.** The post uses the legacy `loki.storage.s3` block with camelCase `accessKeyId` / `secretAccessKey`, which is correct for that block. The chart is migrating to a Thanos-based `loki.storage.object_store.s3` block that uses snake_case (`access_key_id` / `secret_access_key`); this will become the default in a future release.
- The `$${__value.raw}` syntax in the Grafana datasource derived field is correct for Helm-rendered values (escapes Helm templating). If applied as a plain Grafana provisioning file (not via Helm), use `${__value.raw}`.
- Cost claim "10–50x lower than Elasticsearch" is in line with Grafana's published marketing; precise multiplier varies heavily by workload.
