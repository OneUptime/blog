# Validation Summary: How to Migrate from Kustomize CLI to ArgoCD Managed Kustomize

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Kustomize
- kubectl
- Argo CD CLI

## Sources Consulted
- Argo CD Kustomize user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/kustomize/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD sync options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD diff customization: https://argo-cd.readthedocs.io/en/release-3.4/user-guide/diffing/
- Argo CD resource tracking: https://argo-cd.readthedocs.io/en/release-2.7/user-guide/resource_tracking/
- Argo CD private repositories: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD application deletion guide: https://argo-cd.readthedocs.io/en/latest/user-guide/app_deletion/
- Kubernetes `kubectl apply` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes `kubectl diff` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_diff/
- Kustomize project site: https://kustomize.io/

## Issues Found
1. **Incorrect Argo CD tracking label.** The post said Argo CD adds `app.kubernetes.io/managed-by`. Argo CD's documented default resource tracking label is `app.kubernetes.io/instance`, with annotation-based alternatives available depending on installation configuration. Updated the expected diff note accordingly.
2. **Incorrect wildcard group for `managedFieldsManagers`.** The ignore-differences example used `group: ""` with `kind: "*"`, which only targets the core Kubernetes API group. Argo CD documents all-resource managed-field ignore rules with `group: "*"`, `kind: "*"`. Updated the snippet.
3. **Missing sync caveat for ignored fields.** Argo CD documents that `ignoreDifferences` affects diffing, but sync only respects those fields when `RespectIgnoreDifferences=true` is enabled. Added a short note and included the sync option in the auto-sync example.
4. **Overstated server-side apply adoption behavior.** The post implied server-side apply always adopts existing resources and guarantees no pod restarts. Argo CD server-side apply can apply to existing resources without recreation, but pod restarts still happen if pod template specs change. Updated the wording and the sync option comment to be conditional and technically accurate.

## Review Notes
- The Application manifest shape, `repoURL`/`targetRevision`/`path` Kustomize source configuration, private repository command, `argocd app sync --server-side`, `argocd app delete --cascade=false`, and `kubectl diff -f -` examples match official documentation.
- The manual `diff <(kubectl get all ... ) desired-state.yaml` example is useful only as a rough audit because live Kubernetes output contains generated fields and `kubectl get all` does not include every resource type. The later `kubectl diff -f -` command is the more accurate comparison.
