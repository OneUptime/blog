# Validation Summary: How to Fix ArgoCD 'Unknown' Sync Status

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD
- Kubernetes
- Redis
- GitOps
- Prometheus metrics

## Sources Consulted
- Argo CD High Availability and application controller documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/release-2.10/user-guide/commands/argocd_app_get/
- Argo CD `argocd app manifests` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_manifests/
- Argo CD `argocd cluster list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cluster_list/
- Argo CD resource tracking documentation: https://argo-cd.readthedocs.io/en/release-2.7/user-guide/resource_tracking/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD `argocd-cmd-params-cm` example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD application controller command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-application-controller/

## Issues Found
- The controller examples used `deployment/argocd-application-controller`, but the official Argo CD manifests run the application controller as a StatefulSet. Updated controller log, restart, exec, and patch examples to use `statefulset/argocd-application-controller`.
- The large-application timeout section said comparison timeout is controlled by `ARGOCD_RECONCILIATION_TIMEOUT`. Official Argo CD documentation describes slow manifest generation/comparison failures as repo-server RPC timeout issues controlled by `--repo-server-timeout-seconds` or `controller.repo.server.timeout.seconds` in `argocd-cmd-params-cm`. Replaced the environment variable example with a ConfigMap patch for `controller.repo.server.timeout.seconds` and a controller restart.

## Review Notes
The local environment did not include `kubectl` or the `argocd` CLI, so CLI validation was performed against official command references. The remaining Argo CD CLI examples, resource tracking annotation references, `argocd_app_info` metric usage, and controller/repo-server/cluster-state explanation match the official documentation reviewed.
