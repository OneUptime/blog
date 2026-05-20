# Validation Summary: How to Use JSONPointers for Diff Customization in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD diff customization
- Kubernetes manifests and API groups
- JSON Pointer / RFC 6901
- JQ path expressions
- Argo CD CLI

## Sources Consulted
- Argo CD Diffing Customization: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app diff` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- RFC 6901, JavaScript Object Notation (JSON) Pointer: https://www.rfc-editor.org/rfc/rfc6901
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes API reference for Service fields: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.26/

## Issues Found
- The JSON Pointer explanation implied all JSON Pointers are slash-prefixed and the diagram labeled the document root as `/`. RFC 6901 defines the empty string as the pointer to the whole document, while slash-prefixed paths identify fields below it. Updated the explanation and diagram label to reflect that distinction.
- The common mistakes list said "Including the leading slash" was a mistake while also saying pointers must start with `/`. Updated it to "Forgetting the leading slash" for field paths.

## Review Notes
The Argo CD `ignoreDifferences` examples, `jsonPointers`, `jqPathExpressions`, `managedFieldsManagers`, system-level `resource.customizations.ignoreDifferences.*` keys, and CLI examples are consistent with the current Argo CD documentation. The Service examples use valid core API group syntax and current Service fields.
