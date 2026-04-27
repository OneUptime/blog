# Validation Summary: How to Set Up Full Observability Stack on Rancher - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- Rancher (Kubernetes management)
- Helm 3.x
- Rancher Monitoring (Prometheus Operator)
- MinIO (object storage)
- Grafana Loki (logs)
- Grafana Tempo (traces)
- Grafana Mimir (long-term metrics)
- Promtail (log collector)
- OpenTelemetry Collector
- Grafana (visualization, datasource provisioning)

## Sources Consulted
- OpenTelemetry Collector Contrib release notes and the `loki` exporter removal: https://github.com/open-telemetry/opentelemetry-collector-contrib/releases/tag/v0.131.0 and issue https://github.com/open-telemetry/opentelemetry-collector-contrib/issues/38374
- Loki OTLP ingestion docs: https://grafana.com/docs/loki/latest/send-data/otel/
- Loki Helm chart (scalable install): https://grafana.com/docs/loki/latest/setup/install/helm/install-scalable/
- Tempo distributed Helm chart values: https://github.com/grafana/helm-charts/blob/main/charts/tempo-distributed/values.yaml
- Tempo query-frontend port: https://github.com/grafana/helm-charts/issues/3968
- Mimir distributed Helm chart documentation
- Promtail EOL announcement: https://community.grafana.com/t/promtail-end-of-life-eol-march-2026-how-to-migrate-to-grafana-alloy-for-existing-loki-server-deployments/159636
- MinIO Helm chart values

## Issues Found

1. **OpenTelemetry Collector `loki` exporter has been removed.** It was deprecated and removed from the `opentelemetry-collector-contrib` distribution in v0.131.0 (July 2024). The post used the legacy `loki:` exporter pointing at `/loki/api/v1/push`. Replaced with the recommended `otlphttp/loki` exporter targeting Loki's native OTLP endpoint (`http://loki.observability.svc.cluster.local:3100/otlp`), and updated the logs pipeline `exporters` list accordingly.

2. **Loki Helm chart value paths used incorrect snake_case.** The chart's `values.yaml` uses camelCase even though the underlying Loki config is snake_case. Fixed:
   - `loki.storage.s3.access_key_id` → `loki.storage.s3.accessKeyId`
   - `loki.storage.s3.secret_access_key` → `loki.storage.s3.secretAccessKey`
   - `loki.storage.s3.s3forcepathstyle` → `loki.storage.s3.s3ForcePathStyle`
   - `loki.storage.s3.bucketnames=loki-chunks` → `loki.storage.bucketNames.chunks=loki-chunks` (bucket names live under `loki.storage.bucketNames` in the chart, not under `s3`).

3. **Tempo distributed Helm chart values used a non-existent `tempo.` top-level prefix.** The `tempo-distributed` chart exposes these settings at the top level (`storage.trace.*`, `distributor.*`, `metricsGenerator.*`). Removed the bogus `tempo.` prefix from all `--set` flags in the install command.

4. **Tempo query-frontend HTTP API port was wrong.** The chart's `tempo-query-frontend` Service exposes the HTTP API on port 3200, not 3100. Fixed both:
   - The Grafana Tempo datasource URL (`...:3100` → `...:3200`).
   - The verify-step `kubectl port-forward` and `curl` commands (3101:3100 mapping replaced with 3200:3200).

## Review Notes

- **Promtail is end-of-life as of March 2, 2026.** The `grafana/promtail` chart still installs, so the command in Step 2 remains functional today, but new deployments should migrate to **Grafana Alloy** (`grafana/alloy`), which provides a `loki.source.*` / `promtail.scrape` component and a `alloy convert` migration tool. The post's structure was kept intact, but readers starting fresh should consider Alloy.
- **Mimir `structuredConfig` paths are correct.** Note the intentional mix of camelCase outside `structuredConfig` (e.g., `mimir.structuredConfig`) and snake_case inside it (e.g., `blocks_storage.s3.bucket_name`), since `structuredConfig` is a passthrough to Mimir's native YAML config which uses snake_case.
- **MinIO `replicas=4` is the minimum for distributed mode.** This works but offers no headroom; production deployments often run more replicas across distinct nodes/AZs.
- **Prometheus retention=2h is intentionally short** because metrics are forwarded to Mimir for long-term storage; this is reasonable but worth understanding before copy-pasting.
- **Loki `schemaConfig` and `deploymentMode` are required** by recent versions of the `grafana/loki` chart and will fail validation if missing. The `helm install` flags in Step 2 are sufficient to demonstrate intent but a real install will also need a schema config (e.g., `store: tsdb`, `schema: v13`) supplied via a values file.
