# Validation Summary: How to Set Up Hub-and-Spoke Multi-Cluster with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Kustomize
- Flux Kustomization and HelmRelease remote cluster reconciliation
- Flux notification-controller alerts and providers
- kubectl service account tokens
- GitOps repository layout

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux GitHub bootstrap CLI documentation: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Kubernetes kubectl command reference for `kubectl create token`: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes service account administration documentation: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/

## Issues Found
- The spoke `Kustomization` example used `wait: true` together with `healthChecks`. Current Flux documentation states that `spec.wait: true` performs health checks for all reconciled resources and ignores `spec.healthChecks`, so I removed `wait: true` and adjusted the comment to describe the targeted health check.
- The notification examples used `notification.toolkit.fluxcd.io/v1`, but current Flux notification API documentation uses `notification.toolkit.fluxcd.io/v1beta3`. I updated both `Provider` and `Alert` resources.
- The Slack provider example referenced a webhook-style secret while also setting `channel`. Current Flux docs recommend Slack API mode with `address: https://slack.com/api/chat.postMessage` and a token secret for channel selection, so I updated the provider snippet accordingly.
- The Alert used deprecated `spec.summary`. I changed it to `spec.eventMetadata.summary`, as recommended by the Flux Alert documentation.
- The add-spoke command sequence applied RBAC into the `flux-system` namespace without creating the namespace first. I added the namespace creation command before applying RBAC.
- The troubleshooting section said to "enable drift detection" with `force: false`, `prune: true`, and `interval: 10m`. Flux Kustomizations already detect and correct drift during reconciliation; that snippet only configures pruning and reconciliation frequency. I corrected the wording and removed the misleading `force: false` line.

## Review Notes
- I could not verify commands with local `flux` or `kubectl` binaries because they are not installed in this workspace, so CLI validation was performed against official documentation.
- The service account token example uses a long requested duration. Kubernetes supports `kubectl create token --duration`, but clusters may enforce their own token expiration limits, so production setups should plan for token rotation or use Flux's documented workload identity options where available.
