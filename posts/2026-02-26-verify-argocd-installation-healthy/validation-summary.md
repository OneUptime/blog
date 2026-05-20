# Validation Summary: How to Verify ArgoCD Installation is Healthy

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Argo CD
- Kubernetes
- kubectl
- Argo CD CLI
- Prometheus metrics
- Kubernetes Secrets
- RBAC and SSO checks

## Sources Consulted
- Argo CD `argocd app create` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_create/
- Argo CD `argocd app wait` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_wait/
- Argo CD `argocd app delete` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_delete/
- Argo CD `argocd repo get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_get/
- Argo CD `argocd cluster get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cluster_get/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/metrics/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/release-2.13/operator-manual/rbac/
- Argo CD `argocd admin settings rbac validate` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_settings_rbac_validate/
- Argo CD `argocd login` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_login/
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The repository Secret inspection command printed `.data.url` directly, which returns base64-encoded Secret data. Updated the command to decode each repository URL before displaying it.
- The controller metrics section described `argocd_app_reconcile` as a reconciliation count. Argo CD documents it as a histogram for reconciliation duration, so the wording was corrected.
- The `argocd_app_info` check was described as finding stuck applications. Argo CD documents this metric as application information with sync and health labels, so the wording was corrected.
- The RBAC validation example used `--policy-file /dev/stdin` with an ad hoc policy snippet while claiming to verify loaded policies. The documented way to validate live RBAC configuration is `argocd admin settings rbac validate --namespace argocd`, so the example was corrected.

## Review Notes
The post is technically relevant and generally accurate. Several examples assume a default Argo CD installation in the `argocd` namespace and an authenticated Argo CD CLI session or working port-forward, which is appropriate for this guide but worth keeping in mind for Helm or custom-name installations.
