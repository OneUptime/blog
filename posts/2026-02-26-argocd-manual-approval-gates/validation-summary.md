# Validation Summary: How to Implement Manual Approval Gates Between Environments in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Applications and sync policies
- Argo CD Notifications
- Argo CD resource hooks and sync phases
- Argo CD RBAC
- Argo CD CLI
- GitHub Actions environments
- GitHub branch protection
- Kubernetes Jobs
- Kustomize
- Slack notifications

## Sources Consulted
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Automated Sync Policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD Notifications Triggers: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD Notification Subscriptions: https://argo-cd.readthedocs.io/en/stable/user-guide/subscriptions/
- Argo CD Notification Services Overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/overview/
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD Build Environment: https://argo-cd.readthedocs.io/en/release-3.3/user-guide/build-environment/
- Argo CD RBAC Configuration: https://argo-cd.readthedocs.io/en/release-2.9/operator-manual/rbac/
- Argo CD `argocd app patch` Command Reference: https://argo-cd.readthedocs.io/en/release-2.13/user-guide/commands/argocd_app_patch/
- Argo CD `argocd app wait` Command Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_wait/
- GitHub Actions Deployments and Environments: https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments
- GitHub Actions GKE deployment example using `kustomize edit set image`: https://docs.github.com/actions/how-tos/use-cases-and-examples/deploying/deploying-to-google-kubernetes-engine
- Kubernetes Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/

## Issues Found
- The Argo CD `Application` examples specified only `destination.namespace`. Argo CD Applications also need a destination cluster via `destination.server` or `destination.name`, so I added `server: https://kubernetes.default.svc` to the examples.
- The protected-branch production `Application` example omitted `destination` entirely. I added the same in-cluster destination and production namespace.
- The PreSync hook used `curlimages/curl` while the script also called `jq`. I changed the example to use Alpine and install `curl` and `jq` before running the approval check.
- The PreSync hook deleted only successful hook Jobs. Because failed approval checks are expected in this gate pattern, I added `HookFailed` so failed hook Jobs do not block the next sync attempt.
- The approval API call sent JSON without a `Content-Type: application/json` header. I added the header.
- The hook script referenced `ARGOCD_APP_REVISION` directly inside the container without defining it as a container environment variable. I added an `APPROVAL_REVISION` environment variable populated from Argo CD's build environment value.
- The audit command used `argocd app set --annotations`, which is not a supported `argocd app set` option. I replaced it with `argocd app patch --type merge --patch` to update Application annotations.

## Review Notes
The GitHub Actions example assumes the runner has the `argocd`, `jq`, and `kustomize` CLIs installed and has authentication configured for Argo CD and the config repository. That is acceptable for a focused approval-gate example, but a production-ready workflow should explicitly install tools, configure credentials, and handle no-op commits.
