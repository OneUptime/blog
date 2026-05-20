# Validation Summary: How to Fix 'ComparisonError' in ArgoCD

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Helm
- Kustomize
- Prometheus metrics

## Sources Consulted
- Argo CD application command reference: https://argo-cd.readthedocs.io/en/release-2.10/user-guide/commands/argocd_app_get/
- Argo CD repo server high availability guidance: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD command parameters ConfigMap example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD sync waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD resource exclusion/inclusion documentation: https://argo-cd.readthedocs.io/en/release-2.9/operator-manual/declarative-setup/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Helm template debugging documentation: https://v3.helm.sh/docs/v3/chart_template_guide/debugging/
- Kustomize documentation: https://kustomize.io/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/

## Issues Found
- The repo-server timeout example used `reposerver.default.cache.expiration` and `timeout.reconciliation`, which are cache/reconciliation settings rather than the application controller's repo-server RPC timeout. Changed the example to use `controller.repo.server.timeout.seconds: "300"` in `argocd-cmd-params-cm`.
- The `ARGOCD_EXEC_TIMEOUT` example implied the default timeout was 60 seconds. Argo CD documents a 90 second default for config-management tool execution in the repo server, so the comment now says 90 seconds.
- The CRD section said Argo CD fails because it cannot validate the resource schema. Missing CRDs are more accurately a resource type discovery/dry-run recognition problem, so the explanation was corrected.
- The Prometheus metric `argocd_repo_server_git_request_duration_seconds` was not documented by Argo CD. Replaced it with the documented repo-server metric `argocd_git_request_duration_seconds`.

## Review Notes
The remaining commands and snippets are broadly correct for current Argo CD, Kubernetes, Helm, and Kustomize usage. Timeout changes through `argocd-cmd-params-cm` generally require restarting the affected Argo CD components before the new settings take effect; this could be called out in a future editorial pass.
