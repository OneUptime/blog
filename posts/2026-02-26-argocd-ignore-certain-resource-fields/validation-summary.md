# Validation Summary: How to Make ArgoCD Ignore Certain Resource Fields

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- JSON Pointer
- jq path expressions
- Kubernetes Server-Side Apply and managed fields

## Sources Consulted
- Argo CD Diff Customization: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD Diff Strategies: https://argo-cd.readthedocs.io/en/latest/user-guide/diff-strategies/
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-options/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD CLI `argocd app diff` reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Kubernetes Server-Side Apply documentation: https://kubernetes.io/docs/reference/using-api/server-side-apply/
- RFC 6901 JSON Pointer: https://datatracker.ietf.org/doc/html/rfc6901

## Issues Found
- The Server-Side Diff per-application annotation used `argocd.argoproj.io/compare-option`, but the official Argo CD annotation is `argocd.argoproj.io/compare-options`. Updated the snippet to use the correct plural key.
- The global Server-Side Diff example used the `argocd-cm` ConfigMap. Official Argo CD documentation configures `controller.diff.server.side` in `argocd-cmd-params-cm`, and the application controller must be restarted after changing it. Updated the ConfigMap name and added the restart note.
- The Server-Side Diff explanation said mutation was inherently handled. Official documentation states mutation webhook changes are not included by default and require `IncludeMutationWebhook=true`. Updated the wording and added the required annotation option.
- The post implied status fields should never be compared but sometimes are, and the global `all` example included `/status`. Argo CD defaults to ignoring status fields for all resources through `ignoreResourceStatusField: all`. Updated the wording and removed `/status` from that global example to avoid suggesting redundant or misleading configuration.

## Review Notes
The remaining examples match documented Argo CD concepts for application-level `ignoreDifferences`, system-level `resource.customizations.ignoreDifferences`, `managedFieldsManagers`, and `RespectIgnoreDifferences=true`. The jq examples are syntactically valid jq expressions, but pattern-based map-key ignores should still be tested against the live resource shape because Argo CD jq normalizer behavior is easiest to confirm with the exact object being diffed.
