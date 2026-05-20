# Validation Summary: ArgoCD Diff Customization Cheat Sheet

## Status
validated

## Post Type
Reference / Cheat sheet

## Technologies Covered
- Argo CD diff customization
- Argo CD Application manifests
- Argo CD sync options
- Kubernetes resource comparison
- JSON Pointer / RFC 6901
- jq path expressions

## Sources Consulted
- Argo CD Diffing Customization: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD Diff Strategies: https://argo-cd.readthedocs.io/en/stable/user-guide/diff-strategies/
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD `argocd app diff` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Argo CD `argocd app manifests` command reference: https://argo-cd.readthedocs.io/en/release-2.13/user-guide/commands/argocd_app_manifests/
- Kubernetes Images documentation: https://kubernetes.io/docs/concepts/containers/images/
- RFC 6901 JSON Pointer: https://www.rfc-editor.org/rfc/rfc6901

## Issues Found
- `ignoreResourceStatusField` listed "leave empty" as the way to compare status. Official Argo CD documentation lists `none` for comparing status fields, with `all` as the default. Changed the option to `none`.
- The HPA section described `ServerSideApply=true` as "server-side diff (ArgoCD v2.5+)". Official docs describe this as server-side apply / structured-merge diff behavior, while Server-Side Diff is a separate feature. Changed the label to server-side apply and kept the existing `RespectIgnoreDifferences=true` guidance.
- The Server-Side Diff section said Argo CD 2.5+ and showed `ServerSideApply=true` as the enablement method. Official docs state Server-Side Diff is beta since Argo CD 2.10 and is enabled per application with the `argocd.argoproj.io/compare-options: ServerSideDiff=true` annotation, or globally with `controller.diff.server.side`. Updated the version and application-level example.
- The debugging section used `argocd app diff my-app --resource apps:Deployment:my-deploy`, but the official current `argocd app diff` command reference does not include a `--resource` flag. Removed that invalid command example.

## Review Notes
The remaining examples match the documented Argo CD diff customization formats, including system-level `resource.customizations.ignoreDifferences`, application-level `spec.ignoreDifferences`, `managedFieldsManagers`, jq path expressions, JSON Pointer escaping, `RespectIgnoreDifferences=true`, and `argocd app manifests --source live|git`. The local `argocd` CLI was not installed, so CLI validation was performed against official command references.
