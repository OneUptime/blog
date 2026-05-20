# Validation Summary: How to Use argocd.argoproj.io/compare-options Annotation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- Kustomize
- Argo CD Application manifests
- Argo CD CLI

## Sources Consulted
- Argo CD Compare Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/compare-options/
- Argo CD Diff Strategies documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/diff-strategies/
- Argo CD Diffing Customization documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/diffing/
- Argo CD annotations and labels reference: https://argo-cd.readthedocs.io/en/stable/user-guide/annotations-and-labels/
- Argo CD command parameters ConfigMap reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD `argocd app diff` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The post incorrectly described `ServerSideDiff=true` as a per-resource annotation. Updated the text and examples to show it on the Argo CD `Application` resource, matching the official Argo CD diff strategies documentation.
- The post said global server-side diff should be configured in `argocd-cm`. Updated the ConfigMap name to `argocd-cmd-params-cm` and noted that the `argocd-application-controller` must be restarted after changing the setting.
- The post implied `IgnoreExtraneous` suppresses arbitrary resource drift. Updated the explanation to clarify that it excludes extraneous generated resources from sync status, not normal field differences.
- The HPA example incorrectly recommended `IgnoreExtraneous` for replica drift. Replaced it with Kustomize-generated resource examples and kept field-level drift guidance under `ignoreDifferences`.
- The TLS Secret example used `data: {}` with `type: kubernetes.io/tls`. Updated it to include `tls.crt` and `tls.key`, which Kubernetes documents as required keys for TLS Secrets.
- The server-side diff section implied mutating webhook changes are included automatically. Updated it to say mutating webhooks require `IncludeMutationWebhook=true`.
- The debugging command piped a JSONPath-rendered annotation map to `jq`, which is not reliable JSON. Updated it to fetch JSON and use `jq '.metadata.annotations'`.

## Review Notes
Server-side diff is documented as a beta feature in recent Argo CD documentation. The post now avoids version-specific guarantees and uses current stable documentation for configuration and annotation placement.
