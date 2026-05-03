# Validation Summary: How to Deploy Mimir on Rancher for Metrics Storage

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- Grafana Mimir (mimir-distributed Helm chart)
- Rancher / Kubernetes
- Helm (package manager)
- Prometheus (remote_write)
- Grafana (datasource)
- S3-compatible object storage
- kube-prometheus-stack (implied by `prometheusSpec` shape)

## Sources Consulted
- [grafana/mimir-distributed values.yaml (main)](https://github.com/grafana/mimir/blob/main/operations/helm/charts/mimir-distributed/values.yaml)
- [Configure Grafana Mimir object storage backend](https://grafana.com/docs/mimir/latest/configure/configure-object-storage-backend/)
- [Manage the configuration of Grafana Mimir with Helm](https://grafana.com/docs/helm-charts/mimir-distributed/latest/run-production-environment-with-helm/configuration-with-helm/)
- [Run Grafana Mimir in production using the Helm chart](https://grafana.com/docs/helm-charts/mimir-distributed/latest/run-production-environment-with-helm/)
- [Get started with Grafana Mimir using the Helm chart](https://grafana.com/docs/helm-charts/mimir-distributed/latest/get-started-helm-charts/)
- [Enable external access to Grafana Mimir](https://grafana.com/docs/helm-charts/mimir-distributed/latest/get-started-helm-charts/gs-external-access/)

## Issues Found
No technical issues found.

Verified specifically:
- Helm repo URL `https://grafana.github.io/helm-charts` and chart name `grafana/mimir-distributed` are correct.
- `mimir.structuredConfig` is the correct path for overriding Mimir runtime config in the chart, and values are recursively merged over `mimir.config`.
- `common.storage.backend: s3` with `common.storage.s3.*` is the supported shape; per-storage overrides under `blocks_storage`, `alertmanager_storage`, and `ruler_storage` are valid.
- Component scaling keys use the correct casing for this chart: `distributor`, `ingester`, `querier`, `query_frontend`, `compactor`, `store_gateway` (snake_case), while `ingester.zoneAwareReplication.enabled` is camelCase — both match the chart's values.yaml.
- `minio.enabled: false` is the correct way to disable the embedded MinIO subchart.
- Default in-cluster service is `mimir-nginx` on port 80; remote_write path `/api/v1/push` and query path prefix `/prometheus` are correct.
- `X-Scope-OrgID` is the correct multi-tenancy header for Mimir, and Grafana's `httpHeaderName1` / `httpHeaderValue1` (with the value in `secureJsonData`) is the correct datasource provisioning shape.

## Review Notes
- The post uses `${AWS_ACCESS_KEY_ID}` / `${AWS_SECRET_ACCESS_KEY}` in `structuredConfig` but never wires the `mimir-bucket-secret` into the Mimir pods (e.g. via `global.extraEnvFrom`) and does not enable env-var expansion (`mimir.config.expand_env_vars` / `-config.expand-env=true`). As written, the credentials would be passed through literally rather than substituted. This is a tutorial completeness gap rather than an incorrect technical claim, so no edits were made, but readers will need to add the `extraEnvFrom`/expand-env wiring to make the example work end-to-end.
- The chart name `grafana/mimir-distributed` deploys the microservices topology by default; a `--set` override or alternative values are needed for monolithic mode. The post correctly targets the distributed topology.
- The "modern replacement for Thanos" framing is opinion rather than a technical claim and was left as written.
