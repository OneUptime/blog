# Validation Summary: How to Set Up ArgoCD on Talos Linux

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- ArgoCD (GitOps continuous delivery)
- Talos Linux
- Kubernetes
- Helm 3 (argo-helm chart)
- kubectl
- argocd CLI
- kube-prometheus-stack (Helm chart example)
- Prometheus Operator (PrometheusRule)
- ArgoCD RBAC ConfigMap (Casbin policy.csv)

## Sources Consulted
- ArgoCD official documentation: https://argo-cd.readthedocs.io/
- Argo Helm chart `argo-cd` values.yaml: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/values.yaml
- ArgoCD installation manifests: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
- ArgoCD Application CRD / sync policy reference: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/ and https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm.yaml
- ArgoCD RBAC docs: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- ArgoCD metrics: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- prometheus-community Helm charts: https://prometheus-community.github.io/helm-charts

## Issues Found
1. **Invalid `controller.args` block in Helm values** — The post used `controller.args.appResyncPeriod` and `controller.args.repoServerTimeoutSeconds`. The current argo-helm `argo-cd` chart does not expose a structured `controller.args` map; only `controller.extraArgs: []` exists. Tunables of this type belong in `configs.params` (or `extraArgs`). I removed the `controller.args` block and moved the two settings into `configs.params` as `controller.app.resync: "180"` and `controller.repo.server.timeout.seconds: "120"`, which are the documented argocd-cmd-params-cm keys.
2. **Misleading inline comment** — The comment `# Ignore differences in fields managed by mutating webhooks` was placed immediately before `server.insecure: "true"`, but that parameter disables TLS on the server, not anything related to mutating webhook diffs. Replaced the comment with an accurate description: `# Disable TLS on the server (terminate TLS at ingress)`.

## Review Notes
- The post sets `extraArgs: - --insecure` on the server and also `server.insecure: "true"` in `configs.params`. Both effectively achieve the same result; this is redundant but not incorrect.
- The newer recommended way to fetch the initial admin password is `argocd admin initial-password -n argocd`. The secret-extraction command shown still works.
- `kube-prometheus-stack` chart version constraint `"55.*"` is valid semver-style targeting, but the chart's major versions move quickly; readers may want to pin or bump as appropriate.
- The `argocd-initial-admin-secret` is deleted after the first password change per ArgoCD's documented behavior — worth noting if a reader returns later.
