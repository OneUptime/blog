# Validation Summary: How to Configure GitRepository Reconciliation Interval in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux source-controller
- Flux notification-controller
- Flux GitRepository
- Flux Receiver
- Kubernetes
- kubectl

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux CLI documentation for `flux create source git`: https://fluxcd.io/flux/cmd/flux_create_source_git/
- Flux CLI documentation for `flux reconcile source git`: https://fluxcd.io/flux/cmd/flux_reconcile_source_git/
- Flux CLI documentation for `flux get sources git`: https://fluxcd.io/flux/cmd/flux_get_sources_git/
- Flux CLI documentation for `flux create receiver`: https://fluxcd.io/flux/cmd/flux_create_receiver/
- Flux Receiver documentation: https://fluxcd.io/flux/components/notification/receivers/
- Kubernetes documentation for `kubectl patch`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The post used `flux reconcile source git my-app --with-source`. The `--with-source` flag is documented for workload resources such as Kustomizations, not for the `flux reconcile source git` subcommand. I changed the example to `flux reconcile source git my-app`, which triggers the GitRepository reconciliation and waits for it to finish.
- The monitoring section described the Ready condition `lastTransitionTime` as the last reconciliation timestamp and said the command showed the next scheduled reconciliation. A Ready condition transition timestamp only changes when that condition transitions, and the Flux status command is for source status and latest artifact revision. I updated the wording and changed the status command to the documented `flux get sources git my-app`.
- The performance section stated that every reconciliation consumes at least one GitHub API call and referenced the 5,000 authenticated API requests per hour limit. Flux GitRepository reconciliation communicates with the configured Git remote and may also use provider APIs in provider-specific authentication flows, so the original statement was too specific. I changed it to provider-side request, abuse, or secondary rate-limit wording.
- The source-controller resource example was an incomplete Deployment manifest and would not be valid as a standalone Kubernetes Deployment. I replaced it with a `kubectl patch deployment source-controller --type=strategic` example that updates only the `manager` container resource requests and limits.

## Review Notes
The post uses the current `source.toolkit.fluxcd.io/v1` GitRepository API and valid `spec.interval`, `spec.url`, and `spec.ref` fields. The `flux create source git --interval`, `kubectl patch gitrepository`, `flux create receiver --type/--event/--secret-ref/--resource`, and `status.artifact.lastUpdateTime` examples are consistent with the official Flux and Kubernetes documentation.
