# Validation Summary: How to Plan a Migration from ArgoCD to Flux CD Step by Step

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo CD
- Flux CD
- Kubernetes
- GitOps
- Helm
- Kustomize
- kubectl
- Argo CD CLI
- Flux CLI

## Sources Consulted
- Flux bootstrap GitHub command reference: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux GitRepository API reference: https://fluxcd.io/flux/components/source/api/v1/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Argo CD app set command reference: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/commands/argocd_app_set/
- Argo CD application deletion documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/app_deletion/
- Argo CD sync phases and waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/

## Issues Found
- The Flux bootstrap example used `--personal` with an organization-style owner placeholder (`your-org`). Flux documents `--personal` for repositories owned by a GitHub user, not an organization, so the flag was removed from the organization example.
- The inventory command for identifying Helm applications read `.spec.source.helm.chart`, but Argo CD stores chart names for Helm chart sources in `.spec.source.chart`. Changed the command to show both `.spec.source.path` and `.spec.source.chart`.
- The migration script implied that all Argo CD Applications could be converted to Flux Kustomizations. Flux Helm chart sources should be represented with Helm-oriented Flux resources such as `HelmRepository` and `HelmRelease`, so the text now scopes the script to simple Git path-based applications.
- The migration script mapped Argo CD `targetRevision` directly to Flux `.spec.ref.branch`. Argo CD commonly uses `HEAD`, which is not a valid Git branch name for Flux. Added a guard requiring a concrete branch name before generating Flux resources.
- The cutover command used `kubectl delete application`, while claiming resources would persist. Argo CD Applications can include the `resources-finalizer.argocd.argoproj.io` finalizer, which makes deletion cascade to managed resources. Replaced it with `argocd app delete myapp --cascade=false`.
- The best-practice wording said to suspend Argo CD before Flux takes over, but the documented procedure only disables automated sync. Clarified that automated sync should be disabled and manual syncs avoided before Flux takes over.

## Review Notes
The sample converter remains intentionally narrow. It does not handle Argo CD multi-source applications, Helm values, sync waves, hooks, custom health checks, image updater annotations, or target revisions that are tags or commit SHAs. Those limitations are now less likely to be mistaken for a complete automated migration path.
