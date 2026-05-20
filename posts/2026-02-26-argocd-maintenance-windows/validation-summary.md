# Validation Summary: How to Plan ArgoCD Maintenance Windows

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- AppProject sync windows
- kubectl
- Argo CD CLI
- jq
- Bash

## Sources Consulted
- Argo CD Sync Windows documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync_windows/
- Argo CD AppProject specification reference: https://argo-cd.readthedocs.io/en/release-3.2/operator-manual/project-specification/
- Argo CD upgrade overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/upgrading/overview/
- Argo CD v2.9 to v2.10 upgrade notes: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/upgrading/2.9-2.10/
- Argo CD `argocd version` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_version/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The sync window examples used `manualSync: true` while saying that manual syncs would also be blocked. In Argo CD, `manualSync: true` allows manual sync overrides for a window. Changed the examples to `manualSync: false`.
- The post described blocking all application syncs but only patched the `default` AppProject. Clarified that sync windows are AppProject-scoped and must be applied to each affected project.
- The immediate sync-window example used a daily cron expression and had an unused day-of-week variable. Changed it to use the current day of month and month, and removed the unused variable, so the example better matches the intended one-time maintenance window.
- The Argo CD upgrade and rollback examples used client-side `kubectl apply`. Current Argo CD documentation recommends `--server-side --force-conflicts` because some CRDs exceed client-side apply size limits. Updated both manifest apply commands.
- The completion status command used `argocd version --server --short`, but `--server` is a global option that expects an Argo CD server address, not a server-version selector. Changed it to `argocd version --short`.
- The post-maintenance log command targeted `deployment/argocd-application-controller`, but the standard Argo CD install uses a StatefulSet for the application controller. Changed it to `statefulset/argocd-application-controller`.

## Review Notes
The guide is technically relevant and valid after the corrections. Downtime and maintenance cadence estimates are operational guidance rather than guaranteed behavior, so teams should adjust them for their installation size, HA topology, and upgrade path.
