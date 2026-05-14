# Validation Summary: How to Deploy Mimir with Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Grafana Mimir
- Grafana Mimir distributed Helm chart
- Flux CD HelmRelease, HelmRepository, and Kustomization APIs
- Kubernetes
- Prometheus Operator remote write configuration
- Grafana Operator data sources
- S3-compatible object storage
- Mimirtool

## Sources Consulted
- Grafana Mimir Helm chart documentation: https://grafana.com/docs/helm-charts/mimir-distributed/latest/
- Grafana Mimir Helm chart configuration guide: https://grafana.com/docs/helm-charts/mimir-distributed/latest/run-production-environment-with-helm/configuration-with-helm/
- Grafana Mimir configuration parameters: https://grafana.com/docs/mimir/latest/configure/configuration-parameters/
- Grafana Mimir HTTP API reference: https://grafana.com/docs/mimir/latest/references/http-api/
- Grafana Mimir ruler documentation: https://grafana.com/docs/mimir/latest/references/architecture/components/ruler/
- Grafana Mimirtool documentation: https://grafana.com/docs/mimir/latest/manage/tools/mimirtool/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux Source API reference: https://fluxcd.io/flux/components/source/api/v1/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Grafana Operator data source documentation: https://grafana.com/docs/grafana/latest/as-code/infrastructure-as-code/grafana-operator/operator-dashboards-folders-datasources/
- Grafana Mimir Helm chart source, values, and templates: https://github.com/grafana/mimir/tree/mimir-distributed-5.7.0/operations/helm/charts/mimir-distributed

## Issues Found
- The HelmRelease name was `mimir-distributed`, but later examples used generated service names such as `mimir-nginx` and cache names such as `mimir-results-cache`. With the chart naming rules, a release named `mimir-distributed` would generate `mimir-distributed-nginx` and `mimir-distributed-results-cache`. Changed the HelmRelease name to `mimir` and updated Flux health check object names to match.
- The Mimir configuration disabled multi-tenancy while the Prometheus, Grafana, and curl examples sent `X-Scope-OrgID: my-tenant`. Enabled `multitenancy_enabled` so the tenant header examples are consistent with Mimir authentication behavior.
- The chart values did not disable the built-in MinIO deployment while configuring external S3 buckets. Added `minio.enabled: false`.
- The object storage examples omitted credential injection. Added `global.extraEnvFrom` and environment variable references for S3 access key and secret key, matching the chart's supported `config.expand-env` pattern.
- `compactor.blocks_retention_period` is not a valid current Mimir compactor configuration field. Removed it and kept retention under `limits.compactor_blocks_retention_period`.
- The Flux Kustomization used `targetNamespace: mimir`, which would override namespaced resources such as the HelmRepository intended for `flux-system`. Removed `targetNamespace` because the manifests already specify their namespaces.
- The Flux Kustomization had `wait: true` while also defining `healthChecks`; Flux ignores `healthChecks` when `wait` is enabled. Changed `wait` to `false` so the listed health checks are used.
- The recording rules were shown as a standalone Kubernetes ConfigMap, but Mimir will not load such a ConfigMap automatically when ruler storage is S3. Replaced it with a Mimirtool-compatible rules file and a `mimirtool rules load` command.

## Review Notes
- The post intentionally pins the chart with a `5.x` constraint. Grafana Mimir chart 6.x is available and uses the gateway path more prominently, so this guide should be revisited before upgrading beyond chart 5.x.
- The YAML snippets were parsed locally after editing. Helm rendering could not be run because `helm` is not installed in the review environment.
