# Validation Summary: How to Handle Git Repository Outages with Flux CD

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Flux CD
- Kubernetes custom resources
- Kubernetes CronJob
- Prometheus Operator PrometheusRule
- Git repository mirroring
- OCI registries and GHCR
- GitHub Actions

## Sources Consulted
- Flux Notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux persistent storage for internal artifacts: https://fluxcd.io/flux/installation/configuration/vertical-scaling/#persistent-storage-for-flux-internal-artifacts
- Flux CLI `push artifact` documentation: https://fluxcd.io/flux/cmd/flux_push_artifact/
- Flux CLI `tag artifact` documentation: https://fluxcd.io/flux/cmd/flux_tag_artifact/
- Flux GitHub Action documentation: https://fluxcd.io/flux/flux-gh-action/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Prometheus Operator PrometheusRule API documentation: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The Notification Toolkit `Provider` and `Alert` examples used `notification.toolkit.fluxcd.io/v1`, but the current Flux Alert and Provider API is `notification.toolkit.fluxcd.io/v1beta3`. Updated both API versions.
- The Prometheus examples filtered `gotk_resource_info` with `kind="GitRepository"`, but Flux documents this kube-state-metrics label as `customresource_kind`. Updated the selectors.
- The stale-fetch PromQL expression subtracted `gotk_resource_info` from `time()`, but `gotk_resource_info` is an info gauge, not a timestamp. Replaced it with a longer-duration `ready="False"` alert.
- The OCI push example used a placeholder revision that was too short to represent the documented `<branch|tag>@sha1:<commit-sha>` format. Replaced it with a full-length placeholder SHA.
- The GitHub Actions sample piped the GHCR token into `flux push artifact` while also passing `--creds`, and used a non-standard GitHub context for the repository URL. Removed the unused pipe and used `git config --get remote.origin.url`, matching the Flux CLI examples.
- The source-controller persistent storage example placed a PVC in the same YAML document stream as the Kustomize configuration and added a second `/data` mount. Split the PVC into its own file and changed the patch to Flux's documented JSON6902 pattern that replaces the existing `/data` mount.

## Review Notes
The post is technically relevant and salvageable. The mirror and failover examples remain operational examples and would still need environment-specific RBAC, secrets, source names, and failback policy before production use.
