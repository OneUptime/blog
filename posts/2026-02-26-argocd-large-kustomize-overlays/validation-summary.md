# Validation Summary: How to Handle Large Kustomize Overlays in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kustomize
- Kubernetes
- GitOps
- Prometheus metrics and alerts

## Sources Consulted
- Argo CD High Availability and scaling documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/high_availability/
- Argo CD command parameters ConfigMap reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD repo server command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-repo-server/
- Argo CD sync waves documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Argo CD diff strategies documentation: https://argo-cd.readthedocs.io/en/release-2.13/user-guide/diff-strategies/
- Argo CD resource tracking documentation: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/resource_tracking/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/metrics/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization

## Issues Found
- The post implied sync waves on separate Applications generally order independent applications. Clarified that this works when the Application resources are synced by an app-of-apps parent.
- The timeout example used incorrect or misleading keys in `argocd-cm`. Replaced it with the documented `argocd-cmd-params-cm` keys `controller.repo.server.timeout.seconds` and `server.repo.server.timeout.seconds`, and kept `ARGOCD_EXEC_TIMEOUT` for the Kustomize process timeout.
- The repo server parallelism example used an incorrect environment variable and described the setting as enabling parallel generation. Replaced it with the documented `reposerver.parallelism.limit` key and clarified that it caps concurrent manifest generation.
- The ConfigMap and Secret generator section incorrectly said hash suffixes force Argo CD to diff every resource on every check. Reworded it to explain the actual Kustomize behavior and the rollout trade-off of `disableNameSuffixHash`.
- The remote base section overstated that remote bases are cloned every build. Reworded it to say they can require additional fetches during manifest generation.
- The server-side diff section said Argo CD 2.5+ supports server-side diff. Updated this to Argo CD 2.10+ and clarified that the feature uses server-side apply dry-run requests.
- The resource tracking section claimed annotation-based tracking is more efficient because it avoids label matching. Replaced this with the documented benefits: avoiding label ownership conflicts and label value length limits.
- The monitoring section used incorrect repo server metric names. Replaced them with documented metrics: `argocd_git_request_duration_seconds`, `argocd_git_request_total`, and `argocd_repo_pending_request_total`.

## Review Notes
The resource-count thresholds and splitting recommendations are operational heuristics rather than documented hard limits. They are acceptable as guidance but should be treated as workload-dependent.
