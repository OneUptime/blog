# Validation Summary: How to implement Kustomize vars for cross-resource references

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kustomize
- Kustomize vars
- Kustomize replacements
- ConfigMaps, Secrets, Services, Deployments, CronJobs, Namespaces, and ServiceAccounts
- `kustomize build` and `yq`

## Sources Consulted
- Kubernetes documentation: Declarative Management of Kubernetes Objects Using Kustomize, https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes kubectl reference: `kubectl kustomize`, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/
- Kustomize v5.0.0 release notes for `vars` deprecation, https://github.com/kubernetes-sigs/kustomize/releases/tag/kustomize%2Fv5.0.0
- Kustomize API type definition for replacements, https://github.com/kubernetes-sigs/kustomize/blob/master/api/types/replacement.go
- Kustomize API type definition for selectors, https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/api/types/selector.go

## Issues Found
- Several full `apps/v1` Deployment examples omitted required `spec.selector` and matching pod template labels. Added selectors and labels where the snippets presented complete Deployment objects.
- The namespace propagation example wrote to `metadata.namespace`, but the shown targets did not define that field. Added `options.create: true` so Kustomize can create the missing target field.
- The image digest example used an ellipsis in the digest, which is not a valid image reference. Replaced it with a complete 64-character SHA-256 digest placeholder.
- The "Resource name construction" section claimed to build names from components, but the example copied one ConfigMap data value into a label. Renamed the section and description to match the actual behavior.
- The "Computed values" section described replacing multiple `$(...)` placeholders inside one URL. Kustomize replacements copy field values and can replace delimited field segments, but they do not evaluate vars-style placeholders or compute arbitrary strings. Reworked the section as a partial string replacement example using `delimiter` and `index`.
- The conclusion described replacements adapting to "computed values." Updated this to "copied values" to match Kustomize replacement behavior.
- The explanation of vars implied they work throughout a configuration. Clarified that vars substitute only in supported target fields recognized by Kustomize's variable reference transformer.

## Review Notes
The local environment did not have `kustomize`, `kubectl`, `yq`, or Go installed, so validation was performed against official Kubernetes documentation and Kustomize source definitions rather than local CLI execution. The post correctly warns that vars are deprecated and that replacements are the preferred approach for new configurations.
