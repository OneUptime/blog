# Validation Summary: How to Use Helm Hooks with ArgoCD Sync Hooks

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Helm
- Kubernetes
- GitOps
- Kubernetes Jobs and Deployments
- Argo CD sync hooks and sync waves

## Sources Consulted
- Argo CD Helm documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Helm Chart Hooks documentation: https://helm.sh/docs/topics/charts_hooks/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- Corrected the Helm hook mapping table. `pre-delete` and `post-delete` map to Argo CD `PreDelete` and `PostDelete`, not `PreSync` and `PostSync`; `post-rollback` is also unsupported; Helm test hooks are unsupported by Argo CD rather than runnable sync hooks.
- Added the Argo CD caveat that defining Argo CD hook annotations causes Helm hook annotations to be ignored, and clarified that Argo CD treats install and upgrade as sync operations.
- Fixed the sync wave example so the ConfigMap runs in the same `PreSync` phase before the migration. Argo CD orders by phase before wave, so a Sync-phase wave `-2` resource would not run before a PreSync wave `-1` hook.
- Fixed the Deployment example by adding `spec.selector.matchLabels` and matching pod template labels, which are required for `apps/v1` Deployments.
- Removed the incorrect suggestion that `helm.sh/hook: crd-install` can be used to skip Helm hook conversion. Current Argo CD treats `crd-install` as supported CRD handling; `argocd.argoproj.io/hook: Skip` is the relevant skip annotation.
- Clarified `skipTests`: it controls Helm test manifest rendering behavior, but Argo CD does not run Helm test hooks.
- Corrected troubleshooting guidance for named hooks to use `BeforeHookCreation` / `before-hook-creation` when a fresh Job is needed.

## Review Notes
The examples are intentionally illustrative and use placeholder images, repository URLs, and Slack webhook URLs. Hook delete semantics differ between Helm and Argo CD even when Helm annotations are mapped, so future updates could expand on that caveat if the post grows beyond a concise guide.
