# Validation Summary: How to Use HelmRelease for Deploying Loki with Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Kubernetes
- Helm
- HelmRelease
- Grafana Loki
- Grafana Alloy
- Grafana
- S3-compatible object storage

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Grafana Loki Helm installation documentation: https://grafana.com/docs/loki/latest/setup/install/helm/
- Grafana Loki monolithic Helm chart documentation: https://grafana.com/docs/loki/latest/setup/install/helm/install-monolithic/
- Grafana Loki Helm chart values reference: https://grafana.com/docs/loki/latest/setup/install/helm/reference/
- Grafana Loki storage documentation: https://grafana.com/docs/loki/latest/configure/storage/
- Grafana Loki retention documentation: https://grafana.com/docs/loki/latest/operations/storage/retention/
- Grafana Loki get started documentation for Alloy log collection: https://grafana.com/docs/loki/latest/get-started/
- Grafana Alloy Kubernetes installation documentation: https://grafana.com/docs/alloy/latest/set-up/install/kubernetes/
- Grafana Alloy Kubernetes Helm configuration documentation: https://grafana.com/docs/alloy/latest/configure/kubernetes/
- Grafana Alloy loki.write reference: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.write/
- Grafana Promtail EOL notice: https://grafana.com/docs/loki/latest/send-data/promtail/

## Issues Found
- The Loki HelmRepository and chart version were outdated for current guidance. Updated the Loki repository to `https://grafana-community.github.io/helm-charts`, changed the HelmRepository name to `grafana-community`, and updated the Loki chart constraint to `13.x`.
- The Loki deployment mode used `SingleBinary`, which is renamed to `Monolithic` in current community chart guidance. Updated the explanation and Helm values to use `deploymentMode: Monolithic`.
- The post recommended Promtail as the default log shipper, but Promtail is EOL as of March 2, 2026. Replaced the Promtail HelmRelease with a Grafana Alloy HelmRelease using the official Alloy Kubernetes log collection pattern.
- The S3 storage snippet used incorrect/currently unsupported Helm value key casing for chart-managed S3 credentials. Updated to `accessKeyId` and `secretAccessKey`, added `bucketNames`, and included the `storage_config.aws` fields shown in current Loki Helm docs.
- The retention configuration only set `limits_config.retention_period`; Loki retention also requires compactor retention to be enabled. Added `loki.compactor.retention_enabled` and `delete_request_store` for both filesystem and S3 examples.
- The prerequisite note claimed Loki has no built-in UI. Updated it to recommend Grafana for a full log-querying UI without making an inaccurate absolute claim.

## Review Notes
The YAML snippets parse successfully. CLI examples for `flux get helmrelease`, `kubectl get pods`, `kubectl port-forward`, and `curl` use valid command forms, but the local environment did not have `flux`, `kubectl`, or `helm` installed, so command help could not be verified locally.
