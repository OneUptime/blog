# Validation Summary: Deploy Grafana Mimir with S3 Backend Using Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Mimir
- Grafana `mimir-distributed` Helm chart
- Flux CD `HelmRepository`, `HelmRelease`, and `Kustomization`
- Kubernetes Secrets
- Amazon S3-compatible object storage
- Prometheus `remote_write`
- Grafana Alloy
- SOPS

## Sources Consulted
- Grafana Mimir deployment modes: https://grafana.com/docs/mimir/latest/references/architecture/deployment-modes/
- Grafana Mimir Helm chart setup: https://grafana.com/docs/mimir/latest/set-up/helm-chart/
- Grafana `mimir-distributed` Helm chart production configuration: https://grafana.com/docs/helm-charts/mimir-distributed/latest/run-production-environment-with-helm/
- Grafana Mimir Helm chart configuration and credential injection: https://grafana.com/docs/helm-charts/mimir-distributed/latest/run-production-environment-with-helm/configuration-with-helm/
- Grafana Mimir Helm chart values source: https://github.com/grafana/mimir/blob/main/operations/helm/charts/mimir-distributed/values.yaml
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization health checks documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The post claimed the `mimir-distributed` Helm chart example deployed Mimir in monolithic mode. Official Grafana documentation describes `mimir-distributed` as the Kubernetes chart for microservices deployments, while monolithic mode is enabled by setting Mimir's `target` to `all`. I changed the wording to describe deploying Mimir with the `mimir-distributed` Helm chart instead of monolithic mode.
- The Helm values attempted to disable `mimir-distributed` under `values.mimir-distributed.enabled`, but that is not a valid way to make the chart monolithic. I removed that invalid value.
- The S3 credentials were injected directly into `mimir.structuredConfig` via Flux `valuesFrom`, which would render them into Mimir's generated configuration. Grafana's Helm chart documentation recommends injecting credentials with `global.extraEnvFrom` and referencing environment variables in `mimir.structuredConfig`. I changed the Secret keys to `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`, added `global.extraEnvFrom`, and referenced those variables in the S3 storage configuration.
- The example did not disable the chart's built-in test MinIO deployment while configuring external S3. Grafana's production Helm documentation instructs users to set `minio.enabled: false` for external object storage. I added that setting.
- The S3 configuration was incomplete for separate blocks, ruler, and alertmanager buckets. I added `backend: s3`, endpoint, region, and credential references to the relevant storage sections.
- The Flux Kustomization health check targeted a chart-created StatefulSet named `mimir-ingester`, which is not stable across Mimir chart versions and zone-aware deployments. Flux documentation recommends waiting on the `HelmRelease` when a Kustomization contains HelmRelease objects, so I changed the health check to target the `mimir` HelmRelease.

## Review Notes
The YAML snippets were parsed successfully after the corrections. The chart version range `>=5.0.0 <6.0.0` is valid for chart v5, but newer v6 releases exist; future updates should re-check values against the matching chart tag before changing the version range.
