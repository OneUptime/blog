# Validation Summary: How to Exclude Specific Resources from Sync in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- Argo CD Application manifests
- Argo CD CLI
- YAML configuration

## Sources Consulted
- Argo CD Diff Customization: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-options/
- Argo CD Compare Options: https://argo-cd.readthedocs.io/en/latest/user-guide/compare-options/
- Argo CD Declarative Setup, Resource Exclusion/Inclusion: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/

## Issues Found
- `ignoreDifferences` was described as preventing ArgoCD from reverting HPA-managed fields during sync. Argo CD uses `ignoreDifferences` only for diff calculation by default, and sync applies desired state as-is unless `RespectIgnoreDifferences=true` is enabled. Added that sync option to the relevant examples and clarified the behavior.
- The all-resources `ignoreDifferences` example used `kind: "*"` without `group: "*"`. Added the wildcard group so the example matches resources across API groups.
- `IgnoreExtraneous` was described as a way to completely exclude resources from ArgoCD management. Official documentation states that it only affects sync status, and pruning prevention should be handled separately with `Prune=false`. Updated the wording.
- The CLI section said exclusion is achieved only by explicitly selecting included resources. The current `argocd app sync --resource` flag also supports negated resource patterns prefixed with `!`. Updated the examples to show both selective inclusion and negated exclusion patterns.

## Review Notes
The remaining resource exclusion, resource inclusion, `jsonPointers`, `jqPathExpressions`, annotation, and global customization examples are consistent with the official Argo CD documentation. The webhook `caBundle` example is valid for fixed webhook indexes, though a future improvement could use a `jqPathExpressions` wildcard for manifests with variable webhook counts.
