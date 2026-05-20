# Validation Summary: How to Implement Ignore Differences for Autoscaled Replicas

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- Horizontal Pod Autoscaler
- Vertical Pod Autoscaler
- KEDA
- JSON Pointer
- JQ path expressions

## Sources Consulted
- Argo CD Diffing Customization: https://argo-cd.readthedocs.io/en/stable/user-guide/diffing/
- Argo CD Diff Strategies: https://argo-cd.readthedocs.io/en/stable/user-guide/diff-strategies/
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/application-specification/
- Argo CD `argocd app diff` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Argo CD `argocd app manifests` command reference: https://argo-cd.readthedocs.io/en/release-2.13/user-guide/commands/argocd_app_manifests/
- KEDA ScaledObject specification: https://keda.sh/docs/2.19/reference/scaledobject-spec/
- KEDA Scaling Deployments, StatefulSets and Custom Resources: https://keda.sh/docs/2.19/concepts/scaling-deployments/
- RFC 6901 JSON Pointer: https://www.rfc-editor.org/rfc/rfc6901

## Issues Found
- The post said Argo CD 2.5+ supports server-side diff. Updated this to say server-side diff is stable since Argo CD 3.1, matching current Argo CD documentation. Argo CD 2.5 relates to structured-merge diff, which is now discontinued in favor of server-side diff.
- The post described server-side diff as comparing only fields owned by `argocd-application-controller` and automatically ignoring other managers. Updated this explanation because server-side diff runs server-side apply in dry-run mode and compares the predicted result with live state; `managedFieldsManagers` is the setting that ignores fields owned by specific managers.
- The KEDA section claimed KEDA adds labels and annotations to managed Deployments. Updated the section to target KEDA-generated HPA metadata instead, because KEDA creates and labels the generated HPA for a ScaledObject rather than generally mutating the target Deployment metadata.
- The debugging section said `argocd app diff --local` shows the full diff including ignored fields. Updated the comment to state that it compares the live app to locally generated manifests, which matches the Argo CD CLI documentation.
- The global customization key explanation said to replace dots with underscores only for the last segment. Updated it to clarify that dots stay in the API group and the underscore separates the group from the kind, for example `keda.sh_ScaledObject`.

## Review Notes
The remaining examples for `jsonPointers`, `jqPathExpressions`, `managedFieldsManagers`, global `resource.customizations.ignoreDifferences`, `RespectIgnoreDifferences=true`, and the `argocd app manifests --source live|git` commands match Argo CD documentation. `RespectIgnoreDifferences=true` only affects resources that already exist in the cluster; initial creation still applies the desired state as-is.
