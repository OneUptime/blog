# Validation Summary: How to Implement ArgoCD Pre-Sync and Post-Sync Jobs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ArgoCD (sync hooks, sync waves, delete policies, Application CRD)
- Kubernetes (Jobs, annotations, secrets, init containers)
- Kustomize
- Helm (hook annotation mapping)
- GitOps workflows
- Prometheus metrics (ArgoCD application controller)
- ArgoCD CLI (`argocd app sync`, `argocd app get`)

## Sources Consulted
- ArgoCD Resource Hooks docs: https://argo-cd.readthedocs.io/en/stable/user-guide/resource_hooks/
- ArgoCD Sync Waves docs: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- ArgoCD Helm support docs: https://argo-cd.readthedocs.io/en/stable/user-guide/helm/
- ArgoCD Operator Manual Metrics: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/

## Issues Found

1. **Incorrect Helm hook mapping.** The original "Helm Hook → ArgoCD Phase" table mapped `pre-delete` to "PreSync (on delete)" and `post-delete` to "PostSync (on delete)". Per the official ArgoCD Helm docs, these map to the dedicated `PreDelete` and `PostDelete` phases. Fixed the table and added a note that Helm hooks on a resource are ignored if any ArgoCD hook is defined on the same resource.

2. **Fabricated Prometheus metric names.** The original "Prometheus Metrics" section referenced `argocd_app_sync_hook_duration_seconds_bucket` and `argocd_app_sync_hook_failed_total`. Neither metric exists in the ArgoCD application controller metrics. Replaced with the real, documented metrics (`argocd_app_sync_total` with the `phase` label representing sync outcome, and `argocd_app_sync_duration_seconds_total`) and added a pointer to `kube-state-metrics` Job metrics for hook-level visibility.

3. **Outdated hook-phase count.** The original text claimed "ArgoCD provides five hook phases". Since v2.10, ArgoCD also exposes `PreDelete` and `PostDelete`. Reworded to drop the hard count and added a sentence acknowledging the delete-phase hooks while keeping the post's focus on sync hooks.

## Review Notes

- The "Delete Policy Options" `Best For` column for `HookFailed` ("Keeping successful runs for audit") is technically consistent — `HookFailed` removes failed hook resources, so successful runs are what remain — but the phrasing is easy to misread. Left as-is because it is not incorrect.
- `BeforeHookCreation` is actually the default hook-delete-policy in ArgoCD; the post does not mention this. Not an error, but worth noting in a future revision.
- All ArgoCD annotation names (`argocd.argoproj.io/hook`, `argocd.argoproj.io/hook-delete-policy`, `argocd.argoproj.io/sync-wave`) are correct.
- The Helm annotation values (`helm.sh/hook`, `helm.sh/hook-weight`, `helm.sh/hook-delete-policy`) are correct.
- CLI commands (`argocd app sync --watch`, `argocd app get -o wide`) are valid.
- The `Application` manifest example (`argoproj.io/v1alpha1`, `syncPolicy.automated.prune`, `selfHeal`, `syncOptions: PruneLast=true`, `CreateNamespace=true`) is correct.
- The Kustomize `apiVersion: kustomize.config.k8s.io/v1beta1` with a top-level `namespace` field and `images` transformer block are valid.
