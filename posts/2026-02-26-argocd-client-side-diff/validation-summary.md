# Validation Summary: How to Use Client-Side Diff in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD client-side and server-side diff strategies
- Argo CD Application `ignoreDifferences`
- Argo CD system-level resource customizations in `argocd-cm`
- Kubernetes Server-Side Apply
- Kubernetes resource defaulting and managed fields
- JSON Pointer / RFC 6901
- JQ path expressions
- Argo CD CLI

## Sources Consulted
- Argo CD Diff Strategies documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/diff-strategies/
- Argo CD Diff Customization documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD `argocd app diff` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_diff/
- Argo CD `argocd app manifests` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_manifests/
- Kubernetes Server-Side Apply documentation: https://kubernetes.io/docs/reference/using-api/server-side-apply/
- Kubernetes Server-Side Apply GA announcement: https://kubernetes.io/blog/2021/08/06/server-side-apply-ga/
- RFC 6901 JSON Pointer: https://datatracker.ietf.org/doc/html/rfc6901
- Linked OneUptime diff-strategy article: https://oneuptime.com/blog/post/2026-02-26-argocd-choose-right-diff-strategy/view

## Issues Found
- The introduction said client-side diff does not involve the Kubernetes API server. Argo CD still fetches live state from the API server; the key distinction is that it does not ask the API server to calculate a predicted state with dry-run apply. The sentence was corrected.
- The workflow described comparison as a plain field-by-field comparison. Argo CD's documented legacy strategy uses live state, desired state, and the `kubectl.kubernetes.io/last-applied-configuration` annotation when available, so the comparison step was updated.
- The system-level managed-fields example used `managedFields` with nested `manager` entries. Argo CD's documented ignore-differences schema uses `managedFieldsManagers` as a list of manager names, so the example was corrected.
- The JQ example for ignoring annotation keys used `to_entries[] | select(...)`, which is not a proper deletion path for Argo CD `jqPathExpressions`. It was changed to an annotation-map indexing expression that selects matching keys.
- The debugging section claimed `argocd app diff my-app --local /path/to/manifests` showed JSON output. The official command reference does not provide JSON output for `argocd app diff`; the comment was corrected to describe local-manifest comparison.
- The `argocd app manifests` examples were described as showing normalized desired and live state. The official command prints rendered Git or live manifests, so those comments were corrected.
- The performance section stated that client-side diff is generally faster than server-side diff and faster for applications with hundreds of resources. Argo CD documents server-side diff caching and request behavior, so the claim was qualified to depend on cache state, API server latency, and dry-run request count.

## Review Notes
The `RespectIgnoreDifferences` explanation is accurate for already-created resources. Argo CD's documentation notes that this sync option is only effective when the resource already exists in the cluster; new resources are applied as-is.
