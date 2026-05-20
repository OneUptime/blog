# Validation Summary: How to Handle Rollbacks in a GitOps Paradigm

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes Deployments and rollout undo
- Git revert and tags
- Helm charts managed by Argo CD
- Kustomize overlays
- Argo Rollouts and AnalysisTemplates
- Prometheus metric queries

## Sources Consulted
- Argo CD automated sync policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD `argocd app rollback` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_rollback/
- Argo CD Helm user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD application specification reference: https://argo-cd.readthedocs.io/en/release-3.4/user-guide/application-specification/
- Kubernetes `kubectl rollout undo` reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Argo Rollouts analysis documentation: https://argoproj.github.io/argo-rollouts/features/analysis/
- Argo Rollouts rollback documentation: https://argoproj.github.io/argo-rollouts/features/rollback/
- Git `git revert` documentation: https://git-scm.com/docs/git-revert
- Helm `helm rollback` documentation: https://helm.sh/docs/helm/helm_rollback/

## Issues Found
- The post stated that an Argo CD application history rollback is temporary if auto-sync is enabled. Current Argo CD documentation says rollback cannot be performed against an application with automated sync enabled, so I changed the caveat to say auto-sync must be disabled first.
- The emergency workflow ran `argocd app rollback` before disabling auto-sync. I reordered the commands so `argocd app set my-app --sync-policy none` runs before `argocd app rollback my-app 2`.
- The drift explanation said auto-sync alone would immediately push the new version back after a manual `kubectl rollout undo`. Argo CD documentation distinguishes automated sync from self-healing for live-cluster drift, so I clarified that this happens when automated sync with self-healing is enabled.

## Review Notes
The Kubernetes Deployment and Rollout examples are illustrative snippets rather than complete manifests; production manifests still need the usual required fields such as selectors and pod template labels. The Argo Rollouts example is also abbreviated around the Rollout workload spec, but the canary analysis and AnalysisTemplate fields shown are consistent with the official CRD examples.
