# Validation Summary: How to Configure ignoreDifferences in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD Application `ignoreDifferences`
- Argo CD system-level resource customizations in `argocd-cm`
- Kubernetes resource diffing and managed fields
- JSON Pointer / RFC 6901
- JQ path expressions
- Argo CD CLI

## Sources Consulted
- Argo CD Diff Customization documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD `argocd-cm.yaml` example: https://argo-cd.readthedocs.io/en/latest/operator-manual/argocd-cm-yaml/
- Argo CD `argocd app diff` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_diff/
- Argo CD `argocd app manifests` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_manifests/
- RFC 6901 JSON Pointer: https://datatracker.ietf.org/doc/html/rfc6901
- Argo CD settings parser source for split `resource.customizations` keys: https://github.com/argoproj/argo-cd/blob/master/util/settings/settings.go
- Argo CD diff normalizer source for JQ deletion behavior: https://github.com/argoproj/argo-cd/blob/master/util/argo/normalizers/diff_normalizer.go

## Issues Found
- The system-level managed-fields examples used `managedFields` with nested `manager` entries. Argo CD's documented ignore-differences schema uses `managedFieldsManagers` as a list of manager names, so both global examples were corrected.
- The `resource.customizations.ignoreDifferences._Service` example and explanatory text used a leading underscore for core API group resources. Argo CD's split-key parser accepts either `<group>_<kind>` or `<kind>`, so the Service example was corrected to `resource.customizations.ignoreDifferences.Service` and the text now says to use `<kind>` with no group prefix.
- Several JQ examples selected annotation map entries with `to_entries[] | select(.key | startswith(...))`. Argo CD wraps `jqPathExpressions` in `del(...)`, and that form is not a valid deletion path. Those examples were changed to path expressions that select matching annotation keys via `keys[]`, such as `.metadata.annotations[.metadata.annotations // {} | keys[] | select(startswith("kubectl.kubernetes.io/"))]`.

## Review Notes
The `RespectIgnoreDifferences` explanation is accurate for already-created resources. Argo CD's documentation notes that when no live resource exists yet, the desired state is applied as-is.
