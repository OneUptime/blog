# Validation Summary: How to Use the 'RespectIgnoreDifferences' Sync Option in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- Kubernetes Deployments and StatefulSets
- Horizontal Pod Autoscaler
- Argo CD Application manifests
- Argo CD CLI
- JSON Pointer and jq path expressions

## Sources Consulted
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Diff Customization documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD `argocd app diff` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Kubernetes Server-Side Apply documentation: https://kubernetes.io/docs/reference/using-api/server-side-apply/

## Issues Found
- Clarified that `RespectIgnoreDifferences=true` is only effective for resources that already exist in the cluster. Official Argo CD documentation states that new resources are applied as-is when no live state exists.
- Reworded the internal behavior from simply "removing fields from the manifest" to Argo CD pre-patching the desired state before applying it, which matches the Argo CD documentation.
- Narrowed claims about webhook-injected and defaulted live-only fields. `ignoreDifferences` is the key setting for hiding drift when fields do not exist in Git; `RespectIgnoreDifferences` changes sync behavior when the ignored field is also present in the desired manifest.
- Adjusted the LimitRange/resource requests example to avoid implying `RespectIgnoreDifferences` changes sync behavior for fields that are only defaulted into the live object and absent from Git.
- Replaced the unsupported claim that `Replace=true` is strictly incompatible with `RespectIgnoreDifferences`. The official documentation says `Replace=true` uses `kubectl replace` or `kubectl create`; the post now warns that it does not behave like the normal apply-based sync path.
- Clarified that automated sync would run because of another detected change, not solely because a replica difference is ignored and the app is still considered synced.

## Review Notes
The Argo CD CLI was not installed locally, so CLI flags were verified against the official Argo CD command reference rather than local `--help` output. The YAML examples use current Argo CD Application fields and Kubernetes API versions.
