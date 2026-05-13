# Validation Summary: Deploy Grafana Loki with S3 Backend Using Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Grafana Loki
- Grafana Community Loki Helm chart
- HelmRelease and HelmRepository custom resources
- S3-compatible object storage
- Loki TSDB schema and retention
- Kubernetes Secrets

## Sources Consulted
- Grafana Loki Helm installation documentation: https://grafana.com/docs/loki/latest/setup/install/helm/
- Grafana Loki Simple Scalable Helm chart documentation: https://grafana.com/docs/loki/latest/setup/install/helm/install-scalable/
- Grafana Loki storage documentation: https://grafana.com/docs/loki/latest/configure/storage/
- Grafana Loki retention documentation: https://grafana.com/docs/loki/latest/operations/storage/retention/
- Grafana Loki Helm chart values reference: https://github.com/grafana/loki/blob/main/production/helm/loki/values.yaml
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Kustomization health check documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The post used the older Grafana Helm repository URL and a Loki chart `6.x` version range. Current Grafana documentation directs OSS Loki chart users to the Grafana Community chart repository, with current chart versions in the `13.x` range. Updated the HelmRepository URL, repository name, source reference, and chart version range.
- The S3 bucket name was configured under `loki.storage.s3.bucketnames`, which is not the chart value path shown in the current Loki Helm values. Updated the example to use `loki.storage.bucketNames` and retained S3 connection settings under `loki.storage.s3`.
- The retention example set only `limits_config.retention_period`. Loki retention requires compactor retention to be enabled for TSDB/BoltDB Shipper retention. Added `loki.compactor.retention_enabled: true`.
- The best-practice note said Loki relies on S3 object expiry for chunk deletion. Current Loki documentation says the compactor removes index entries and deletes chunk objects asynchronously when retention is configured. Updated the wording accordingly.
- Added `minio.enabled: false` to make the external S3 storage example explicit, matching Grafana's external object storage examples.
- Added a note that Simple Scalable Deployment mode is being deprecated before Loki 4.0, while preserving the guide's Simple Scalable focus.

## Review Notes
All YAML snippets were parsed successfully with PyYAML. The local workspace does not have `helm`, `kubectl`, or `flux` installed, so CLI-based rendering or cluster validation could not be performed.
